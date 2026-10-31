/**
 * Unit tests for the column-width memory store (`src/colwidth-store.js`).
 *
 * The store is the DOM-free half of the feature: it validates an entry, keys it
 * by the table identity the controller derives, prunes expired / overflow
 * entries and speaks to `localStorage` without ever throwing. These tests pin
 * the storage contract (key names, schema version, TTL, cap), the hostile
 * inputs (bad JSON, unknown version, bad widths, prototype-polluting keys) and
 * the never-throwing storage adapters.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  COLWIDTH_STORAGE_KEY,
  COLWIDTH_TTL_MS,
  COLWIDTH_VERSION,
  MAX_COLWIDTH_ENTRIES,
  MAX_COLWIDTH_KEY_LENGTH,
  MAX_COLWIDTH_PAYLOAD_LENGTH,
  MAX_SIGNATURE_CELL_LENGTH,
  MAX_STORED_COLUMNS,
  createColumnWidthMemory,
  forgetTableWidths,
  headerSignature,
  normalizeWidthEntry,
  normalizeWidthTables,
  pruneWidthTables,
  readTableWidths,
  readWidthTables,
  rememberTableWidths,
  tableWidthKey,
  writeWidthTables,
} from '../src/colwidth-store.js'

/** Minimal in-memory `Storage` implementation with call recording. */
function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  const calls = { getItem: [], setItem: [], removeItem: [] }
  return {
    values,
    calls,
    getItem(key) {
      calls.getItem.push(key)
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      calls.setItem.push([key, String(value)])
      values.set(key, String(value))
    },
    removeItem(key) {
      calls.removeItem.push(key)
      values.delete(key)
    },
  }
}

/** A storage whose every method throws, like private mode or a hostile realm. */
function createThrowingStorage() {
  const boom = () => {
    throw new Error('storage is unavailable')
  }
  return { getItem: boom, setItem: boom, removeItem: boom }
}

/** A legal stored entry. */
function entry(widths = [200, 300], savedAt = 1000, signature = 'abcd1234') {
  return { w: widths, c: widths.length, h: signature, t: savedAt }
}

/** A storage containing one payload. */
function storageWith(payload) {
  const storage = createMemoryStorage()
  storage.setItem(COLWIDTH_STORAGE_KEY, JSON.stringify(payload))
  return storage
}

test('storage key, version, TTL and cap are the documented contract', () => {
  assert.equal(COLWIDTH_STORAGE_KEY, 'dsh-everforest/colwidths/v1')
  assert.equal(COLWIDTH_VERSION, 1)
  assert.equal(MAX_COLWIDTH_ENTRIES, 300)
  assert.equal(MAX_COLWIDTH_KEY_LENGTH, 160)
  assert.equal(MAX_STORED_COLUMNS, 32)
  assert.equal(COLWIDTH_TTL_MS, 180 * 24 * 60 * 60 * 1000)
  // The width cache is its own key: the strength payload is rewritten by
  // `src/state.js` on every palette write and parsed by the boot script.
  assert.notEqual(COLWIDTH_STORAGE_KEY, 'dsh-everforest/v1')
})

test('tableWidthKey joins session, node and ordinal with the stored separator', () => {
  assert.equal(tableWidthKey('sid', '14:assistant-step7:36', 0), 'sid|14:assistant-step7:36|0')
  assert.equal(tableWidthKey('sid', 'n', 12), 'sid|n|12')
  // Incomplete identities are not remembered.
  assert.equal(tableWidthKey('', 'n', 0), null)
  assert.equal(tableWidthKey('sid', '', 0), null)
  assert.equal(tableWidthKey(null, 'n', 0), null)
  assert.equal(tableWidthKey('sid', undefined, 0), null)
  assert.equal(tableWidthKey('sid', 'n', -1), null)
  assert.equal(tableWidthKey('sid', 'n', 1.5), null)
  assert.equal(tableWidthKey('sid', 'n', '0'), null)
  // A key longer than the cap is rejected, never truncated (two truncated keys
  // could collide on the same entry).
  const long = 'x'.repeat(MAX_COLWIDTH_KEY_LENGTH)
  assert.equal(tableWidthKey(long, 'n', 0), null)
  assert.equal(tableWidthKey('sid', 'n'.repeat(MAX_COLWIDTH_KEY_LENGTH), 0), null)
})

test('headerSignature is a stable eight-hex-digit hash of the trimmed cells', () => {
  const signature = headerSignature(['项目', '结果'])
  assert.match(signature, /^[0-9a-f]{8}$/)
  assert.equal(headerSignature(['项目', '结果']), signature)
  assert.equal(headerSignature([' 项目 ', '结果 ']), signature, 'cells are trimmed')
  assert.equal(headerSignature(['文件', '内容']), headerSignature(['文件', '内容']))
  assert.notEqual(headerSignature(['文件', '内容']), signature)
  assert.notEqual(headerSignature(['项目']), signature, 'the cell count is part of the signature')
  // A trailing separator keeps ['a',''] and ['a'] distinct.
  assert.notEqual(headerSignature(['a', '']), headerSignature(['a']))
  assert.equal(headerSignature([]), '')
  assert.equal(headerSignature(null), '')
  assert.equal(headerSignature('项目|结果'), '')
})

test('normalizeWidthEntry accepts a legal entry and rounds widths to half pixels', () => {
  assert.deepEqual(normalizeWidthEntry(entry([332, 333.5, 332.5]), 5000), {
    w: [332, 333.5, 332.5],
    c: 3,
    h: 'abcd1234',
    t: 1000,
  })
  assert.deepEqual(normalizeWidthEntry({ w: [100.26, 200.74], h: 'x' }, 5000), {
    w: [100.5, 200.5],
    c: 2,
    h: 'x',
    t: 5000, // a missing timestamp falls back to `now`
  })
})

test('normalizeWidthEntry rejects shapes that cannot be painted', () => {
  assert.equal(normalizeWidthEntry(null), null)
  assert.equal(normalizeWidthEntry([200, 300]), null)
  assert.equal(normalizeWidthEntry({ w: 'nope', h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200], h: 'x' }), null, 'a single column is not a table')
  assert.equal(normalizeWidthEntry({ w: new Array(MAX_STORED_COLUMNS + 1).fill(100), h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200, 0], h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200, -10], h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200, Number.NaN], h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200, Number.POSITIVE_INFINITY], h: 'x' }), null)
  assert.equal(normalizeWidthEntry({ w: [200, '300'], h: 'x' }), null)
  // The stored column count has to agree with the width array.
  assert.equal(normalizeWidthEntry({ w: [200, 300], c: 3, h: 'x' }), null)
  // The signature is required (an empty string is a legal "no header" value).
  assert.equal(normalizeWidthEntry({ w: [200, 300] }), null)
  assert.equal(normalizeWidthEntry({ w: [200, 300], h: 7 }), null)
})

test('normalizeWidthTables keeps only valid entries and ignores hostile payloads', () => {
  const tables = normalizeWidthTables({
    good: entry(),
    bad: { w: [1], h: 'x' },
    extra: { ...entry(), unknown: true },
  })
  assert.deepEqual(Object.keys(tables).sort(), ['extra', 'good'])
  assert.equal(Object.getPrototypeOf(tables), null, 'entries live on a null-prototype object')
  assert.deepEqual(Object.keys(normalizeWidthTables(null)), [])
  assert.deepEqual(Object.keys(normalizeWidthTables([])), [])
  assert.deepEqual(Object.keys(normalizeWidthTables('nope')), [])

  // A prototype-polluting key from stored JSON stays a plain entry: the table
  // map is null-prototype, so nothing reaches `Object.prototype`.
  const polluted = normalizeWidthTables(JSON.parse('{"__proto__":{"w":[200,300],"c":2,"h":"x","t":1}}'))
  assert.equal(Object.getPrototypeOf(polluted), null)
  assert.deepEqual(polluted.__proto__.w, [200, 300])
})

test('pruneWidthTables drops expired entries and keeps the newest writes', () => {
  const now = 1_000_000_000
  const fresh = { ...entry([200, 300], now), h: 'a' }
  const edge = { ...entry([200, 300], now - COLWIDTH_TTL_MS), h: 'b' }
  const expired = { ...entry([200, 300], now - COLWIDTH_TTL_MS - 1), h: 'c' }
  const pruned = pruneWidthTables({ fresh, edge, expired }, now)
  assert.deepEqual(Object.keys(pruned).sort(), ['edge', 'fresh'])

  // Over the cap, the oldest writes are evicted and the newest survive.
  const tables = {}
  for (let index = 0; index < MAX_COLWIDTH_ENTRIES + 5; index += 1) {
    tables[`table-${index}`] = entry([200, 300], now - index * 1000, `h${index}`)
  }
  const capped = pruneWidthTables(tables, now)
  const keys = Object.keys(capped)
  assert.equal(keys.length, MAX_COLWIDTH_ENTRIES)
  assert.equal(capped['table-0'] !== undefined, true, 'the newest entry survives')
  assert.equal(capped[`table-${MAX_COLWIDTH_ENTRIES - 1}`] !== undefined, true, 'the last survivor of the cap')
  assert.equal(capped[`table-${MAX_COLWIDTH_ENTRIES}`], undefined, 'the oldest write is evicted first')
  assert.equal(capped[`table-${MAX_COLWIDTH_ENTRIES + 4}`], undefined)
})

test('readWidthTables treats every unusable payload as empty', () => {
  const keysOf = (tables) => Object.keys(tables)
  assert.deepEqual(keysOf(readWidthTables(null)), [], 'no storage reads as empty')
  assert.deepEqual(keysOf(readWidthTables(createMemoryStorage())), [])
  assert.deepEqual(keysOf(readWidthTables(createThrowingStorage())), [])
  assert.deepEqual(keysOf(readWidthTables(storageWith(null))), [])
  assert.deepEqual(keysOf(readWidthTables(storageWith([]))), [])
  assert.deepEqual(keysOf(readWidthTables(storageWith('nope'))), [])
  // An unknown version is discarded, not migrated (this is a cache).
  assert.deepEqual(keysOf(readWidthTables(storageWith({ version: COLWIDTH_VERSION + 1, tables: { a: entry() } }))), [])
  assert.deepEqual(keysOf(readWidthTables(storageWith({ tables: { a: entry() } }))), [])

  const storage = createMemoryStorage()
  storage.setItem(COLWIDTH_STORAGE_KEY, '{not json')
  assert.deepEqual(keysOf(readWidthTables(storage)), [])

  const good = storageWith({ version: COLWIDTH_VERSION, tables: { good: entry() } })
  assert.deepEqual(keysOf(readWidthTables(good, 1000)), ['good'])
})

test('readWidthTables prunes on read, so an expired entry is never restored', () => {
  const now = 1_000_000_000
  const storage = storageWith({
    version: COLWIDTH_VERSION,
    tables: {
      old: entry([200, 300], now - COLWIDTH_TTL_MS - 1),
      fresh: entry([200, 300], now),
    },
  })
  assert.deepEqual(Object.keys(readWidthTables(storage, now)), ['fresh'])
})

test('writeWidthTables round-trips a pruned payload and never throws', () => {
  const storage = createMemoryStorage()
  assert.equal(writeWidthTables(storage, { a: entry([200, 300]) }, 1000), true)
  const payload = JSON.parse(storage.values.get(COLWIDTH_STORAGE_KEY))
  assert.equal(payload.version, COLWIDTH_VERSION)
  assert.deepEqual(payload.tables.a, entry([200, 300]))
  assert.deepEqual(Object.keys(readWidthTables(storage, 1000)), ['a'])

  assert.equal(writeWidthTables(createThrowingStorage(), { a: entry() }), false)
  assert.equal(writeWidthTables(null, { a: entry() }), false)
})

test('readTableWidths requires the live table to match the remembered one', () => {
  const now = 1_000_000
  const storage = storageWith({
    version: COLWIDTH_VERSION,
    tables: { key: entry([200, 300], now, 'sig') },
  })
  assert.deepEqual(readTableWidths(storage, 'key', { columns: 2, signature: 'sig' }, now), [200, 300])
  assert.deepEqual(readTableWidths(storage, 'key', undefined, now), [200, 300])
  // A regenerated message may reuse the node key but not the content.
  assert.equal(readTableWidths(storage, 'key', { columns: 2, signature: 'other' }, now), null)
  assert.equal(readTableWidths(storage, 'key', { columns: 3, signature: 'sig' }, now), null)
  assert.equal(readTableWidths(storage, 'missing', { columns: 2, signature: 'sig' }, now), null)
  assert.equal(readTableWidths(storage, '', { columns: 2, signature: 'sig' }, now), null)
  // The returned array is a copy: mutating it cannot corrupt the stored entry.
  const widths = readTableWidths(storage, 'key', undefined, now)
  widths[0] = 1
  assert.deepEqual(readTableWidths(storage, 'key', undefined, now), [200, 300])
})

test('rememberTableWidths refreshes one entry, keeps the others and caps the store', () => {
  const now = 2_000_000
  const storage = storageWith({
    version: COLWIDTH_VERSION,
    tables: {
      other: entry([100, 200], now - 10, 'other'),
      key: entry([200, 300], now - 500, 'old'),
    },
  })
  assert.equal(rememberTableWidths(storage, 'key', [250, 250], { columns: 2, signature: 'new' }, now), true)
  const tables = readWidthTables(storage, now)
  assert.deepEqual(tables.key.w, [250, 250])
  assert.equal(tables.key.h, 'new')
  assert.equal(tables.key.t, now, 'the write time is refreshed')
  assert.deepEqual(tables.other.w, [100, 200], 'other tables survive the read-modify-write')

  // Invalid widths are refused without touching the store.
  assert.equal(rememberTableWidths(storage, 'key', [250], { columns: 1, signature: 'new' }, now), false)
  assert.equal(rememberTableWidths(storage, '', [250, 250], { columns: 2, signature: 'new' }, now), false)
  assert.equal(rememberTableWidths(createThrowingStorage(), 'key', [250, 250], { columns: 2, signature: 'new' }, now), false)

  // The cap is enforced by the same write path.
  const crowded = createMemoryStorage()
  const tablesIn = {}
  for (let index = 0; index < MAX_COLWIDTH_ENTRIES; index += 1) {
    tablesIn[`t${index}`] = entry([200, 300], now - index * 10, `h${index}`)
  }
  writeWidthTables(crowded, tablesIn, now)
  assert.equal(rememberTableWidths(crowded, 'newest', [210, 290], { columns: 2, signature: 'x' }, now + 1), true)
  const capped = readWidthTables(crowded, now + 1)
  assert.equal(Object.keys(capped).length, MAX_COLWIDTH_ENTRIES)
  assert.equal(capped.newest !== undefined, true)
  assert.equal(capped[`t${MAX_COLWIDTH_ENTRIES - 1}`], undefined, 'the oldest write is evicted')
})

test('forgetTableWidths removes exactly one entry and never throws', () => {
  const now = 3_000_000
  const storage = storageWith({
    version: COLWIDTH_VERSION,
    tables: { a: entry([200, 300], now), b: entry([210, 290], now) },
  })
  assert.equal(forgetTableWidths(storage, 'a', now), true)
  assert.deepEqual(Object.keys(readWidthTables(storage, now)), ['b'])
  assert.equal(forgetTableWidths(storage, 'a', now), false, 'forgetting twice is a no-op')
  assert.equal(forgetTableWidths(storage, '', now), false)
  assert.equal(forgetTableWidths(createThrowingStorage(), 'b', now), false)
})

test('createColumnWidthMemory wires the store to one storage and one clock', () => {
  const storage = createMemoryStorage()
  let clock = 10_000
  const memory = createColumnWidthMemory({ storage, now: () => clock })
  assert.equal(memory.read('key', { columns: 2, signature: 'sig' }), null)
  assert.equal(memory.write('key', [220, 280], { columns: 2, signature: 'sig' }), true)
  assert.equal(memory.write('key', [230, 270], { columns: 2, signature: 'sig' }), true)
  assert.deepEqual(memory.read('key', { columns: 2, signature: 'sig' }), [230, 270])
  assert.equal(memory.read('key', { columns: 2, signature: 'other' }), null)
  // An entry is refreshed on every write, so it stays valid past the TTL.
  clock += COLWIDTH_TTL_MS - 1
  assert.deepEqual(memory.read('key', { columns: 2, signature: 'sig' }), [230, 270])
  clock += 2
  memory.write('key', [230, 270], { columns: 2, signature: 'sig' })
  clock += COLWIDTH_TTL_MS + 1
  assert.equal(memory.read('key', { columns: 2, signature: 'sig' }), null, 'the entry expires after the TTL')
  assert.equal(memory.forget('key'), false)

  // Without storage the memory silently does nothing.
  const absent = createColumnWidthMemory({ storage: null })
  assert.equal(absent.read('key', { columns: 2, signature: 'sig' }), null)
  assert.equal(absent.write('key', [200, 300], { columns: 2, signature: 'sig' }), false)
  assert.equal(absent.forget('key'), false)
})


/** The pre-escape signature formula, kept here to pin backward compatibility. */
function legacyHeaderSignature(cellTexts) {
  let hash = 0x811c9dc5
  const text = cellTexts.map((cell) => (typeof cell === 'string' ? cell.trim() : '')).join('\u0001')
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

test('header text with separators, quotes and control characters cannot alias another header', () => {
  // A plain join used to give ['a\u0001b','c'] and ['a','b\u0001c'] the same
  // hash input; escaping the separator (and the escape character) keeps them
  // apart, and the encoding is injective for the escape sequences as well.
  assert.notEqual(headerSignature(['a\u0001b', 'c']), headerSignature(['a', 'b\u0001c']))
  assert.notEqual(headerSignature(['\u0001']), headerSignature(['\u0002s']))
  assert.notEqual(headerSignature(['\u0002e']), headerSignature(['\u0002', 'e']))
  assert.notEqual(headerSignature(['\u0002s']), headerSignature(['\u0002', 's']))
  assert.notEqual(headerSignature(['a"b']), headerSignature(['ab"']))
  assert.notEqual(headerSignature(['a\\b']), headerSignature(['ab\\']))
  assert.notEqual(headerSignature(['a\nb']), headerSignature(['a', 'b']))
  assert.notEqual(headerSignature(['a\r\nb']), headerSignature(['a b']))
  assert.notEqual(headerSignature(['\ud800']), headerSignature(['\ufffd']), 'lone surrogates stay distinct')
  // Ordinary headers keep their previous hash: entries written by the first
  // build of the feature stay valid and do not have to be dragged again.
  assert.equal(headerSignature(['项目', '结果']), legacyHeaderSignature(['项目', '结果']))
  assert.equal(headerSignature(['a b', 'c-d', 'e']), legacyHeaderSignature(['a b', 'c-d', 'e']))
  // Trimming and the per-cell cap are documented behaviour.
  assert.equal(headerSignature([' x ', 'y']), headerSignature(['x', 'y']))
  assert.equal(
    headerSignature(['z'.repeat(MAX_SIGNATURE_CELL_LENGTH + 20)]),
    headerSignature(['z'.repeat(MAX_SIGNATURE_CELL_LENGTH)])
  )
  // Every legal signature is still eight hex digits and never raw text.
  assert.match(headerSignature(['"', '\\', '\u0001']), /^[0-9a-f]{8}$/)
})
test('hostile ids round-trip through the JSON payload; separator ids are refused', () => {
  const storage = createMemoryStorage()
  const cases = [
    ['session-"quoted"', '14:assistant-step1:61'],
    ['session\\backslash', 'node'],
    ['session\nnewline', 'node\u2028separator'],
    ['会话😀', 'node\u0001control'],
    ['</script>', 'node'],
  ]
  for (const [sessionId, nodeKey] of cases) {
    const key = tableWidthKey(sessionId, nodeKey, 0)
    assert.ok(key !== null, `key for ${JSON.stringify([sessionId, nodeKey])}`)
    assert.equal(rememberTableWidths(storage, key, [200, 300], { columns: 2, signature: 'abcd1234' }, 1000), true)
    assert.deepEqual(readTableWidths(storage, key, { columns: 2, signature: 'abcd1234' }, 1000), [200, 300])
  }
  // The raw payload is valid JSON, nothing is interpolated, and the escaped
  // keys parse back to exactly the keys that were written.
  const raw = storage.values.get(COLWIDTH_STORAGE_KEY)
  assert.equal(typeof raw, 'string')
  const parsed = JSON.parse(raw)
  assert.deepEqual(
    Object.keys(parsed.tables).sort(),
    cases.map(([sessionId, nodeKey]) => tableWidthKey(sessionId, nodeKey, 0)).sort()
  )
  // An id containing the key separator would alias another table's entry
  // ("a|b" + "c" vs "a" + "b|c"), so such a table is simply not remembered.
  assert.equal(tableWidthKey('a|b', 'c', 0), null)
  assert.equal(tableWidthKey('a', 'b|c', 0), null)
})

test('reserved object keys are stored as plain entries, never as prototypes', () => {
  const storage = createMemoryStorage()
  for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(rememberTableWidths(storage, key, [200, 300], { columns: 2, signature: 'x' }, 1000), true, key)
  }
  const tables = readWidthTables(storage, 1000)
  assert.equal(Object.getPrototypeOf(tables), null)
  for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.deepEqual(tables[key].w, [200, 300], key)
  }
  assert.equal(Object.prototype.w, undefined, 'Object.prototype was not polluted')
})

test('an oversized payload is ignored instead of parsed', () => {
  let reads = 0
  const storage = {
    getItem: () => {
      reads += 1
      // A valid payload padded past the guard: parsing it would be the only
      // interesting work, so the guard must reject it before JSON.parse.
      return JSON.stringify({ version: COLWIDTH_VERSION, tables: { a: entry() } }) + ' '.repeat(MAX_COLWIDTH_PAYLOAD_LENGTH)
    },
    setItem: () => {},
    removeItem: () => {},
  }
  assert.deepEqual(Object.keys(readWidthTables(storage, 1000)), [])
  assert.equal(reads, 1)
})

test('a hand-written payload with thousands of entries is pruned to the cap', () => {
  const tables = {}
  for (let index = 0; index < 3000; index += 1) tables[`hand-${index}`] = { w: [200, 300], c: 2, h: 'x', t: 1000 + index }
  const raw = JSON.stringify({ version: COLWIDTH_VERSION, tables })
  assert.ok(raw.length < MAX_COLWIDTH_PAYLOAD_LENGTH, 'the fixture has to stay under the guard')
  const storage = createMemoryStorage()
  storage.values.set(COLWIDTH_STORAGE_KEY, raw)
  const pruned = readWidthTables(storage, 100000)
  assert.equal(Object.keys(pruned).length, MAX_COLWIDTH_ENTRIES)
  assert.equal(pruned['hand-2999'] !== undefined, true, 'the newest entry survives')
})

test('a quota-limited storage fails the write without corrupting the cache', () => {
  const values = new Map()
  const quota = 300
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (String(value).length > quota) throw new Error('QuotaExceededError')
      values.set(key, String(value))
    },
    removeItem: (key) => values.delete(key),
  }
  assert.equal(rememberTableWidths(storage, 'first', [200, 300], { columns: 2, signature: 'x' }, 1000), true)
  // Every later write grows the payload past the quota; each one must fail
  // cleanly (never throw), leaving the last accepted payload readable.
  let refused = 0
  for (let index = 0; index < 40; index += 1) {
    if (!rememberTableWidths(storage, `table-${index}`, [200, 300], { columns: 2, signature: 'x' }, 1000)) refused += 1
  }
  assert.ok(refused > 0, 'the quota was reached')
  const stored = values.get(COLWIDTH_STORAGE_KEY)
  assert.equal(typeof stored, 'string')
  const parsed = JSON.parse(stored)
  assert.equal(parsed.version, COLWIDTH_VERSION)
  assert.ok(parsed.tables.first !== undefined, 'the last accepted write is intact')
  // The read path agrees with the stored payload.
  assert.deepEqual(readTableWidths(storage, 'first', { columns: 2, signature: 'x' }, 1000), [200, 300])
})

test('the write path stays far below the payload guard at the entry cap', () => {
  // Worst realistic case: 300 entries with a 160-character key and the maximum
  // stored column count. This is the ceiling the payload guard has to accept.
  const tables = {}
  for (let index = 0; index < MAX_COLWIDTH_ENTRIES; index += 1) {
    const suffix = String(index).padStart(3, '0')
    const key = `${suffix}-${'k'.repeat(MAX_COLWIDTH_KEY_LENGTH - suffix.length - 1)}`
    tables[key] = {
      w: new Array(MAX_STORED_COLUMNS).fill(0).map((_, column) => 200.5 + column),
      c: MAX_STORED_COLUMNS,
      h: 'abcdef12',
      t: 1000 + index,
    }
  }
  const storage = createMemoryStorage()
  assert.equal(writeWidthTables(storage, tables, 1000), true)
  const raw = storage.values.get(COLWIDTH_STORAGE_KEY)
  assert.ok(raw.length < MAX_COLWIDTH_PAYLOAD_LENGTH, 'the worst case stays under the guard')
  assert.ok(raw.length < 200_000, `worst-case payload ${raw.length} characters`)
  assert.equal(Object.keys(readWidthTables(storage, 1000)).length, MAX_COLWIDTH_ENTRIES)
})
