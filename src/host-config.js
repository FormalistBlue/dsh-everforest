/**
 * Host-side durable configuration for dsh-everforest.
 *
 * The strength pairing (`light` = Hard/Medium/Soft, `dark` = Hard/Medium/Soft)
 * used to live only in the browser's `localStorage`, so switching browsers or
 * opening the Web host on a fresh random port lost it. This module moves the
 * user's choice into DSH's own settings document instead — the active profile's
 * `cordis.patch.yml` gets a row
 *
 *     - id: everforest
 *       name: dsh-everforest
 *       config: { light: hard, dark: soft }
 *
 * and every authenticated browser of that profile reads it back through the
 * Client `ctx.configForms` service.
 *
 * The mechanism is the official one (`dsh-settings` scans active profile
 * entries for a `Config` schema and projects its **volatile** fields into a
 * form keyed by the entry id; `dsh-client-ui-settings` exposes
 * `configForms.get(entryId)` to the Client, and `dsh-config-editor` persists
 * writes into the profile patch). The Host half never reads the form itself:
 * its only jobs are to declare the schema and to serve the current values to
 * the first-paint boot row, which is why `hostState()` reads the volatile
 * references with `.get()` at emit time.
 *
 * `ENTRY_ID` is a contract with `cordis.patch.yml`: the Client can only address
 * the form by the profile entry id, so renaming the patch row without renaming
 * this constant silently degrades the plugin to localStorage-only. A test pins
 * the two together.
 *
 * `.volatile()` is what tells the settings service the fields are live-editable
 * without a plugin remount: the Loader commits new values into the running
 * references in place, and the boot row re-reads them on every index render.
 * It must be marked on the leaf fields, never on an object that also marks its
 * children: schemastery rejects volatile-inside-volatile. The capability guard
 * keeps module evaluation safe on a host whose schemastery predates
 * `volatile()` (3.18.3): such a host simply projects no form and the Client
 * falls back to `localStorage`.
 *
 * `strengthSchema()` builds a fresh node per call regardless: in schemastery
 * 3.18.5 `.volatile()` returns a marked view and leaves the receiver's own
 * metadata alone, but a marked node still must not be reused for a schema that
 * is supposed to stay plain (a legacy/plain schema and the live `Config` are
 * never mixed here).
 *
 * The `@deepseek-ai/schemastery` import is resolved by the DSH Host at runtime
 * from its own installation. It is deliberately **not** a package dependency
 * (that would install a second instance); the repository declares it as a
 * devDependency so `node --test` can exercise the real schema here.
 */
import Schema from '@deepseek-ai/schemastery'

import { DEFAULT_STATE, STRENGTHS } from './palette.js'

/**
 * Profile entry id that owns this plugin and therefore the settings form's
 * namespace. MUST stay in sync with the `id` in `cordis.patch.yml`.
 */
export const ENTRY_ID = 'everforest'

/** The two color schemes, in token-layer order. */
export const SCHEMES = ['light', 'dark']

/**
 * One live-editable strength field.
 *
 * A fresh node per call: `.volatile()` returns a marked node (and a node that
 * carries the mutable mark must not be reused where a plain schema is
 * expected), so the two scheme fields are always built independently.
 *
 * @param {string} fallback - shipped default for this scheme.
 * @returns {import('@deepseek-ai/schemastery').Schema} the field schema.
 */
function strengthSchema (fallback) {
  const node = Schema.union([...STRENGTHS]).default(fallback)
  return typeof node.volatile === 'function' ? node.volatile() : node
}

/**
 * Host `Config`: the durable strength pairing, one volatile field per scheme.
 *
 * The Loader validates a hand-edited profile patch against this schema. A cold
 * start (or remount) with an invalid value fails to activate the entry — the
 * same behavior as any built-in plugin — while a volatile-only edit on a
 * running Host is rejected by the Loader with a warning and keeps the previous
 * values. Either way the shipped defaults below are the only legal starting
 * point, and the boot row only ever embeds enum members.
 */
export const Config = Schema.object({
  light: strengthSchema(DEFAULT_STATE.light),
  dark: strengthSchema(DEFAULT_STATE.dark),
})

/**
 * Read the current values out of a parsed `apply(ctx, config)` argument.
 *
 * Volatile fields arrive as references that the Loader updates in place when
 * the profile patch changes, so this must be called at use time (each
 * `webserver/index-inject` emit) rather than once in `apply`. Values are
 * validated against the supported set again: `Config` already enforces it, but
 * the boot row is a security-sensitive string and must never embed anything
 * outside the enum.
 *
 * @param {unknown} config - the parsed config passed to `apply`, if any.
 * @returns {{ light: string, dark: string }} a fresh, validated state.
 */
export function hostState (config) {
  const state = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
  if (config === null || typeof config !== 'object') return state
  for (const scheme of SCHEMES) {
    const field = config[scheme]
    let value
    try {
      value = field !== null && typeof field === 'object' && typeof field.get === 'function'
        ? field.get()
        : field
    } catch {
      continue
    }
    if (typeof value === 'string' && STRENGTHS.includes(value)) state[scheme] = value
  }
  return state
}
