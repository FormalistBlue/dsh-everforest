/**
 * Unit tests for the persisted user state (`src/state.js`).
 *
 * The state is the per-scheme strength choice stored in
 * `localStorage['dsh-everforest/v1']`. The tests cover the defaults, the pure
 * normalizer (hostile inputs included), and the never-throwing storage
 * adapters, using plain in-memory `Storage` stubs.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import {
  STORAGE_KEY,
  STATE_VERSION,
  createDefaultState,
  normalizeState,
  readState,
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

/** The default pairing as it comes out of `normalizeState()`. */
function assertDefaults(state) {
  assert.deepEqual(state, { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark })
}

test('storage key and schema version are the documented ones', () => {
  assert.equal(STORAGE_KEY, 'dsh-everforest/v1')
  assert.equal(STATE_VERSION, 1)
})

test('default pairing matches Everforest Enchanted (light hard / dark soft)', () => {
  assert.deepEqual(DEFAULT_STATE, { light: 'hard', dark: 'soft' })
  assert.deepEqual(createDefaultState(), { light: 'hard', dark: 'soft' })
  // A fresh object every time: mutating one instance must not leak into others.
  const first = createDefaultState()
  first.light = 'soft'
  assert.deepEqual(createDefaultState(), { light: 'hard', dark: 'soft' })
})

test('normalizeState accepts a complete, current payload', () => {
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 'hard' }), {
    light: 'soft',
    dark: 'hard',
  })
  assert.deepEqual(normalizeState({ version: 1, light: 'medium', dark: 'medium' }), {
    light: 'medium',
    dark: 'medium',
  })
  for (const strength of STRENGTHS) {
    assert.deepEqual(normalizeState({ version: 1, light: strength, dark: strength }), {
      light: strength,
      dark: strength,
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
  assertDefaults(normalizeState({ version: 2, light: 'soft', dark: 'hard' }))
  assertDefaults(normalizeState({ version: '1', light: 'soft', dark: 'hard' }))
  assertDefaults(normalizeState({ version: 1.5, light: 'soft', dark: 'hard' }))
})

test('normalizeState repairs individual invalid fields without dropping the other', () => {
  assert.deepEqual(normalizeState({ version: 1, light: 'ultra', dark: 'medium' }), {
    light: 'hard',
    dark: 'medium',
  })
  assert.deepEqual(normalizeState({ version: 1, light: 'soft', dark: 42 }), {
    light: 'soft',
    dark: 'soft',
  })
  assert.deepEqual(normalizeState({ version: 1, light: null, dark: null }), {
    light: 'hard',
    dark: 'soft',
  })
  assert.deepEqual(normalizeState({ version: 1 }), { light: 'hard', dark: 'soft' })
})

test('normalizeState ignores unknown extra fields and is pure', () => {
  const raw = Object.freeze({
    version: 1,
    light: 'soft',
    dark: 'hard',
    extra: { nested: true },
  })
  const normalized = normalizeState(raw)
  assert.deepEqual(normalized, { light: 'soft', dark: 'hard' })
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
    [STORAGE_KEY]: JSON.stringify({ version: 1, light: 'soft', dark: 'medium' }),
  })
  assert.deepEqual(readState(storage), { light: 'soft', dark: 'medium' })
  assert.deepEqual(storage.calls.getItem, [STORAGE_KEY])
  assert.equal(storage.calls.setItem.length, 0)
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
    [STORAGE_KEY, JSON.stringify({ version: 1, light: 'hard', dark: 'soft' })],
  ])

  for (const payload of [
    JSON.stringify({ version: 2, light: 'soft', dark: 'hard' }),
    JSON.stringify({ version: 1, light: 'ultra', dark: 'hard' }),
    JSON.stringify({ version: 1, light: 'soft' }),
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
    })
  }
})

test('readState does not rewrite a valid payload with unknown extra fields', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: 1, light: 'medium', dark: 'soft', extra: 'kept' }),
  })
  assert.deepEqual(readState(storage), { light: 'medium', dark: 'soft' })
  assert.equal(storage.calls.setItem.length, 0)
})

test('writeState persists the versioned payload and reports success', () => {
  const storage = createMemoryStorage()
  assert.equal(writeState({ light: 'soft', dark: 'hard' }, storage), true)
  assert.equal(storage.calls.setItem.length, 1)
  const [key, raw] = storage.calls.setItem[0]
  assert.equal(key, STORAGE_KEY)
  assert.deepEqual(JSON.parse(raw), { version: 1, light: 'soft', dark: 'hard' })
})

test('writeState normalizes invalid fields before writing', () => {
  const storage = createMemoryStorage()
  assert.equal(writeState({ light: 'ultra', dark: 'soft' }, storage), true)
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
  })
  // Hostile input (not an object) still writes the default pairing.
  writeState(undefined, storage)
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
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
    { light: 'hard', dark: 'soft' },
    { light: 'soft', dark: 'hard' },
    { light: 'medium', dark: 'medium' },
  ]) {
    assert.equal(writeState(state, storage), true)
    assert.deepEqual(readState(storage), state)
  }
})

test('resetState restores the Enchanted defaults and persists them', () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: 1, light: 'soft', dark: 'hard' }),
  })
  const reset = resetState(storage)
  assert.deepEqual(reset, { light: 'hard', dark: 'soft' })
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY)), {
    version: 1,
    light: 'hard',
    dark: 'soft',
  })
  // Still returns the defaults when the write fails.
  const failed = resetState(createThrowingStorage())
  assert.deepEqual(failed, { light: 'hard', dark: 'soft' })
})
