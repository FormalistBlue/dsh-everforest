/**
 * The localStorage cache of the user's palette choice for dsh-everforest.
 *
 * The user picks one strength (`hard` / `medium` / `soft`) per color scheme.
 * Since 0.3.0 the **source of truth** is the Host settings document (the active
 * profile's `cordis.patch.yml`, edited through the Client `ctx.configForms`
 * service — see `src/durable.js` and `src/host-config.js`), shared by every
 * browser of that profile. This module keeps the browser-local **cache** of the
 * same state under a versioned `localStorage` key:
 *
 *  - it is what the Host boot row reads for the first paint (the cache is
 *    always at least as fresh as a Desktop boot payload, which is collected
 *    once when the Host becomes ready);
 *  - it is the one-shot migration source seeded into the Host document by
 *    0.3.0 (`readStoredState` tells "a real choice exists" from "nothing yet");
 *  - it is the whole persistence story on a pre-0.3.0 host that serves no
 *    settings form (the Client learns that from `configForms` reporting
 *    `unavailable`).
 *
 * Color mode is no longer part of this state: since 2026-10-24 it ships as a
 * default feature with no switch (see docs/design.md §13), so the stored shape
 * is back to the two strengths. A 0.4.x payload still carrying a `colorMode`
 * field stays valid — unknown fields are ignored on read and dropped by the
 * next write (the 0.3.x → 0.4.x compatibility rule in the other direction:
 * 0.4.x reads a payload without the field as "color mode on", which is exactly
 * what this version renders).
 *
 * Storage rules (design §3.2 / §7):
 *
 *  - a missing key, unreadable storage, malformed JSON, an unknown `version`,
 *    or an invalid strength all fall back to the default state (light = hard,
 *    dark = soft, i.e. Everforest Enchanted's pairing);
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

/**
 * Schema version stored alongside the state.
 *
 * Deliberately still `1`: the payload is `{ version, light, dark }`, which is a
 * prefix of both the 0.3.x payload (same two fields) and the 0.4.x payload
 * (which carried an extra `colorMode` field that this version ignores). Bumping
 * the version would discard every existing cache instead of migrating it.
 */
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
 * falls back to the default state; with a known version each field is
 * validated independently so one bad field does not discard the other.
 *
 * @param {unknown} raw - result of `JSON.parse()` or anything else.
 * @returns {{ light: string, dark: string }}
 */
export function normalizeState(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultState()
  if (raw.version !== STATE_VERSION) return createDefaultState()
  return normalizeStrengths(raw)
}

/**
 * Validate an unversioned state (the Host `Config` section shape and the boot
 * hint), falling back per field.
 *
 * Pure: never reads storage, never mutates the input, always returns a new
 * object. Two invalid strengths collapse to the shipped default pairing; any
 * other field (e.g. the `colorMode` left behind by a 0.4.x Host section) is
 * ignored.
 *
 * @param {unknown} raw - anything, usually a plain object.
 * @returns {{ light: string, dark: string }}
 */
export function normalizeStrengths(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultState()
  return {
    light: normalizeStrength(raw.light, DEFAULT_STATE.light),
    dark: normalizeStrength(raw.dark, DEFAULT_STATE.dark),
  }
}

/**
 * Serialize a state into the stored payload shape.
 *
 * The version is always the current one and every field is normalized first,
 * so a caller passing a hostile/incomplete object still writes a legal payload.
 * Only the two strengths are written; a legacy `colorMode` key is dropped here.
 *
 * @param {{ light: string, dark: string }} state
 * @returns {{ version: number, light: string, dark: string }}
 */
function serializeState(state) {
  const legal = normalizeState({ version: STATE_VERSION, ...state })
  return {
    version: STATE_VERSION,
    light: legal.light,
    dark: legal.dark,
  }
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
 * default state; invalid payloads are rewritten in place when possible. A
 * 0.4.x payload carrying the retired `colorMode` field is valid and is read as
 * the same two strengths (no rewrite).
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
 *
 * Unknown extra keys (the retired `colorMode`) are tolerated: they carry no
 * meaning for this version and are dropped by the next write.
 *
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
 * Read the stored payload without repairing or defaulting it.
 *
 * Distinguishes "this browser never chose anything" (or the cache is
 * corrupt/stale-version) from a real choice, which the 0.2.1 → 0.3.0 migration
 * needs: only a genuine non-default cache is seeded into the Host settings
 * document. Never throws; a missing/unreadable/malformed entry returns `null`.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ version: number, light: string, dark: string } | null}
 */
export function readStoredState(storage) {
  const target = resolveStorage(storage)
  if (!target) return null
  let raw
  try {
    raw = target.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (typeof raw !== 'string') return null
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isStoredState(parsed)) return null
  return {
    version: STATE_VERSION,
    light: parsed.light,
    dark: parsed.dark,
  }
}

/**
 * Persist the state.
 *
 * Accepts a plain `{ light, dark }` (the shape used inside the client) and
 * stores it with the schema version. Writing never throws: a failure (private
 * mode, quota, no storage) is reported as `false` and the caller keeps the
 * in-memory state.
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
 * Restore the default state (Enchanted's dark soft / light hard) and persist
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
