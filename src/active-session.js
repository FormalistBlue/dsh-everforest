// Everforest "active session" surface for the DSH workspace list.
//
// DSH paints the selected session row with the *hover* token:
//
//   .wnFoaW_sessionRow:hover,
//   .wnFoaW_sessionRow.wnFoaW_selected { background: var(--dsw-alias-interactive-bg-hover) }
//
// (ui-workspace `Rows` CSS module, verified against the installed 0.2.1-rc.3
// bundle and the live DOM). That token is a 16% alpha overlay of the ramp
// border colour, which is only a ~2.6 L* step away from the sidebar fill — in
// both schemes the open session is hard to find, and it is indistinguishable
// from hovering any other row (2026-10-24 user report). DSH exposes no
// dedicated "selected row" token, so this module emits one always-on rule on
// the row's stable `aria-selected` anchor and paints it with a palette surface
// instead.
//
// Why the blue surface: the color mode already spends `bg_red` on "waiting for
// the user" and `bg_green` on "finished, not read" session rows, so the active
// row must avoid those two hues. `bg_blue` is the remaining semantic background
// of Everforest's palette1, and blue is also DSH's business/primary accent, so
// "this is the session you have open" rides an existing meaning instead of
// inventing one.
//
// Visibility vs legibility: the palette value alone is a strong step in the
// dark schemes but only a hue tint in the light ones. The fill is therefore
// blended toward `fg.blue` until it is `ACTIVE_SESSION_SEPARATION` L* away from
// the sidebar fill, and the blend stops before `label-primary` drops under the
// 4.5:1 text gate. In light·soft the sidebar itself already sits on the 4.5:1
// gate (`docs/reference/contrast.md`), so that push has no headroom: the row
// keeps the palette hue with the small L* step the gate allows. That ceiling is
// the same one documented for the color-mode rows (design doc §13.7 / §15).
//
// Always-on and independent of the color mode: this is navigation, not content
// colouring, and it has to work with the mode off. The six rules are keyed by
// the strength attributes the token layer always writes on <html> plus DSH's own
// `body[data-ds-dark-theme]` flag — the same pattern as `src/selection.js`.
//
// The row anchor is `[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`,
// the attributes `src/color-mode.js` already relies on. Deliberately *not* the
// hashed `wnFoaW_*` classes: `aria-selected` is an accessibility contract, the
// class names are CSS-module build output.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { contrastRatio, labLightness, mix } from './color.js'
import { tokensFor } from './tokens.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The row that carries the workspace's open session. */
export const ACTIVE_SESSION_ROW =
  '[role="treeitem"][data-row-key^="session:"][aria-selected="true"]'

/** Minimum contrast for `label-primary` on the active row fill (WCAG AA body text). */
export const ACTIVE_SESSION_INK_CONTRAST = 4.5

/**
 * Minimum perceptual (CIE L*) distance between the active row fill and the
 * sidebar fill. 4.5 is about the smallest step that still reads as a distinct
 * band at row height; the CSS guards cap it where the text gate runs out first.
 */
export const ACTIVE_SESSION_SEPARATION = 4.5

/** Palette background accent the active row starts from. */
const ACTIVE_FILL_SOURCE = 'bgBlue'

/** Step of the accent blend used to reach the separation target (1% per step). */
const ACCENT_STEP = 0.01

/**
 * Pull a fill toward the scheme canvas (`bg0`) until `label-primary` reaches
 * `ACTIVE_SESSION_INK_CONTRAST`. Blending toward `bg0` is safe in both
 * directions (dark canvases darken the fill, light canvases lighten it), so the
 * guard never guesses a direction — the same rule the color-mode row fills use.
 * @param {string} color - palette background accent.
 * @param {string} bg0 - the scheme's canvas colour.
 * @param {string} ink - text colour the surface must stay readable with.
 * @returns {string}
 */
function readableFill (color, bg0, ink) {
  if (contrastRatio(ink, color) >= ACTIVE_SESSION_INK_CONTRAST) return color
  for (let weight = ACCENT_STEP; weight <= 1.0001; weight += ACCENT_STEP) {
    const next = mix(color, bg0, weight)
    if (contrastRatio(ink, next) >= ACTIVE_SESSION_INK_CONTRAST) return next
  }
  return mix(color, bg0, 1)
}

/**
 * Push the fill toward the blue accent until it is `ACTIVE_SESSION_SEPARATION`
 * L* away from the sidebar, keeping the last step that still passes the text
 * gate. Returns the fill untouched when the palette value already clears the
 * separation (the dark schemes) or when the text gate leaves no headroom
 * (light·soft).
 * @param {string} fill - guarded palette fill.
 * @param {string} sidebar - the sidebar surface the row sits on.
 * @param {string} ink - text colour of the row.
 * @param {string} accent - `fg.blue` of the scheme.
 * @returns {string}
 */
function separatedFill (fill, sidebar, ink, accent) {
  const distance = (color) => Math.abs(labLightness(color) - labLightness(sidebar))
  if (distance(fill) >= ACTIVE_SESSION_SEPARATION) return fill
  let best = fill
  for (let weight = ACCENT_STEP; weight <= 1.0001; weight += ACCENT_STEP) {
    const next = mix(fill, accent, weight)
    if (contrastRatio(ink, next) < ACTIVE_SESSION_INK_CONTRAST) break
    best = next
    if (distance(next) >= ACTIVE_SESSION_SEPARATION) return next
  }
  return best
}

/**
 * Compute the active-row fill of one palette variant.
 * @param {string} scheme - `light` or `dark`.
 * @param {string} strength - `hard`, `medium` or `soft`.
 * @returns {string} opaque `#RRGGBB`.
 */
function activeFillFor (scheme, strength) {
  const state = { ...DEFAULT_STATE, [scheme]: strength }
  const palette = resolvePalette(state)[scheme]
  const overlay = tokensFor(state)
  const pick = (name) => {
    const entry = overlay[name]
    if (!entry) throw new Error(`activeSessionRoles: tokensFor() has no ${name}`)
    return entry[scheme]
  }
  const ink = pick('--dsw-alias-label-primary')
  const sidebar = pick('--dsw-specific-sidebar-fill')
  const source = palette.ramp[ACTIVE_FILL_SOURCE]
  if (!source) throw new Error(`activeSessionRoles: the palette has no ${ACTIVE_FILL_SOURCE}`)
  const readable = readableFill(source, palette.ramp.bg0, ink)
  return separatedFill(readable, sidebar, ink, palette.fg.blue)
}

/**
 * The six active-row fills, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, { fill: string }>} keyed `light-hard` … `dark-soft`.
 */
export function activeSessionRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = { fill: activeFillFor(scheme, strength) }
    }
  }
  return roles
}

/**
 * One active-row rule for a scheme + strength.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} fill
 * @returns {string}
 */
function activeSessionRule (scheme, strength, fill) {
  const scope = scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
  return `${scope} ${ACTIVE_SESSION_ROW} {\n  background-color: ${fill};\n}`
}

/**
 * The complete active-row stylesheet (six rules, one per variant).
 * @returns {string}
 */
export function activeSessionStyles () {
  const roles = activeSessionRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      activeSessionRule(scheme, strength, roles[`${scheme}-${strength}`].fill)
    ))
    .join('\n\n')
}
