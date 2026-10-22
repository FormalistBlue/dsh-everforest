/**
 * Host half of the dsh-everforest bundle.
 *
 * It does three jobs:
 *
 *  1. Carry the Loader plugin row that owns the `dsh.client` declaration and
 *     the Plugin Manager display metadata (why the bundle needs a Host half at
 *     all).
 *  2. Declare the durable strength configuration (`Config`, re-exported from
 *     `src/host-config.js`): DSH's settings service projects its volatile
 *     fields into the form the Client edits through `ctx.configForms`. The
 *     values persist in the active profile's `cordis.patch.yml`, so every
 *     browser of that profile shares one choice instead of each origin
 *     keeping its own `localStorage` copy.
 *  3. Contribute the **first-paint palette row** to DSH's boot HTML.
 *
 * Why (3) exists: before any Client plugin loads, DSH colors the document from
 * `webserver/index-inject` rows. ui-theme ships the last word there — a head
 * `<style>` with the literal native canvas (`#fff` / `#151517`) and a body
 * `<script>` that sets `data-ds-theme-source` / `data-ds-dark-theme`. The
 * Everforest token layer only arrives later, with this plugin's Client half,
 * so a cold start paints the native palette first (loading page included).
 *
 * The row added here runs **after** ui-theme's rows (its listener is registered
 * with `{ prepend: true }`, ours is appended) and writes the boot subset of the
 * palette as body inline custom properties, using the same `tokensFor()` table
 * the Client half installs. The Client ThemePresenter overwrites exactly those
 * properties on its first apply, so the values cannot outlive a healthy plugin;
 * if the Client half never loads they keep the loading palette for that page.
 *
 * The row is plain JSON data: the same table feeds the served index HTML (Web)
 * and the page-side boot interpreter that Desktop receives over IPC, so the
 * script is generated as text here and must stay a JSON-safe string.
 *
 * First-paint source order (decision B, 2026-10-22): the script paints from the
 * browser's `localStorage` cache first and falls back to the Host value embedded
 * at emit time, then to the shipped defaults. The cache wins because it is
 * always at least as fresh as a Desktop boot payload (which is collected once
 * when the Host becomes ready and never refreshed); the Host value covers a
 * fresh browser profile, a cleared cache, or a new random Web port. Either way
 * the Client half adopts the Host document as the authority once it loads, and
 * the script publishes the resolved pair on `window.__EVERFOREST_BOOT__` so the
 * Client's very first render starts from the same pair instead of flashing the
 * default.
 *
 * Constraints kept deliberately:
 *  - body inline properties, never a `<style>` with `!important`: inline
 *    properties are what ThemePresenter writes, so the Client layer wins;
 *  - only tokens emitted by `tokensFor()`, so every row value is replaced by
 *    the Client layer (a stale extra property could survive a scheme switch);
 *  - the scheme comes from ui-theme's resolved boot attributes, not from
 *    `prefers-color-scheme` alone — a fixed Light appearance on a Dark OS must
 *    paint Light on the first frame too;
 *  - no `</script` sequence and no user-controlled values inside the string:
 *    the Host values are re-validated against the strength enum and embedded
 *    through an escape helper.
 */
import { DEFAULT_STATE, STRENGTHS } from './src/palette.js'
import { ENTRY_ID, SCHEMES, Config, hostState } from './src/host-config.js'
import { STORAGE_KEY, STATE_VERSION } from './src/state.js'
import { tokensFor } from './src/tokens.js'

/** Re-exported so the Loader and the settings service see the schema. */
export { Config, ENTRY_ID }

/** Console prefix for Host-side diagnostics. */
const LOG_PREFIX = '[everforest]'

/**
 * The palette tokens painted before the Client half loads. Every name is also
 * emitted by `tokensFor()`, which is what lets ThemePresenter replace them on
 * its first apply. The subset is what the boot page and the first window paint
 * consume: canvas, three label levels, the code-block canvas the boot page does
 * not use but a first React frame could, the sidebar fill that also seeds the
 * Windows native caption probe, and the loading spinner's two colours — the
 * ring (`border-l2`) and the progress arc (`brand-primary`), which the spinner
 * CSS resolves through `var(--dsw-alias-*, …)` with no local override.
 * @type {string[]}
 */
export const BOOT_TOKENS = Object.freeze([
  '--dsw-alias-bg-base',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-markdown-code-block',
  '--dsw-specific-sidebar-fill',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary'
])

/** Browser global carrying the resolved first-paint pair to the Client half. */
const BOOT_HINT_GLOBAL = '__EVERFOREST_BOOT__'

/**
 * Build the `{ 'light-hard': [...], …, 'dark-soft': [...] }` value table.
 *
 * A variant only depends on its own scheme's ramp, so both schemes are resolved
 * with the same strength and the needed side is picked out of the pair. The
 * table is the bridge between the Client token layer and the boot row: tests
 * assert every embedded value equals `tokensFor()` for that variant.
 * @returns {Record<string, string[]>}
 */
function bootValues () {
  const table = {}
  for (const strength of STRENGTHS) {
    const overlay = tokensFor({ light: strength, dark: strength })
    for (const scheme of SCHEMES) {
      table[`${scheme}-${strength}`] = BOOT_TOKENS.map((name) => overlay[name][scheme])
    }
  }
  return table
}

/**
 * JSON-escape a value for inline embedding in the boot script.
 *
 * The values are already restricted to the palette table and the strength enum,
 * but the helper is the one place that guarantees the generated text can never
 * terminate its surrounding `<script>` element or smuggle a line terminator.
 * @param {unknown} value
 * @returns {string}
 */
function embed (value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Normalize a candidate first-paint pair: every field is validated on its own
 * against the supported set and falls back to the shipped default.
 * @param {{ light?: unknown, dark?: unknown }} [candidate]
 * @returns {{ light: string, dark: string }}
 */
function normalizePair (candidate) {
  const pair = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
  if (candidate === null || typeof candidate !== 'object') return pair
  for (const scheme of SCHEMES) {
    const value = candidate[scheme]
    if (typeof value === 'string' && STRENGTHS.includes(value)) pair[scheme] = value
  }
  return pair
}

/**
 * Generate the body script contributed through `webserver/index-inject`.
 *
 * Called once per emit: the Host values are read fresh at emit time, while the
 * browser-side cache is read when the script executes (that is the point of
 * B — a Desktop boot payload is frozen at Host-ready, the cache is not).
 *
 * Written in ES5 syntax because it runs in the page, not in the Host; wrapped
 * in try/catch because storage may be blocked and a failed boot paint must
 * never break the boot.
 *
 * @param {{ light: string, dark: string }} [hostPair] - Host-backed pair to use
 *   when the browser cache is missing or invalid.
 * @returns {string}
 */
export function createBootScript (hostPair) {
  const fallback = normalizePair(hostPair)
  return `(function () {
  try {
    var state = ${embed(fallback)}
    try {
      var raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(${embed(STORAGE_KEY)})
      if (typeof raw === 'string') {
        var parsed = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && parsed.version === ${STATE_VERSION}) {
          var valid = ${embed(STRENGTHS)}
          if (valid.indexOf(parsed.light) !== -1) state.light = parsed.light
          if (valid.indexOf(parsed.dark) !== -1) state.dark = parsed.dark
        }
      }
    } catch (error) {}
    try {
      window.${BOOT_HINT_GLOBAL} = { version: ${STATE_VERSION}, light: state.light, dark: state.dark }
    } catch (error) {}
    if (typeof document === 'undefined' || document.body === null) return
    var body = document.body
    var root = document.documentElement
    var source = root && root.getAttribute ? root.getAttribute('data-ds-theme-source') : null
    var dark = body.hasAttribute('data-ds-dark-theme')
    if (source === null) {
      // ui-theme's boot row did not run (older composition): resolve the OS the
      // same way its boot body script does.
      dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    }
    var scheme = dark ? 'dark' : 'light'
    var values = ${embed(bootValues())}[scheme + '-' + state[scheme]]
    if (values === undefined) return
    var names = ${embed(BOOT_TOKENS)}
    for (var index = 0; index < names.length; index += 1) body.style.setProperty(names[index], values[index])
  } catch (error) {}
})()`
}

/**
 * Register the Host settings presentation and the first-paint row.
 *
 * `settings.configure({ auto: false }, ctx.fiber)` tells the settings service
 * this instance renders its own page (the Client `settings.section`), so the
 * Plugins settings area does not grow an auto-generated duplicate; the call is
 * optional wiring — a profile without the settings service simply keeps the
 * localStorage behavior.
 *
 * `webserver/index-inject` is emitted per index render (Web) and once for the
 * Desktop boot payload; a composition without a web server simply never calls
 * the listener. ui-theme registers its own rows with `{ prepend: true }`, so
 * appending here guarantees ui-theme's resolved scheme attributes exist by the
 * time this script runs.
 *
 * @param {import('cordis').Context} ctx - Host plugin context.
 * @param {{ light?: unknown, dark?: unknown }} [config] - parsed volatile config.
 */
export function apply (ctx, config) {
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['settings'], (child) => {
        try {
          child.effect(() => {
            try {
              return child.settings.configure({ auto: false }, ctx.fiber)
            } catch (error) {
              console.warn(`${LOG_PREFIX} could not mark the built-in Settings page as replaced`, error)
              return undefined
            }
          }, 'everforest: settings presentation')
        } catch (error) {
          console.warn(`${LOG_PREFIX} could not register the settings presentation`, error)
        }
      })
    } catch (error) {
      console.warn(`${LOG_PREFIX} settings service is unavailable; the strength stays localStorage-only`, error)
    }
  }

  ctx.on('webserver/index-inject', (table) => {
    if (!Array.isArray(table)) return
    // Read the volatile references at emit time: the Loader updates them in
    // place when the profile patch changes, without remounting the plugin.
    table.push({ kind: 'script', placement: 'body', text: createBootScript(hostState(config)) })
  })
}
