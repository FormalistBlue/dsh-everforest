// Ink for DSH's built-in home whale: the click-triggered "pixel whale" that
// breaches across the blank new-session home. It is the official
// `@deepseek-ai/dsh-client-ui-brand-official` decoration (occupant `pixel-whale`
// of the `conversation.hero.frame` layer, verified against the installed
// 0.2.2-rc.2 client bundle), not something this theme draws.
//
// The official canvas carries
//
//   .canvas {
//     --home-whale-code-ink: var(--dsw-alias-label-primary);
//     color: var(--dsw-alias-label-secondary);
//     filter: grayscale(1);
//     opacity: 0.18;
//   }
//
// and the renderer reads both inks off that canvas: the dot fill paints with
// `getComputedStyle(canvas).color`, the code-letter fill with the custom
// property (`--home-whale-code-ink`); both are re-read on the layout/theme
// resize the renderer observes. The `grayscale(1)` filter then throws the hue
// away, so re-inking alone changes nothing — the filter has to be cancelled
// together with the ink.
//
// 2026-11-13 request (the user had just seen the whale and asked "可以把这个改个
// 颜色吗？"): the palette **text green** `green` was picked from the offered
// options (light `#8DA101`, dark `#A7C080`) — the same role the hero mark and its
// "探索未至之境" headline already take (`src/hero-title.js`), so the background
// whale and the mark above it read as one colour. Both fills take the green; the
// official relative weight (code lettering slightly stronger than the dots) comes
// from the renderer's own opacity factors, not from the ink.
//
// The layer opacity: the official 0.18 read as too faint once the whale turned
// green (2026-11-13 follow-up: "有点太淡了，稍微把透明度调高一点试试"), so the
// sheet raises it to `HOME_WHALE_OPACITY` (0.3 — 5/3 of the official value, still
// a background texture that never competes with the headline or the composer).
//
// The anchor is the canvas's own `data-home-whale` attribute (the module class
// name is a build hash), scoped with the same `html[data-everforest-*]` +
// `body[data-ds-dark-theme]` pattern as the other always-on sheets. Chrome,
// independent of the color mode; the token layer is untouched.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/**
 * The home-whale canvas. `data-home-whale` is DSH's own marker on the element
 * (`<canvas data-home-whale aria-hidden="true">`); the class beside it is a
 * CSS-module hash and must not be pinned.
 */
export const HOME_WHALE_CANVAS = 'canvas[data-home-whale]'

/** The custom property the code-letter fill reads off the canvas. */
export const HOME_WHALE_CODE_INK = '--home-whale-code-ink'

/**
 * The official canvas filter this sheet cancels. DSH desaturates the canvas, so
 * the palette hue only becomes visible once the filter is reset.
 */
export const HOME_WHALE_OFFICIAL_FILTER = 'grayscale(1)'

/**
 * The official layer opacity DSH ships on the canvas. Kept as the baseline the
 * theme's own value is measured against (and pinned in the tests), not applied.
 */
export const HOME_WHALE_OFFICIAL_OPACITY = 0.18

/**
 * The layer opacity this theme paints: the official 0.18 read as too faint once
 * the whale turned green (2026-11-13 follow-up: "有点太淡了，稍微把透明度调高一点
 * 试试"). 0.3 = 5/3 × official: clearly more present, still a background texture
 * that never competes with the headline or the composer.
 */
export const HOME_WHALE_OPACITY = 0.3

/**
 * The ink of one variant: the palette text green, untouched.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} opaque `#RRGGBB`.
 */
function homeWhaleInkFor (scheme, strength) {
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme].fg.green
}

/**
 * The six whale inks, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, string>} keyed `light-hard` … `dark-soft`.
 */
export function homeWhaleRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = homeWhaleInkFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body> — the same pattern as
 * `src/hero-title.js` and `src/work-steps.js`.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function scopeFor (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/**
 * One variant's rule: cancel the official desaturation, raise the layer opacity
 * and point both fills at the green. The custom property is declared on the
 * canvas itself, exactly where the official sheet declares it, so it wins on
 * specificity without `!important`.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} ink
 * @returns {string}
 */
function homeWhaleRule (scheme, strength, ink) {
  return [
    `${scopeFor(scheme, strength)} ${HOME_WHALE_CANVAS} {`,
    '  filter: none;',
    `  opacity: ${HOME_WHALE_OPACITY};`,
    `  color: ${ink};`,
    `  ${HOME_WHALE_CODE_INK}: ${ink};`,
    '}'
  ].join('\n')
}

/**
 * The complete home-whale ink stylesheet (six rules).
 * @returns {string}
 */
export function homeWhaleStyles () {
  const roles = homeWhaleRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      homeWhaleRule(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
