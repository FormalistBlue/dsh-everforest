/**
 * The localStorage cache of the user's palette choice for dsh-everforest.
 *
 * The user picks one strength (`hard` / `medium` / `soft`) per color scheme and,
 * since 0.4.0, may switch the experimental **color mode** on or off. Since 0.3.0
 * the **source of truth** is the Host settings document (the active profile's
 * `cordis.patch.yml`, edited through the Client `ctx.configForms` service — see
 * `src/durable.js` and `src/host-config.js`), shared by every browser of that
 * profile. This module keeps the browser-local **cache** of the same state
 * under a versioned `localStorage` key:
 *
 *  - it is what the Host boot row reads for the first paint (the cache is
 *    always at least as fresh as a Desktop boot payload, which is collected
 *    once when the Host becomes ready);
 *  - it is the one-shot migration source seeded into the Host document by
 *    0.3.0 (`readStoredState` tells "a real choice exists" from "nothing yet");
 *  - it is the whole persistence story on a pre-0.3.0 host that serves no
 *    settings form (the Client learns that from `configForms` reporting
 *    `unavailable`);
 *  - it carries `colorMode` to the Client on the very first frame even when the
 *    Host boot hint (which only covers the two strengths) is present.
 *
 * Storage rules (design §3.2 / §7):
 *
 *  - a missing key, unreadable storage, malformed JSON, an unknown `version`,
 *    or an invalid strength all fall back to the default state (light = hard,
 *    dark = soft, colorMode = false, i.e. Everforest Enchanted's defaults);
 *  - `colorMode` is optional in the payload because 0.3.x caches predate it:
 *    a missing field reads as `false` and is **not** treated as corrupt (no
 *    repair rewrite, the payload still counts for the migration);
 *  - a non-boolean `colorMode` makes the payload invalid, exactly like an
 *    invalid strength: `readState` repairs it with the default state and
 *    `readStoredState` reports `null` (nothing trustworthy to migrate);
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
 * Deliberately still `1`: `colorMode` is an optional addition, so a 0.3.x
 * payload stays valid and a 0.4.x payload stays readable by the previous
 * plugin (unknown fields are ignored on read). Bumping the version would
 * discard every existing cache instead of migrating it.
 */
export const STATE_VERSION = 1

/**
 * Build a fresh copy of the default state.
 * @returns {{ light: string, dark: string, colorMode: boolean }}
 */
export function createDefaultState() {
  return { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: false }
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
 * Pin the color-mode flag to a real boolean.
 *
 * A missing flag (0.3.x cache) and anything that is not a boolean (hand-edited
 * or corrupt payload) both mean "off"; the mode is experimental and must never
 * turn on by accident. Only the literal `true` enables it.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function normalizeColorMode(value) {
  return value === true
}

/**
 * Turn arbitrary parsed JSON into a legal `{ light, dark, colorMode }` state.
 *
 * Pure: it never reads storage, never mutates the input, and always returns a
 * new object. An object with an unknown `version` (or with no version at all)
 * falls back to the default state; with a known version each field is
 * validated independently so one bad field does not discard the others.
 *
 * @param {unknown} raw - result of `JSON.parse()` or anything else.
 * @returns {{ light: string, dark: string, colorMode: boolean }}
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
 * object. Two invalid strengths collapse to the shipped default pairing, and a
 * missing/invalid `colorMode` is `false`. `colorMode` is validated here too
 * because the Host `Config` carries it as a third volatile field since 0.4.0;
 * the boot hint simply never publishes it (see `bootHintState`).
 *
 * @param {unknown} raw - anything, usually a plain object.
 * @returns {{ light: string, dark: string, colorMode: boolean }}
 */
export function normalizeStrengths(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultState()
  return {
    light: normalizeStrength(raw.light, DEFAULT_STATE.light),
    dark: normalizeStrength(raw.dark, DEFAULT_STATE.dark),
    colorMode: normalizeColorMode(raw.colorMode),
  }
}

/**
 * Serialize a state into the stored payload shape.
 *
 * The version is always the current one and every field is normalized first,
 * so a caller passing a hostile/incomplete object still writes a legal payload.
 * `colorMode` is written explicitly (even when `false`) so a later read never
 * has to guess whether the flag was dropped or disabled.
 *
 * @param {{ light: string, dark: string, colorMode?: boolean }} state
 * @returns {{ version: number, light: string, dark: string, colorMode: boolean }}
 */
function serializeState(state) {
  const legal = normalizeState({ version: STATE_VERSION, ...state })
  return {
    version: STATE_VERSION,
    light: legal.light,
    dark: legal.dark,
    colorMode: legal.colorMode,
  }
}

/**
 * Best-effort write of the default state used when reading found garbage.
 * @param {Storage} storage
 * @returns {{ light: string, dark: string, colorMode: boolean }}
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
 * 0.3.x payload without `colorMode` is valid and reads as `colorMode: false`
 * without a rewrite.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ light: string, dark: string, colorMode: boolean }}
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
 * `colorMode` may be absent (0.3.x cache) or boolean (0.4.x cache); any other
 * type is corrupt data, not a value to silently coerce.
 *
 * @param {unknown} parsed
 * @returns {boolean}
 */
function isStoredState(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  if (parsed.version !== STATE_VERSION) return false
  const colorModeValid = parsed.colorMode === undefined || typeof parsed.colorMode === 'boolean'
  return (
    colorModeValid
    && typeof parsed.light === 'string'
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
 * document. A 0.3.x payload without `colorMode` reads as `colorMode: false`
 * (the flag simply did not exist); a non-boolean flag makes the whole payload
 * untrustworthy, so it reports `null` instead. Never throws; a
 * missing/unreadable/malformed entry returns `null`.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ version: number, light: string, dark: string, colorMode: boolean } | null}
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
    colorMode: normalizeColorMode(parsed.colorMode),
  }
}

/**
 * Persist the state.
 *
 * Accepts a plain `{ light, dark, colorMode }` (the shape used inside the
 * client) and stores it with the schema version; a missing or invalid
 * `colorMode` is stored as `false`. Writing never throws: a failure (private
 * mode, quota, no storage) is reported as `false` and the caller keeps the
 * in-memory state.
 *
 * @param {{ light: string, dark: string, colorMode?: boolean }} state
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
 * Restore the default state (Enchanted's dark soft / light hard, color mode
 * off) and persist it. Returns the state even when the write fails.
 *
 * @param {Storage} [storage] - defaults to `globalThis.localStorage`.
 * @returns {{ light: string, dark: string, colorMode: boolean }}
 */
export function resetState(storage) {
  const fallback = createDefaultState()
  writeState(fallback, storage)
  return fallback
}
