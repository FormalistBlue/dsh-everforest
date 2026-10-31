/**
 * Persistent memory for the chat table column widths.
 *
 * The drag interaction (`src/table-resize.js`) only paints explicit widths onto
 * the table element, so a table the renderer unmounts — a session switch or a
 * page reload — comes back in the automatic layout. This module is the small,
 * DOM-free half of the memory: it turns a table identity + its widths into one
 * `localStorage` entry and back, and it never throws.
 *
 * Storage rules (design.md §18.6):
 *
 *  - one versioned key (`COLWIDTH_STORAGE_KEY`), **separate** from the strength
 *    cache: `src/state.js` rewrites its own payload on every palette write and
 *    would silently drop a field we added there, and the first-paint boot
 *    script parses that payload on every page load;
 *  - a table key is `sessionId|chatNodeKey|ordinal` (see `tableWidthKey`); the
 *    two DSH anchors are read by the controller, never here;
 *  - entries older than `COLWIDTH_TTL_MS` and everything beyond
 *    `MAX_COLWIDTH_ENTRIES` (oldest `t` first) are pruned on the next write;
 *  - a payload with an unknown version, unreadable storage or malformed JSON
 *    is treated as empty — this is a cache, so a bad payload is discarded
 *    instead of migrated, and a failing write only means "not remembered this
 *    session";
 *  - widths are stored on the half-pixel grid and validated on the way in and
 *    out; an entry whose column count or header signature no longer matches the
 *    table in the DOM is ignored rather than painted onto different content.
 *
 * Everything here is pure (storage is passed in), so `node --test` runs it
 * directly without a browser.
 */

/** `localStorage` key holding the JSON payload. */
export const COLWIDTH_STORAGE_KEY = 'dsh-everforest/colwidths/v1'

/**
 * Schema version stored alongside the entries.
 *
 * Bumped only when the entry shape changes incompatibly; a payload written by
 * another version is discarded (this is a cache, not a preference).
 */
export const COLWIDTH_VERSION = 1

/**
 * Newest entries kept across all sessions; the oldest write is evicted first.
 *
 * One entry is roughly 90 bytes, so the cap is ~27 KB — far below the 5 MiB
 * localStorage quota. The cap only bounds unbounded growth over years of use.
 */
export const MAX_COLWIDTH_ENTRIES = 300

/** Entries not rewritten for this long are dropped on the next write. */
export const COLWIDTH_TTL_MS = 180 * 24 * 60 * 60 * 1000

/** Longest table key accepted; longer identities are not remembered. */
export const MAX_COLWIDTH_KEY_LENGTH = 160

/**
 * Longest raw payload accepted from storage. The write path can never exceed
 * ~250 K characters (300 entries × a 160-character key × 32 columns), so a
 * longer value means the payload was written by something else; it is treated
 * as empty instead of parsed. This bounds both the `JSON.parse` cost and the
 * memory a corrupted / hostile value could make a restore pass allocate.
 */
export const MAX_COLWIDTH_PAYLOAD_LENGTH = 262144

/**
 * Column cap of the stored width arrays. Only a sanity guard here — the
 * layout limits (2–12 columns) are enforced by `src/table-resize.js`.
 */
export const MAX_STORED_COLUMNS = 32

/**
 * Longest header cell text hashed into the signature. A chat table header is a
 * few words; capping it bounds the hash work on a pathological table without
 * changing the result for any real header.
 */
export const MAX_SIGNATURE_CELL_LENGTH = 512

/**
 * Resolve the storage object to use.
 *
 * `readWidthTables()` / `writeWidthTables()` take an explicit storage for
 * tests. `null` explicitly means "no storage"; `undefined` falls back to
 * `globalThis.localStorage`, but only after checking that reading that
 * property does not throw (it does in some sandboxed contexts).
 *
 * @param {Storage | null | undefined} storage
 * @returns {Storage | null}
 */
function resolveStorage(storage) {
  if (storage === null) return null
  if (storage !== undefined) return storage
  try {
    const candidate = globalThis.localStorage
    return candidate && typeof candidate.getItem === 'function' ? candidate : null
  } catch {
    return null
  }
}

/**
 * 32-bit FNV-1a of a string, as eight lowercase hex digits.
 * @param {string} text
 * @returns {string}
 */
function fnv1a(text) {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * The storage key of one table, or null when the identity is incomplete.
 *
 * `sessionId` is the ChatView's conversation id and `nodeKey` the chat node
 * (message) key; `ordinal` is the table's zero-based index among the node's
 * markdown tables. A key longer than `MAX_COLWIDTH_KEY_LENGTH` is rejected
 * instead of truncated — two truncated keys could collide.
 *
 * The parts are joined with `|`, so an id that itself contains `|` would make
 * two different identities produce the same key ("a|b" + "c" = "a" + "b|c").
 * DSH ids never contain it (UUIDs and `kind:...` keys), but a hostile id must
 * not be able to alias another table's entry: such a table is simply not
 * remembered.
 *
 * @param {string | null | undefined} sessionId
 * @param {string | null | undefined} nodeKey
 * @param {number} ordinal
 * @returns {string | null}
 */
export function tableWidthKey(sessionId, nodeKey, ordinal) {
  if (typeof sessionId !== 'string' || sessionId === '' || sessionId.includes('|')) return null
  if (typeof nodeKey !== 'string' || nodeKey === '' || nodeKey.includes('|')) return null
  if (!Number.isInteger(ordinal) || ordinal < 0) return null
  const key = `${sessionId}|${nodeKey}|${ordinal}`
  return key.length > MAX_COLWIDTH_KEY_LENGTH ? null : key
}

/**
 * Signature of a table's header cells, used to refuse a remembered width set
 * after the message content changed (a retry may reuse the same node key).
 *
 * Pure text, no DOM: the controller passes `th.textContent.trim()` values.
 *
 * The cells are joined with a control character that header text never
 * contains, and that character (plus the escape character) is itself escaped
 * inside each cell. The mapping is injective, so `['a\u0001b','c']` and
 * `['a','b\u0001c']` cannot hash to the same input — a plain join would let a
 * cell imitate a separator and alias another table's widths. Escape-free cells
 * hash exactly like the previous plain-join version, so entries written by the
 * first build stay valid. Each cell is capped at
 * {@link MAX_SIGNATURE_CELL_LENGTH}.
 *
 * @param {Array<string | null | undefined>} cellTexts
 * @returns {string}
 */
export function headerSignature(cellTexts) {
  if (!Array.isArray(cellTexts) || cellTexts.length === 0) return ''
  const text = cellTexts
    .map((cell) => escapeSignatureCell(
      typeof cell === 'string' ? cell.trim().slice(0, MAX_SIGNATURE_CELL_LENGTH) : ''
    ))
    .join(SIGNATURE_SEPARATOR)
  return fnv1a(text)
}

/** Separator between header cells; escaped when it appears inside a cell. */
const SIGNATURE_SEPARATOR = '\u0001'

/** Escape character of the signature encoding; escaped too. */
const SIGNATURE_ESCAPE = '\u0002'

/**
 * Escape the signature separator / escape characters inside one cell.
 *
 * `\u0002e` stands for a literal `\u0002` and `\u0002s` for a literal
 * `\u0001`, so the encoded cell contains no separator of its own and the join
 * stays unambiguous. Text without those two characters is returned unchanged.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeSignatureCell(text) {
  if (text.indexOf(SIGNATURE_ESCAPE) === -1 && text.indexOf(SIGNATURE_SEPARATOR) === -1) return text
  return text
    .split(SIGNATURE_ESCAPE).join(SIGNATURE_ESCAPE + 'e')
    .split(SIGNATURE_SEPARATOR).join(SIGNATURE_ESCAPE + 's')
}

/**
 * Validate one stored entry, or return null when it cannot be trusted.
 *
 * Widths are rounded onto the half-pixel grid the browser renders crisply; a
 * non-positive or non-finite width invalidates the whole entry (a partially
 * valid width set is meaningless). `c` must agree with `w.length` when present,
 * because the controller validates the array length against the live table.
 *
 * @param {unknown} raw
 * @param {number} now - current time in ms (kept for a stable call shape).
 * @returns {{ w: number[], c: number, h: string, t: number } | null}
 */
export function normalizeWidthEntry(raw, now = Date.now()) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const widths = raw.w
  if (!Array.isArray(widths)) return null
  if (widths.length < 2 || widths.length > MAX_STORED_COLUMNS) return null
  const rounded = []
  for (const width of widths) {
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) return null
    rounded.push(Math.round(width * 2) / 2)
  }
  if (raw.c !== undefined && raw.c !== widths.length) return null
  if (typeof raw.h !== 'string') return null
  const savedAt = typeof raw.t === 'number' && Number.isFinite(raw.t) ? raw.t : now
  return { w: rounded, c: rounded.length, h: raw.h, t: savedAt }
}

/**
 * The valid entries of a parsed payload, without TTL / cap pruning.
 * @param {unknown} raw - `payload.tables`.
 * @returns {Record<string, { w: number[], c: number, h: string, t: number }>}
 */
export function normalizeWidthTables(raw) {
  /** @type {Record<string, object>} */
  const tables = Object.create(null)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return tables
  for (const key of Object.keys(raw)) {
    if (typeof key !== 'string' || key === '' || key.length > MAX_COLWIDTH_KEY_LENGTH) continue
    const entry = normalizeWidthEntry(raw[key])
    if (entry === null) continue
    tables[key] = entry
  }
  return tables
}

/**
 * Drop expired entries and keep only the newest `MAX_COLWIDTH_ENTRIES`.
 *
 * "Newest" is the last write (`t`), so re-dragging a column refreshes its
 * entry and protects it from eviction.
 *
 * @param {Record<string, { t: number }>} tables
 * @param {number} now - current time in ms.
 * @returns {Record<string, { w: number[], c: number, h: string, t: number }>}
 */
export function pruneWidthTables(tables, now = Date.now()) {
  const entries = []
  for (const key of Object.keys(tables)) {
    const entry = tables[key]
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.t === 'number' && now - entry.t > COLWIDTH_TTL_MS) continue
    entries.push([key, entry])
  }
  entries.sort((left, right) => {
    const delta = (right[1].t ?? 0) - (left[1].t ?? 0)
    if (delta !== 0) return delta
    return left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0
  })
  /** @type {Record<string, object>} */
  const pruned = Object.create(null)
  for (const [key, entry] of entries.slice(0, MAX_COLWIDTH_ENTRIES)) pruned[key] = entry
  return pruned
}

/**
 * Read every trusted entry. Never throws; an unusable payload reads as empty.
 * @param {Storage | undefined} [storage]
 * @param {number} [now]
 * @returns {Record<string, { w: number[], c: number, h: string, t: number }>}
 */
export function readWidthTables(storage, now = Date.now()) {
  const target = resolveStorage(storage)
  if (target === null) return Object.create(null)
  let raw
  try {
    raw = target.getItem(COLWIDTH_STORAGE_KEY)
  } catch {
    return Object.create(null)
  }
  if (typeof raw !== 'string' || raw === '') return Object.create(null)
  if (raw.length > MAX_COLWIDTH_PAYLOAD_LENGTH) return Object.create(null)
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return Object.create(null)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return Object.create(null)
  if (parsed.version !== COLWIDTH_VERSION) return Object.create(null)
  return pruneWidthTables(normalizeWidthTables(parsed.tables), now)
}

/**
 * Write every trusted entry (pruned first). Never throws.
 * @param {Storage | undefined} [storage]
 * @param {Record<string, object>} tables
 * @param {number} [now]
 * @returns {boolean} whether the write succeeded.
 */
export function writeWidthTables(storage, tables, now = Date.now()) {
  const target = resolveStorage(storage)
  if (target === null) return false
  try {
    target.setItem(COLWIDTH_STORAGE_KEY, JSON.stringify({
      version: COLWIDTH_VERSION,
      tables: pruneWidthTables(tables, now),
    }))
    return true
  } catch {
    return false
  }
}

/**
 * The remembered widths for `key`, or null when there is no trustworthy entry.
 *
 * `check` refuses a remembered set whose column count or header signature does
 * not match the live table (the table was edited / regenerated but the node key
 * was reused).
 *
 * @param {Storage | undefined} [storage]
 * @param {string} key
 * @param {{ columns: number, signature: string }} check
 * @param {number} [now]
 * @returns {number[] | null}
 */
export function readTableWidths(storage, key, check, now = Date.now()) {
  if (typeof key !== 'string' || key === '') return null
  const entry = readWidthTables(storage, now)[key]
  if (entry === undefined) return null
  if (check === undefined || check === null) return entry.w.slice()
  if (entry.c !== check.columns || entry.h !== check.signature) return null
  return entry.w.slice()
}

/**
 * Store one table's widths, refreshing its timestamp.
 *
 * The read-modify-write keeps the other entries and lets `pruneWidthTables`
 * evict the oldest ones when the cap is exceeded.
 *
 * @param {Storage | undefined} [storage]
 * @param {string} key
 * @param {number[]} widths
 * @param {{ columns: number, signature: string }} check
 * @param {number} [now]
 * @returns {boolean}
 */
export function rememberTableWidths(storage, key, widths, check, now = Date.now()) {
  if (typeof key !== 'string' || key === '') return false
  const entry = normalizeWidthEntry({
    w: widths,
    c: check === undefined || check === null ? undefined : check.columns,
    h: check === undefined || check === null ? '' : check.signature,
    t: now,
  }, now)
  if (entry === null) return false
  const tables = readWidthTables(storage, now)
  tables[key] = entry
  return writeWidthTables(storage, tables, now)
}

/**
 * Forget one table. Never throws; returns whether an entry was removed.
 * @param {Storage | undefined} [storage]
 * @param {string} key
 * @param {number} [now]
 * @returns {boolean}
 */
export function forgetTableWidths(storage, key, now = Date.now()) {
  if (typeof key !== 'string' || key === '') return false
  const tables = readWidthTables(storage, now)
  if (tables[key] === undefined) return false
  delete tables[key]
  return writeWidthTables(storage, tables, now)
}

/**
 * The narrow interface `installColumnResize({ memory })` consumes.
 *
 * The controller owns the DOM side (which table is which) and asks this object
 * only for "the remembered widths of this key", "remember these widths" and
 * "forget this key". Wrapping the pure functions keeps `localStorage` and the
 * clock out of the DOM module and makes the controller testable with a fake.
 *
 * @param {{ storage?: Storage, now?: () => number }} [options]
 * @returns {{ read: (key: string, check: { columns: number, signature: string }) => number[] | null, write: (key: string, widths: number[], check: { columns: number, signature: string }) => boolean, forget: (key: string) => boolean }}
 */
export function createColumnWidthMemory(options = {}) {
  const { storage } = options
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  return {
    read(key, check) {
      return readTableWidths(storage, key, check, now())
    },
    write(key, widths, check) {
      return rememberTableWidths(storage, key, widths, check, now())
    },
    forget(key) {
      return forgetTableWidths(storage, key, now())
    },
  }
}
