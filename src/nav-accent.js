// Everforest surface for the *selected* navigation rows.
//
// Two navigation surfaces join the theme's interaction layer here:
//
//  1. the Settings dialog's left navigation — DSH paints the active cell with
//     `--dsw-specific-sidebar-nav-item-active` (ui-settings-general
//     `SettingsRoot.module.css`: `.navCell.active { background: var(…) }`,
//     verified against the installed 0.2.2-rc.1 bundle). Upstream that token is
//     a neutral emphasis step (`neutral-bluish-100` on a white panel,
//     `neutral-bluish-750` on `neutral-bluish-850` in dark); the Everforest
//     token layer maps it to `surface(p, 2)` — the exact value it gives the
//     panel's `--dsw-alias-bg-layer-2` — so the active row is painted the panel
//     colour and the selection vanishes (2026-11-09 report: "选中某一项过后，
//     目录栏的高亮显示没有了");
//  2. the sidebar's panel list (插件市场 / 自动化任务 / 上下文洞察 / …) —
//     ui-sidebar `SidebarRoot.module.css` paints the active row with
//     `.panelRow.panelActive { background-color:
//     var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary) }`,
//     i.e. the *hover* token, so the current page is only a neutral wash and is
//     indistinguishable from hovering any other row; there is no dedicated
//     selected token at all (2026-11-09 report: "帮我把这里也加上选中变色").
//
// The settings-navigation token cannot fix case 1 on its own: the panel sits on
// `bg-layer-2` and the light schemes' `label-primary` already sits at
// 4.53–5.26:1 on it (light·soft has 0.03 headroom), so any fill dark enough to
// read as a highlight drops the label under 4.5:1, while any fill light enough
// to keep the label AA is an imperceptible ~1–2 L* step from the panel (the
// canvas is the lightest palette surface). Case 2 has no token to fix in the
// first place. Both rows are chrome, though, and every other *selected* chrome
// surface in this theme is the solid interaction accent `statusline1` with the
// scheme canvas `bg0` as ink: the open session row (`src/active-session.js`),
// the selected dropdown option (`src/ui-accents.js`), the send button, the
// preview badge. This sheet gives both rows the same pairing, so "selected"
// means the same thing everywhere.
//
// Anchors are DSH's accessibility contracts and slot contract, not CSS-module
// hashes: the Settings modal is `[data-shortcut-modal="settings"]` (the modal id
// DSH's shortcut layer keys off) with the active cell as its `<button
// aria-current="true">`; the sidebar panel row is a `<button
// aria-current="page">` inside the `<nav>` rendered by the layout's `sidebar`
// slot (`[data-slot="sidebar"]`, the `display:contents` outlet wrapper every
// DSH slot gets). All verified against the installed 0.2.2-rc.1 and
// 0.2.1-rc.5 bundles. Both selectors outrank the upstream `.navCell:hover` /
// `.navCell.active` / `.panelRow:hover` / `.panelRow.panelActive` declarations
// on specificity, so hovering the selected row keeps the accent band instead of
// trading it back for the translucent hover wash. The button's `color` is the
// canvas ink and its children (the icon / glyph spans and the title span, plus
// plugin glyphs that paint with `currentColor`) inherit it — without that the
// upstream `label-primary` text would sit on the accent at ~1.4–1.6:1. The
// `:focus-visible` ring is re-inked too: DSH's ring defaults to the accent, so
// on the accent band it would be invisible (the selected session row solved the
// same problem the same way).
//
// Always-on, color-mode independent (it is navigation chrome, not content
// colouring) and injected with the same always-on pattern as the other chrome
// sheets; the rules only ever match rows that DSH itself marks as current.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The element DSH gives the Settings modal (shortcut-layer modal id). */
export const SETTINGS_PANEL_ANCHOR = '[data-shortcut-modal="settings"]'

/**
 * The active Settings-navigation cell. `aria-current="true"` is the same
 * accessibility contract the session list exposes via `aria-selected`; the
 * CSS-module class (`AnXs9G_active`) is build output and must not be used.
 */
export const SETTINGS_NAV_ROW = `${SETTINGS_PANEL_ANCHOR} nav button[aria-current="true"]`

/**
 * The selected sidebar panel row (插件市场 / 自动化任务 / …). `aria-current="page"`
 * is the accessibility contract; the CSS-module class (`wtg9ga_panelActive`) is
 * build output, and the layout's `data-sidebar-collapsed` attribute only exists
 * while the rail is collapsed, so it cannot scope the expanded state. The
 * `[data-slot="sidebar"]` anchor is the layout's own slot name.
 */
export const SIDEBAR_PANEL_ROW = '[data-slot="sidebar"] nav button[aria-current="page"]'

/** The two selected-navigation selectors, in stylesheet order. */
export const NAV_ROWS = Object.freeze([SETTINGS_NAV_ROW, SIDEBAR_PANEL_ROW])

/**
 * Two rules per variant: the accent band + ink (both rows share the same
 * declarations, so they are one selector list) and the focus-ring ink.
 */
export const NAV_ACCENT_RULES_PER_VARIANT = 2

/**
 * The selected-row surface of one variant: the palette interaction accent
 * (`statusline1`, upstream's "Menu Selection Background / Tab Line Label
 * Background (active)") plus the canvas `bg0` it is paired with across the
 * accent layer — both palette values verbatim, no derivation.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ fill: string, ink: string }} both opaque `#RRGGBB`.
 */
function activeNavRowFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return { fill: palette.fg.statusline1, ink: palette.ramp.bg0 }
}

/**
 * The six selected-row surfaces, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, { fill: string, ink: string }>} keyed `light-hard` … `dark-soft`.
 */
export function navAccentRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = activeNavRowFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body> — the same pattern as
 * `src/active-session.js` and `src/selection.js`.
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
 * The two rules of a variant: the solid accent band + canvas ink on both
 * selected rows, and an ink focus ring (DSH's ring defaults to the accent,
 * which disappears on the accent band).
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ fill: string, ink: string }} role
 * @returns {string}
 */
function navAccentRules (scheme, strength, role) {
  const scope = scopeFor(scheme, strength)
  const rowSelectors = NAV_ROWS.map((row) => `${scope} ${row}`)
  const focusSelectors = NAV_ROWS.map((row) => `${scope} ${row}:focus-visible`)
  return [
    `${rowSelectors.join(',\n')} {\n  background-color: ${role.fill};\n  color: ${role.ink};\n}`,
    `${focusSelectors.join(',\n')} {\n  outline-color: ${role.ink};\n}`
  ].join('\n\n')
}

/**
 * The complete selected-navigation stylesheet (six variants × two rules).
 * @returns {string}
 */
export function navAccentStyles () {
  const roles = navAccentRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      navAccentRules(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
