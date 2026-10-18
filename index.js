/**
 * Host half of the dsh-everforest bundle.
 *
 * It does two jobs:
 *
 *  1. Carry the Loader plugin row that owns the `dsh.client` declaration and
 *     the Plugin Manager display metadata (why the bundle needs a Host half at
 *     all).
 *  2. Contribute the **first-paint palette row** to DSH's boot HTML.
 *
 * Why (2) exists: before any Client plugin loads, DSH colors the document from
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
 * Constraints kept deliberately:
 *  - body inline properties, never a `<style>` with `!important`: inline
 *    properties are what ThemePresenter writes, so the Client layer wins;
 *  - only tokens emitted by `tokensFor()`, so every row value is replaced by
 *    the Client layer (a stale extra property could survive a scheme switch);
 *  - the scheme comes from ui-theme's resolved boot attributes, not from
 *    `prefers-color-scheme` alone — a fixed Light appearance on a Dark OS must
 *    paint Light on the first frame too;
 *  - no `</script` sequence and no user-controlled values inside the string.
 */
import { DEFAULT_STATE, STRENGTHS } from './src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from './src/state.js'
import { tokensFor } from './src/tokens.js'

/**
 * The palette tokens painted before the Client half loads. Every name is also
 * emitted by `tokensFor()`, which is what lets ThemePresenter replace them on
 * its first apply. The subset is what the boot page and the first window paint
 * consume: canvas, three label levels, the code-block canvas the boot page does
 * not use but a first React frame could, and the sidebar fill that also seeds
 * the Windows native caption probe.
 * @type {string[]}
 */
export const BOOT_TOKENS = Object.freeze([
  '--dsw-alias-bg-base',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-markdown-code-block',
  '--dsw-specific-sidebar-fill'
])

/** Schemes, in token-layer order. */
const SCHEMES = ['light', 'dark']

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
 * Generate the body script contributed through `webserver/index-inject`.
 *
 * Written in ES5 syntax because it runs in the page, not in the Host; wrapped
 * in try/catch because storage may be blocked and a failed boot paint must
 * never break the boot.
 * @returns {string}
 */
export function createBootScript () {
  const defaults = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
  return `(function () {
  try {
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
    var state = ${JSON.stringify(defaults)}
    try {
      var raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(${JSON.stringify(STORAGE_KEY)})
      if (typeof raw === 'string') {
        var parsed = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && parsed.version === ${STATE_VERSION}) {
          var valid = ${JSON.stringify(STRENGTHS)}
          if (valid.indexOf(parsed.light) !== -1) state.light = parsed.light
          if (valid.indexOf(parsed.dark) !== -1) state.dark = parsed.dark
        }
      }
    } catch (error) {}
    var scheme = dark ? 'dark' : 'light'
    var values = ${JSON.stringify(bootValues())}[scheme + '-' + state[scheme]]
    if (values === undefined) return
    var names = ${JSON.stringify(BOOT_TOKENS)}
    for (var index = 0; index < names.length; index += 1) body.style.setProperty(names[index], values[index])
  } catch (error) {}
})()`
}

/**
 * Mount the Host half: contribute the first-paint palette row.
 *
 * `webserver/index-inject` is emitted per index render (Web) and once for the
 * Desktop boot payload; a composition without a web server simply never calls
 * the listener. ui-theme registers its own rows with `{ prepend: true }`, so
 * appending here guarantees ui-theme's resolved scheme attributes exist by the
 * time this script runs.
 * @param {import('cordis').Context} ctx - Host plugin context.
 */
export function apply (ctx) {
  const text = createBootScript()
  ctx.on('webserver/index-inject', (table) => {
    if (!Array.isArray(table)) return
    table.push({ kind: 'script', placement: 'body', text })
  })
}
