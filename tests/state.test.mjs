/**
 * Unit tests for the persisted user state (`src/state.js`).
 *
 * The state is the palette choice cached in `localStorage['dsh-everforest/v1']`:
 * one strength per scheme plus the experimental color-mode flag (0.4.0). The
 * Host profile config is the source of truth since 0.3.0; this module owns the
 * cache and the migration source. The color mode is on by default since
 * 2026-10-23 (only an explicit `false` disables it), so a missing flag in a
 * 0.3.x payload reads as on. The tests cover the defaults, the pure
 * normalizers (hostile inputs included), the never-throwing storage adapters,
 * the 0.3.x payload compatibility (no `colorMode` field), and
 * `readStoredState()` — the no-repair/no-default read the migration needs to
 * tell "a real choice exists" from "nothing stored yet".
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import {
  STORAGE_KEY,
  STATE_VERSION,
  createDefaultState,
  normalizeState,
  normalizeStrengths,
  readState,
  readStoredState,
  resetState,
  writeState,
} from '../src/state.js'

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

/** The default state as it comes out of `normalizeState()`. */
function assertDefaults(state) {
  assert.deepEqual(state, { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: true })
}

/** A stored payload with the current schema version and an explicit colorMode. */
function storedPayload(pair, colorMode = true) {
  return JSON.stringify({ version: STATE_VERSION, ...pair, colorMode })
}

test('storage key and schema version are the documented ones', () => {
  assert.equal(STORAGE_KEY, 'dsh-everforest/v1')
  // 0.4.0 adds an optional `colorMode` field; the version stays 1 so 0.3.x
  // caches remain valid instead of being discarded.
  assert.equal(STATE_VERSION, 1)
})

test('default state matches Everforest Enchanted (light hard / dark soft, color mode on)', () => {
  assert.deepEqual(DEFAULT_STATE, { light: 'hard', dark: 'soft' })
  assert.deepEqual(createDefaultState(), { light: 'hard', dark: 'soft', colorMode: true })
  // A fresh object every time: mutating one instance must not leak into others.
  const first = createDefaultState()
  first.light = 'soft'
  first.colorMode = false
  assert.deepEqual(createDefaultState(), { light: 'hard', dark: 'soft', colorMode: true })
})

test('normalizeState accepts a complete, current payload', () => {
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard', colorMode: true }), {
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard', colorMode: false }), {
    light: 'soft',
    dark: 'hard',
    colorMode: false,
  })
  // A 0.3.x payload has no colorMode field: it resolves to the default (on)
  // without a repair.
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard' }), {
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
  assert.deepEqual(normalizeState({ version: 1, light: 'medium', dark: 'medium' }), {
    light: 'medium',
    dark: 'medium',
    colorMode: true,
  })
  for (const strength of STRENGTHS) {
    assert.deepEqual(normalizeState({ version: 1, light: strength, dark: strength }), {
      light: strength,
      dark: strength,
      colorMode: true,
    })
  }
})

test('normalizeState falls back for values that are not stored objects', () => {
  for (const raw of [undefined, null, 0, 1, 'hard', true, false, [], [1, 2], () => {}, Symbol('x')]) {
    assertDefaults(normalizeState(raw))
  }
})

test('normalizeState rejects unknown and missing versions', () => {
  assertDefaults(normalizeState({ light: 'soft', dark: 'hard' })) // no version
  assertDefaults(normalizeState({ version: 0, light: 'soft', dark: 'hard' }))
  assertDefaults(normalizeState({ version: 2, light: 'soft', dark: 'hard', colorMode: true }))
  assertDefaults(normalizeState({ version: '1', light: 'soft', dark: 'hard' }))
  assertDefaults(normalizeState({ version: 1.5, light: 'soft', dark: 'hard' }))
})

test('normalizeState repairs individual invalid fields without dropping the others', () => {
  assert.deepEqual(normalizeState({ version: 1, light: 'ultra', dark: 'medium' }), {
    light: 'hard',
    dark: 'medium',
    colorMode: true,
  })
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 42 }), {
    light: 'soft',
    dark: 'soft',
    colorMode: true,
  })
  assert.deepEqual(normalizeState({ version: 1, light: null, dark: null }), {
    light: 'hard',
    dark: 'soft',
    colorMode: true,
  })
  assert.deepEqual(normalizeState({ version: 1 }), { light: 'hard', dark: 'soft', colorMode: true })

  // Only the literal boolean `false` switches the mode off; a hostile flag
  // falls back to the default (on) while the strengths survive. `isStoredState`
  // rejects such a payload before it reaches storage, but the pure normalizer
  // must never throw either.
  for (const colorMode of ['on', 'true', 1, 0, null, {}, []]) {
    assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard', colorMode }), {
      light: 'soft',
      dark: 'hard',
      colorMode: true,
    }, `colorMode ${JSON.stringify(colorMode)} must fall back to on`)
  }
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard', colorMode: true }), {
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
})

test('normalizeState ignores unknown extra fields and is pure', () => {
  const raw = Object.freeze({
    version: 1,
    light: 'soft',
    dark: 'hard',
    colorMode: true,
    extra: { nested: true },
  })
  const normalized = normalizeState(raw)
  assert.deepEqual(normalized, { light: 'soft', dark: 'hard', colorMode: true })
  assert.notEqual(normalized, raw)
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'version'), false)
  assert.equal(normalized.extra, undefined)
})

test('readState returns the defaults without usable storage', () => {
  assertDefaults(readState())
  assertDefaults(readState(null))
  assertDefaults(readState(createThrowingStorage()))
  assertDefaults(readState({ getItem: 'not a function' }))
})

test('readState returns the saved state and reads the versioned key', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: storedPayload({ light: 'soft', dark: 'medium' }, true),
  })
  assert.deepEqual(readState(storage), { light: 'soft', dark: 'medium', colorMode: true })
  assert.deepEqual(storage.calls.getItem, [STORAGE_KEY])
  assert.equal(storage.calls.setItem.length, 0)

  // A 0.3.x cache payload (no colorMode) is valid and is NOT rewritten.
  const legacy = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'medium' }),
  })
  assert.deepEqual(readState(legacy), { light: 'soft', dark: 'medium', colorMode: true })
  assert.equal(legacy.calls.setItem.length, 0, 'an old valid cache must not be repaired')
})

test('readState falls back to defaults when the key is missing or unreadable', () => {
  const empty = createMemoryStorage()
  assertDefaults(readState(empty))

  const hostile = {
    getItem() {
      throw new Error('SecurityError')
    },
    setItem() {
      throw new Error('SecurityError')
    },
  }
  assertDefaults(readState(hostile))

  const numericPayload = createMemoryStorage({ [STORAGE_KEY]: 42 })
  assertDefaults(readState(numericPayload))
})

test('readState repairs malformed JSON and unknown payloads by rewriting defaults', () => {
  const malformed = createMemoryStorage({ [STORAGE_KEY]: '{"version":1,' })
  assertDefaults(readState(malformed))
  assert.deepEqual(malformed.calls.setItem, [
    [STORAGE_KEY, JSON.stringify({ version: 1, light: 'hard', dark: 'soft', colorMode: true })],
  ])

  for (const payload of [
    JSON.stringify({ version: 2, light: 'soft', dark: 'hard', colorMode: true }),
    JSON.stringify({ version: 1, light: 'ultra', dark: 'hard' }),
    JSON.stringify({ version: 1, light: 'soft' }),
    // A non-boolean colorMode is corrupt data, not a value to coerce: the whole
    // payload is repaired to the default state.
    JSON.stringify({ version: 1, light: 'soft', dark: 'hard', colorMode: 'on' }),
    JSON.stringify({ version: 1, light: 'soft', dark: 'hard', colorMode: 1 }),
    JSON.stringify([]),
    'null',
    '"hard"',
  ]) {
    const storage = createMemoryStorage({ [STORAGE_KEY]: payload })
    assertDefaults(readState(storage))
    assert.equal(storage.calls.setItem.length, 1, `expected a repair write for ${payload}`)
    assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
      version: 1,
      light: 'hard',
      dark: 'soft',
      colorMode: true,
    })
  }
})

test('readState does not rewrite a valid payload with unknown extra fields', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: 1, light: 'medium', dark: 'soft', extra: 'kept' }),
  })
  assert.deepEqual(readState(storage), { light: 'medium', dark: 'soft', colorMode: true })
  assert.equal(storage.calls.setItem.length, 0)
})

test('writeState persists the versioned payload and reports success', () => {
  const storage = createMemoryStorage()
  assert.equal(writeState({ light: 'soft', dark: 'hard' }, storage), true)
  assert.equal(storage.calls.setItem.length, 1)
  const [key, raw] = storage.calls.setItem[0]
  assert.equal(key, STORAGE_KEY)
  // The flag is always written explicitly, even when the caller omitted it
  // (the fallback is the default, on).
  assert.deepEqual(JSON.parse(raw), { version: 1, light: 'soft', dark: 'hard', colorMode: true })

  assert.equal(writeState({ light: 'hard', dark: 'medium', colorMode: true }, storage), true)
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'medium',
    colorMode: true,
  })
})

test('writeState normalizes invalid fields before writing', () => {
  const storage = createMemoryStorage()
  assert.equal(writeState({ light: 'ultra', dark: 'soft', colorMode: 'yes' }, storage), true)
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
    colorMode: true,
  })
  // Hostile input (not an object) still writes the default state.
  writeState(undefined, storage)
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
    colorMode: true,
  })
})

test('writeState fails silently for unavailable or failing storage', () => {
  assert.equal(writeState({ light: 'hard', dark: 'soft' }), false)
  assert.equal(writeState({ light: 'hard', dark: 'soft' }, null), false)
  assert.equal(writeState({ light: 'hard', dark: 'soft' }, createThrowingStorage()), false)
  assert.equal(writeState({ light: 'hard', dark: 'soft' }, { getItem: () => null }), false)
})

test('state survives a write/read round trip', () => {
  const storage = createMemoryStorage()
  for (const state of [
    { light: 'hard', dark: 'soft', colorMode: false },
    { light: 'soft', dark: 'hard', colorMode: true },
    { light: 'medium', dark: 'medium', colorMode: false },
    { light: 'soft', dark: 'soft', colorMode: true },
  ]) {
    assert.equal(writeState(state, storage), true)
    assert.deepEqual(readState(storage), state)
  }
})

test('resetState restores the Enchanted defaults (color mode on) and persists them', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: storedPayload({ light: 'soft', dark: 'hard' }, false),
  })
  const reset = resetState(storage)
  assert.deepEqual(reset, { light: 'hard', dark: 'soft', colorMode: true })
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
    colorMode: true,
  })
  // Still returns the defaults when the write fails.
  const failed = resetState(createThrowingStorage())
  assert.deepEqual(failed, { light: 'hard', dark: 'soft', colorMode: true })
})

test('normalizeStrengths validates the unversioned Host section (colorMode included)', () => {
  assert.deepEqual(normalizeStrengths({ light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
    colorMode: true,
  })
  assert.deepEqual(normalizeStrengths({ light: 'soft', dark: 'medium', colorMode: true }), {
    light: 'soft',
    dark: 'medium',
    colorMode: true,
  })
  // The Host section is unversioned, so a stray version must not discard it.
  assert.deepEqual(normalizeStrengths({ version: 99, light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
    colorMode: true,
  })
  // A versioned cache without that field, though, is still a pair.
  assert.deepEqual(normalizeStrengths({ light: 'nope', dark: 'hard' }), {
    light: DEFAULT_STATE.light,
    dark: 'hard',
    colorMode: true,
  })
  for (const hostile of [null, undefined, 'hard', [1, 2], 42]) {
    assert.deepEqual(normalizeStrengths(hostile), {
      light: DEFAULT_STATE.light,
      dark: DEFAULT_STATE.dark,
      colorMode: true,
    })
  }
  // Only the literal boolean `false` disables the mode.
  for (const colorMode of ['on', 1, 0, null, {}, []]) {
    assert.equal(normalizeStrengths({ colorMode }).colorMode, true)
  }
  assert.equal(normalizeStrengths({ colorMode: false }).colorMode, false)
  // Unknown extra fields are ignored, never copied.
  assert.deepEqual(normalizeStrengths({ light: 'soft', dark: 'hard', extra: true }), {
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
})

test('readStoredState reports a real choice and never repairs or defaults', () => {
  const valid = storedPayload({ light: 'soft', dark: 'hard' }, true)
  const storage = createMemoryStorage({ [STORAGE_KEY]: valid })
  assert.deepEqual(readStoredState(storage), {
    version: STATE_VERSION,
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
  assert.equal(storage.calls.setItem.length, 0, 'readStoredState must not rewrite the cache')

  // A 0.3.x payload without the field is still a real choice (with the default,
  // on, for the flag).
  const legacy = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'hard' }),
  })
  assert.deepEqual(readStoredState(legacy), {
    version: STATE_VERSION,
    light: 'soft',
    dark: 'hard',
    colorMode: true,
  })
  assert.equal(legacy.calls.setItem.length, 0)

  // Absent key, unreadable storage, malformed JSON, unknown version, an invalid
  // strength, and a non-boolean colorMode all mean "nothing worth migrating".
  for (const storage of [
    createMemoryStorage(),
    createThrowingStorage(),
    createMemoryStorage({ [STORAGE_KEY]: '{oops' }),
    createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, light: 'soft', dark: 'hard' }) }),
    createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'nope', dark: 'hard' }) }),
    createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'hard', colorMode: 'yes' }) }),
    createMemoryStorage({ [STORAGE_KEY]: 'null' }),
  ]) {
    assert.equal(readStoredState(storage), null)
  }
  assert.equal(readStoredState(undefined), null)

  // A valid default pairing is still a stored choice (readState and
  // readStoredState must agree on validity); the migration decides separately
  // whether it is worth seeding.
  const defaults = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: STATE_VERSION,
      light: DEFAULT_STATE.light,
      dark: DEFAULT_STATE.dark,
      colorMode: true,
    }),
  })
  assert.deepEqual(readStoredState(defaults), {
    version: STATE_VERSION,
    light: DEFAULT_STATE.light,
    dark: DEFAULT_STATE.dark,
    colorMode: true,
  })

  // Default strengths with color mode off is a real choice, not the default.
  const modeOnly = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: STATE_VERSION,
      light: DEFAULT_STATE.light,
      dark: DEFAULT_STATE.dark,
      colorMode: false,
    }),
  })
  assert.deepEqual(readStoredState(modeOnly), {
    version: STATE_VERSION,
    light: DEFAULT_STATE.light,
    dark: DEFAULT_STATE.dark,
    colorMode: false,
  })
})

test('readStoredState ignores unknown extra fields like readState does', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'medium', dark: 'soft', extra: 'kept' }),
  })
  assert.deepEqual(readStoredState(storage), {
    version: STATE_VERSION,
    light: 'medium',
    dark: 'soft',
    colorMode: true,
  })
  assert.equal(storage.calls.setItem.length, 0)
})
