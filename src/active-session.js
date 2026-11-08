// Everforest "active session" surface for the DSH workspace list.
//
// DSH paints the selected session row with the *hover* token:
//
//   .wnFoaW_sessionRow:hover,
//   .wnFoaW_sessionRow.wnFoaW_selected { background: var(--dsw-alias-interactive-bg-hover) }
//
// (ui-workspace `Rows` CSS module, verified against the installed bundle and the
// live DOM). That token is a 16% alpha overlay of the ramp border colour, which
// is only a ~2.6 L* step away from the sidebar fill — in both schemes the open
// session is hard to find, and it is indistinguishable from hovering any other
// row (2026-10-24 user report). DSH exposes no dedicated "selected row" token,
// so this module emits one always-on rule on the row's stable `aria-selected`
// anchor and paints it with the theme accent instead.
//
// Why the solid green surface: the row marks "this is the session you have open",
// i.e. the theme's interaction / active accent. That is Everforest's
// `statusline1` — upstream's own "Menu Selection Background / Tab Line Label
// Background (active)" colour: `#A7C080` dark (identical to `green`) and
// `#93B259` light. 2026-11-08 third accent pass (design §23.1): the user cropped
// the very same reference tab (light soft canvas `#F3EAD3` around a `#93B259`
// band) and asked for "浅绿色", so the light schemes use `statusline1` instead of
// the olive `green` `#8DA101` — one accent green per scheme for *backgrounds*:
// the selected row, the selected dropdown option fill and the primary buttons.
// (The 2026-11-08 palette review, A7, kept this surface; the conversation title
// and workspace folder names later came back as green *text*, which uses the
// palette foreground `green` instead — same hex in the dark schemes, the
// deeper `#8DA101` in the light ones.) The
// fill is the palette value verbatim — no tint, no opacity, no blend — and the
// text is the scheme canvas `bg0`, the same "accent fill + canvas ink" pairing
// the rest of the accent layer uses (buttons, badge). The earlier "accent tint
// mixed into the canvas + 3px marker bar" design is gone (green is now reserved
// for the open session: the color mode's "finished, not read" rows use palette1
// `bg_blue`).
//
// Visibility vs legibility: the solid accent band is strong in every variant.
// In the dark schemes the canvas ink is a WCAG AA pair (5.6–6.9:1). In the light
// schemes the same "accent + bg0" pairing is softer (2.00–2.32:1) — that is what
// the reference tab itself does (cream ink on `statusline1`), and the trade-off is
// recorded in `docs/reference/contrast.md` §2g rather than silently guarded away.
//
// The row's own children restate their `label-tertiary` / `label-caption`
// colours: the leading status slot, the trailing time cell (wrapped in DSH's
// `rowResting` cell), the pin marker and the hover action buttons. On the solid
// accent band those greys collapse to ~1.2–1.6:1, so the rules paint the canvas
// ink onto every child cell that carries its own grey, *explicitly* — an
// `inherit` chain is not enough because `rowResting` / `rowActions` set their own
// `label-tertiary` (2026-11-08 bug: the selector list was built with the scope
// prefix repeated in every entry, so only the direct-child rule matched and the
// time / pin / action cells stayed grey — see `tests/active-session.test.mjs`).
// The status *dots* keep their semantic colour (`[data-state]` rules in
// `src/color-mode.js`): they are standalone glyphs whose hue carries the session
// state, not text on the band, so the `svg` hook excludes `[data-state]`. The one
// exception is the *neutral* loading spinner: ui-primitives'
// `StateDot(state="ongoing")` is an `<svg data-state="ongoing">` ring painted
// `label-tertiary` (a grey, not a semantic hue), so on the band it collapsed into
// an almost invisible circle (`grey2` = 1.22–1.39:1 — 2026-11-08 report:
// "整块高亮的时候，前面这个转圈的图标显示不明显"). It gets the band ink like the
// other chrome; `done` / `warning` / `error` dots keep their hues.
//
// Row action buttons (the "…" menu, archive, pin and any plugin-contributed
// row action such as a reminder bell) need a third rule: DSH / third-party
// primitives paint a hovered ghost button with a *solid* surface token
// (`--dsw-alias-button-ghost-active-fill` / `interactive-bg-hover-solid` = `bg2`),
// which assumes a normal row background and shows up as an opaque slate square on
// the solid band — while the ink-coloured glyph sits on top of it (2026-11-08
// user report: "这个铃铛 hover 的时候显示还有点问题"). The rule replaces that fill
// with a 16% wash of the band ink and points the focus ring at the ink too (DSH's
// ring defaults to the accent, which is invisible on an accent band).
//
// Always-on and independent of the color mode: this is navigation, not content
// colouring, and it has to work with the mode off. The eighteen rules (three per
// variant) are keyed by the strength attributes the token layer always writes on
// <html> plus DSH's own `body[data-ds-dark-theme]` flag — the same pattern as
// `src/selection.js`.
//
// The row anchor is `[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`,
// the attributes `src/color-mode.js` already relies on. Deliberately *not* the
// hashed `wnFoaW_*` classes: `aria-selected` is an accessibility contract, the
// class names are CSS-module build output.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'
import { alpha } from './color.js'

/** The row that carries the workspace's open session. */
export const ACTIVE_SESSION_ROW =
  '[role="treeitem"][data-row-key^="session:"][aria-selected="true"]'

/**
 * The always-on (color-mode independent) stylesheet's rules are the three blocks
 * emitted per variant: the row band itself, the ink for the children DSH gives
 * its own grey colours, and the hover / focus paint of the row's action buttons.
 */
export const ACTIVE_SESSION_RULES_PER_VARIANT = 3

/**
 * Opacity of the row buttons' hover / focus wash on the accent band. DSH paints
 * hovered chrome with a solid surface token (`button-ghost-active-fill` /
 * `interactive-bg-hover-solid` = `bg2`), which is designed for a normal row
 * background and turns into an opaque slate square on the solid band; a wash of
 * the band ink keeps both the surface and the now ink-coloured glyph readable
 * (2026-11-08: "这个铃铛 hover 的时候显示还有点问题").
 */
const ROW_BUTTON_WASH = 0.16

/**
 * The active-row surface of one variant: the palette accent green plus the
 * canvas ink the accent layer pairs it with.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ fill: string, ink: string }} both opaque `#RRGGBB`.
 */
function activeRowFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return { fill: palette.fg.statusline1, ink: palette.ramp.bg0 }
}

/**
 * The six active-row surfaces, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, { fill: string, ink: string }>} keyed `light-hard` … `dark-soft`.
 */
export function activeSessionRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = activeRowFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body>.
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
 * The three rules of one variant: the solid band, the canvas ink for the
 * grey-coloured children, and the hover / focus paint of the row buttons.
 * `time` is a nested span inside DSH's `rowResting` cell (verified against the
 * installed 0.2.2-rc.1 bundle), so the trailing time cell needs its own class
 * hook next to the direct-child spans.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ fill: string, ink: string }} role
 * @returns {string}
 */
function activeSessionRules (scheme, strength, role) {
  const row = `${scopeFor(scheme, strength)} ${ACTIVE_SESSION_ROW}`
  // The prefix is already part of every selector: build the suffixes and join
  // them *as a selector list* (2026-11-08: the first version re-prefixed each
  // entry, which produced `row row [class*="time"]` and matched nothing — only
  // the direct-child rule survived, so the nested time/pin/action cells stayed
  // `label-tertiary` grey on the band).
  const inkSelectors = [
    '> span',
    '[class*="time"]',
    '[class*="pinIndicator"]',
    '[class*="iconButton"]',
    'button',
    'svg:not([data-state])',
    // The "running" loading spinner is ui-primitives' `StateDot(state="ongoing")`:
    // an `<svg data-state="ongoing">` whose ring / arc are `label-tertiary` greys.
    // `svg:not([data-state])` deliberately leaves the semantic dots alone, so the
    // neutral spinner needs its own hook (2026-11-08: faint on the solid band).
    '[data-state="ongoing"]'
  ].map((suffix) => `${row} ${suffix}`)
  const hoverSelectors = ['button:hover', 'button:focus-visible'].map((suffix) => `${row} ${suffix}`)
  return [
    `${row} {\n  background-color: ${role.fill};\n  color: ${role.ink};\n}`,
    // The ink is written out instead of `inherit`: the cells sit inside DSH's
    // `rowResting` / `rowActions` wrappers which restate `label-tertiary`, and
    // only an explicit value is independent of that inheritance chain.
    `${inkSelectors.join(',\n')} {\n  color: ${role.ink};\n}`,
    // Hover / focus: a wash of the ink instead of DSH's solid surface fill (which
    // reads as an opaque slate box on the band and hides the ink glyph), plus an
    // ink-coloured focus ring (DSH's ring defaults to the accent, invisible here).
    `${hoverSelectors.join(',\n')} {\n  background-color: ${alpha(role.ink, ROW_BUTTON_WASH)};\n  outline-color: ${role.ink};\n}`
  ].join('\n\n')
}

/**
 * The complete active-row stylesheet (six variants × three rules).
 * @returns {string}
 */
export function activeSessionStyles () {
  const roles = activeSessionRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      activeSessionRules(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
