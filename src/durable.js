/**
 * Client-side glue between the localStorage cache and the Host-backed settings
 * form (pure logic only — `src/client-entry.js` owns the effects).
 *
 * DSH's settings service projects a plugin's volatile `Config` fields into a
 * form named by the **profile entry id**. The Client reaches it through
 * `ctx.configForms.get(entryId)`; each snapshot is
 * `{ status, value, base, user, revision, writable }`:
 *
 *  - `value` — the effective section (defaults merged with the profile patch);
 *  - `base` — the inherited layer (defaults from the bundle/config layers);
 *  - `user` — the profile patch's own override. **Absent arrives as `{}`, not
 *    `undefined`**, because `configEditor.configuration()` defaults the
 *    override to an empty object. "Does the user have a Host choice?" therefore
 *    needs `hasUserLayer`, not a truthiness test;
 *  - `revision` — a Host-side counter used to refuse stale writes;
 *  - `writable` — whether the active profile accepts form edits.
 *
 * The Host state is `{ light, dark }`: the two palette strengths. Color mode
 * ships as a default feature with no switch (2026-10-24), so it is not a
 * durable preference (and a 0.4.x section that still carries the retired
 * `colorMode` flag is read as the same two strengths — extra keys are ignored).
 *
 * Writes are atomic mutations: `form.mutate([...ops])`, ops being
 * `{ op: 'set', path: [field], value }` or `{ op: 'unset', path: [field] }`.
 * `unset` restores the inherited value and lets the config editor remove the
 * now-redundant override row; `reset` uses it so a "restore defaults" really
 * clears the stored choice instead of persisting the default explicitly.
 *
 * `ENTRY_ID` is a contract with `cordis.patch.yml` (`- id: everforest`). The
 * Client and the Host half each own a copy of the constant (the bundle cannot
 * import the schemastery-importing Host module), and a test pins all three
 * together.
 *
 * The module stays free of `window` / storage side effects: it is bundled into
 * `client.js` AND imported directly by `node --test`.
 */

import { DEFAULT_STATE } from './palette.js'
import { normalizeStrengths, STATE_VERSION } from './state.js'

/** Profile entry id owning the settings form (see `cordis.patch.yml`). */
export const ENTRY_ID = 'everforest'

/**
 * Whether a snapshot's `user` layer carries at least one Host-stored choice.
 *
 * The settings service reports "no override" as `{}` (never `undefined`), so
 * presence of the object says nothing; a non-empty key set does. A 0.4.x patch
 * that only ever stored the retired `colorMode` flag still counts as a user
 * layer — its strengths are the shipped defaults, which is what the section
 * resolves to anyway.
 *
 * @param {unknown} user - the snapshot's `user` layer.
 * @returns {boolean}
 */
export function hasUserLayer(user) {
  return typeof user === 'object' && user !== null && !Array.isArray(user) && Object.keys(user).length > 0
}

/**
 * Normalize a Host config section (`value`) into a legal local state.
 *
 * Each strength is validated independently against the supported set; a
 * missing or invalid field falls back to that scheme's shipped default. The
 * retired `colorMode` key of a 0.4.x section is ignored.
 *
 * @param {unknown} value - the snapshot's effective section.
 * @returns {{ light: string, dark: string }}
 */
export function stateFromHost(value) {
  return normalizeStrengths(value)
}

/**
 * Compare two full states (both strengths).
 * @param {{ light: string, dark: string }} a
 * @param {{ light: string, dark: string }} b
 * @returns {boolean}
 */
export function statesEqual(a, b) {
  return a.light === b.light && a.dark === b.dark
}

/**
 * Whether a state is exactly the shipped default (no real user choice).
 *
 * That means both strengths are the default pairing.
 *
 * @param {{ light: string, dark: string }} state
 * @returns {boolean}
 */
export function isDefaultState(state) {
  return state.light === DEFAULT_STATE.light && state.dark === DEFAULT_STATE.dark
}

/**
 * One atomic mutation that stores both strengths.
 *
 * Both fields travel together on purpose: one revision acknowledgement covers
 * the whole choice, and a later read can never see a half-written state.
 *
 * @param {{ light: string, dark: string }} state
 * @returns {Array<{ op: 'set', path: string[], value: string }>}
 */
export function stateToSetOps(state) {
  return [
    { op: 'set', path: ['light'], value: state.light },
    { op: 'set', path: ['dark'], value: state.dark },
  ]
}

/**
 * One atomic mutation that clears all stored overrides, restoring the
 * inherited (shipped) state and letting the config editor drop the row.
 * @returns {Array<{ op: 'unset', path: string[] }>}
 */
export function stateToUnsetOps() {
  return [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
  ]
}

/**
 * Decide whether this load should migrate the browser cache into the Host.
 *
 * A one-shot migration only: the Host has no choice yet, and the cache holds a
 * real choice from an older version (non-default strengths). Seeding the
 * shipped default would be pointless (it is what the Host resolves anyway) and
 * would leave a redundant override row behind.
 *
 * @param {unknown} user - the snapshot's `user` layer.
 * @param {{ light: string, dark: string } | null} cached - `readStoredState()`.
 * @returns {boolean}
 */
export function shouldSeed(user, cached) {
  if (hasUserLayer(user)) return false
  if (cached === null) return false
  return !isDefaultState(cached)
}

/**
 * Validate the first-paint pair published by the Host boot row.
 *
 * The Client starts from this hint rather than from `readState()` so that a
 * fresh browser profile (no cache) still renders the Host-backed pair on its
 * very first frame instead of flashing the shipped default until the
 * asynchronous `configForms` snapshot arrives.
 *
 * @param {unknown} hint - `window.__EVERFOREST_BOOT__`.
 * @returns {{ light: string, dark: string } | null} `null` when the Host half
 *   did not run (old bundle) or published an unexpected shape.
 */
export function bootHintState(hint) {
  if (hint === null || typeof hint !== 'object' || Array.isArray(hint)) return null
  if (hint.version !== STATE_VERSION) return null
  const normalized = normalizeStrengths(hint)
  return { light: normalized.light, dark: normalized.dark }
}
