/**
 * Persisted user state for dsh-everforest.
 *
 * The user picks one strength (`hard` / `medium` / `soft`) per color scheme.
 * The choice lives in `localStorage` under a versioned key; the DSH Appearance
 * preference (light / dark / system) stays owned by DSH itself.
 *
 * Storage rules (design §3.2 / §7):
 *
 *  - a missing key, unreadable storage, malformed JSON, an unknown `version`,
 *    or an invalid strength all fall back to the default pairing
 *    (light = hard, dark = soft, i.e. Everforest Enchanted's defaults);
 *  - invalid stored data is rewritten with the default so the next read is
 *    clean, but a failing write never throws (private mode / quota);
 *  - reading and writing never throw: the preference silently degrades to
 *    "applies for this session only".
 *
 * The module is a pure ESM source that also runs in plain Node (`node --test`),
 * so it never touches `window` at import time.
 */

import { DEFAULT_STATE, STRENGTHS } from './palette.js'

/** `localStorage` key holding the JSON payload. */
export const STORAGE_KEY = 'dsh-everforest/v1'

/** Schema version stored alongside the strengths. */
export const STATE_VERSION = 1

/**
 * Build a fresh copy of the default state.
 * @returns {{ light: string, dark: string }}
 */
export function createDefaultState() {
  return { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
}

/**
 * Resolve the storage object to use.
 *
 * `readState()` / `writeState()` take an explicit storage for tests. Without
 * one they use `globalThis.localStorage`, but only after checking that reading
 * that property does not throw (it does throw in some sandboxed contexts).
 *
 * @param {Storage | undefined} storage
 * @returns {Storage | null}
 */
function resolveStorage(storage) {
  if (storage !== undefined && storage !== null) return storage
  try {
    const candidate = globalThis.localStorage
    return candidate && typeof candidate.getItem === 'function' ? candidate : null
  } catch {
    return null
  }
}

/**
 * Pin one strength value to the supported set.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function normalizeStrength(value, fallback) {
  return typeof value === 'string' && STRENGTHS.includes(value) ? value : fallback
}

/**
 * Turn arbitrary parsed JSON into a legal `{ light, dark }` state.
 *
 * Pure: it never reads storage, never mutates the input, and always returns a
 * new object. An object with an unknown `version` (or with no version at all)
 * falls back to the default pairing; with a known version each field is
 * validated independently so one bad strength does not discard the other.
 *
 * @param {unknown} raw - result of `JSON.parse()` or anything else.
 * @returns {{ light: string, dark: string }}
 */
export function normalizeState(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultState()
  if (raw.version !== STATE_VERSION) return createDefaultState()
  return {
    light: normalizeStrength(raw.light, DEFAULT_STATE.light),
    dark: normalizeStrength(raw.dark, DEFAULT_STATE.dark),
  }
}

/**
 * Serialize a state into the stored payload shape.
 * @param {{ light: string, dark: string }} state
 * @returns {{ version: number, light: string, dark: string }}
 */
function serializeState(state) {
  const legal = normalizeState({ version: STATE_VERSION, ...state })
  return { version: STATE_VERSION, light: legal.light, dark: legal.dark }
}

/**
 * Best-effort write of the default state used when reading found garbage.
 * @param {Storage} storage
 * @returns {{ light: string, dark: string }}
 */
function repairStorage(storage) {
  const fallback = createDefaultState()
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(serializeState(fallback)))
  } catch {
    // Storage is unavailable; the fallback still applies for this session.
  }
  return fallback
}

/**
 * Read the persisted state.
 *
 * Never throws. Missing or unreadable entries and invalid payloads return the
 * default pairing; invalid payloads are rewritten in place when possible.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ light: string, dark: string }}
 */
export function readState(storage) {
  const target = resolveStorage(storage)
  if (!target) return createDefaultState()
  let raw
  try {
    raw = target.getItem(STORAGE_KEY)
  } catch {
    return createDefaultState()
  }
  if (typeof raw !== 'string') return createDefaultState()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return repairStorage(target)
  }
  if (!isStoredState(parsed)) return repairStorage(target)
  return normalizeState(parsed)
}

/**
 * True only for a payload that already matches the stored schema exactly,
 * including the version. Used to decide whether a rewrite is worthwhile.
 * @param {unknown} parsed
 * @returns {boolean}
 */
function isStoredState(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  if (parsed.version !== STATE_VERSION) return false
  return (
    typeof parsed.light === 'string'
    && STRENGTHS.includes(parsed.light)
    && typeof parsed.dark === 'string'
    && STRENGTHS.includes(parsed.dark)
  )
}

/**
 * Persist the state.
 *
 * Accepts a plain `{ light, dark }` (the shape used inside the client) and
 * stores it with the schema version. Invalid fields are normalized to defaults
 * before writing. Writing never throws: a failure (private mode, quota, no
 * storage) is reported as `false` and the caller keeps the in-memory state.
 *
 * @param {{ light: string, dark: string }} state
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {boolean} whether the value was persisted.
 */
export function writeState(state, storage) {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)))
    return true
  } catch {
    return false
  }
}

/**
 * Restore the default pairing (Enchanted's dark soft / light hard) and persist
 * it. Returns the state even when the write fails.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ light: string, dark: string }}
 */
export function resetState(storage) {
  const fallback = createDefaultState()
  writeState(fallback, storage)
  return fallback
}
