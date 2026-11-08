// Everforest accent labels for DSH chrome: the conversation title and the
// selected options inside dropdown menus.
//
// The conversation title is painted with the palette **text green** `green`
// (upstream: "Function Names, Method Names, Strings, Characters, Search
// Highlights"; dark `#A7C080`, light `#8DA101`). The selected dropdown option
// is a *background*: the palette `statusline1` (upstream: "Menu Selection
// Background, Tab Line Label Background (active), Status Line Mode Indicator";
// dark `#A7C080`, light `#93B259`) as a solid fill with the scheme canvas `bg0`
// as its label / check ink. 2026-11-08 review: the user compared the two greens
// in upstream Everforest and confirmed the text one is deeper — in the light
// scheme they are two different colours (`#8DA101` vs `#93B259`), while in the
// dark schemes both are `#A7C080`; only the light schemes change.
//
// - the conversation title is the current crumb of the session header
//   (`ui-conversation` skeleton: `.crumbCurrent { color: var(--dsw-alias-label-
//   primary) }`, verified in the installed 0.2.2-rc.1 bundle as
//   `_<hash>_crumbCurrent`). 2026-11-08 user request "上面标题的名称也改为绿色";
//   the palette review (A7) briefly reverted the green labels to DSH's own
//   `label-primary`, and the follow-up review put the title back because the
//   user asked for the green labels again;
// - a selected dropdown option is either a Menu item (`role="menuitem"`, check
//   / fill selection mode, class `_selected_<hash>` or `_selectedFill_<hash>`)
//   or a radio-style option (`role="menuitemradio"`, `aria-checked="true"`,
//   e.g. the model / reasoning effort panes of `ui-model-selection`); their
//   check glyph is the `check` child. Upstream defines `statusline1` as a
//   *background* colour, so the option is a solid `statusline1` fill with the
//   scheme canvas `bg0` as label and check ink (2026-11-08 palette review, A7)
//   — not tinted text.
//
// The option's *contents* need the same ink. DSH restates a colour token on
// every nested part instead of inheriting one: the leading icon of a Menu item
// is `color: var(--dsw-alias-menu-icon)` (`_itemIcon_<hash>`, e.g. the folder
// glyph of the workspace picker), an option's own label cell is
// `var(--dsw-alias-label-primary)`, and its second line / shortcut / path
// suffix are `label-caption` / `label-secondary` (the agent-preset chip's
// `_itemName_` / `_itemDesc_` pair, the workspace picker's `pathSuffix`). An
// inherited `color` cannot reach those, so they kept DSH's neutral greys on the
// green band (2026-11-08 user report: the selected workspace's icon and the
// selected mode option's text read in the wrong colour). The selected-option
// rule therefore re-points the option's text / icon tokens at the band ink for
// that option's subtree only (`MENU_INK_TOKENS`).
//
// Contrast: the canvas ink is a WCAG AA pair in the dark schemes (5.62–6.88:1);
// in the light schemes it sits at 2.00–2.32:1 — the palette's own ceiling for
// cream ink on `statusline1`, which is what the upstream reference tab does.
// The text green keeps the palette's own numbers (dark AA 5.62–6.88:1, light
// 2.36–2.81:1 — deeper than `statusline1` on the same cream surfaces).
// The measured values are pinned in `docs/reference/contrast.md` §2h / §2i
// instead of being corrected away.
//
// Selectors use stable hooks only: the CSS-module local name `crumbCurrent` and
// the ARIA menu roles, never a hashed class prefix. Always-on and independent of
// the color mode (navigation / selection chrome, not markdown content).

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The conversation title (current breadcrumb in the session header). */
export const HEADER_TITLE = '[class*="crumbCurrent"]'

/** A selected Menu item, in fill or check selection mode. */
export const MENU_SELECTED = '[role="menu"] [role="menuitem"][class*="selected"]'

/** A checked radio-style option (model / reasoning effort lists). */
export const MENU_SELECTED_RADIO = '[role="menu"] [role="menuitemradio"][aria-checked="true"]'

/** The trailing check glyph of a selected menu item. */
export const MENU_CHECK = `${MENU_SELECTED} [class*="check"]`

/** The trailing check glyph of a checked radio-style option. */
export const MENU_CHECK_RADIO = `${MENU_SELECTED_RADIO} [class*="check"]`

/**
 * The text / icon colour tokens DSH restates inside a dropdown option. On the
 * solid accent band each one is re-pointed at the band ink, scoped to the
 * selected option's subtree:
 *
 * - `--dsw-alias-menu-icon`: the leading icon of a Menu item
 *   (`_itemIcon_<hash>`: the workspace picker's folder, model cells' chevron);
 * - `--dsw-alias-label-primary`: an option's own label cell and the check
 *   glyph (`_itemName_<hash>`, the agent-preset mode options);
 * - `--dsw-alias-label-secondary` / `-tertiary` / `-caption` / `-dimmed`: the
 *   second line, shortcut keys and path suffixes (`_itemDesc_<hash>`,
 *   `_shortcutKeys_<hash>`, the workspace picker's `pathSuffix`).
 *
 * Redefining the tokens on the option element keeps the scope local: the
 * unselected rows of the same menu keep DSH's neutral palette.
 * @type {string[]}
 */
export const MENU_INK_TOKENS = [
  '--dsw-alias-menu-icon',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-label-caption',
  '--dsw-alias-label-dimmed'
]

/** The absolutely positioned fill child DSH paints under a selected item. */
export const MENU_SELECTED_FILL = `${MENU_SELECTED} [class*="selectedFill"]`

/** The fill child of a checked radio-style option (same menu primitive). */
export const MENU_SELECTED_FILL_RADIO = `${MENU_SELECTED_RADIO} [class*="selectedFill"]`

/**
 * Minimum contrast the green title keeps on the header surface (WCAG AA) and on
 * the translucent menu card (4.28–5.32:1 measured, the weaker of the two).
 */
export const UI_ACCENT_DARK_CONTRAST = 4.0

/**
 * Documented floor of the light schemes' text green on the header / menu
 * surfaces (2.36–2.81:1; the light·soft menu card is the weakest).
 */
export const UI_ACCENT_LIGHT_CONTRAST = 2.3

/**
 * Minimum contrast the dark schemes keep between the canvas ink and the accent
 * fill (5.62–6.88:1 measured, WCAG AA).
 */
export const UI_ACCENT_DARK_INK_CONTRAST = 4.5

/**
 * Documented floor of the light schemes' canvas ink on `statusline1`
 * (2.00–2.32:1; the light palette offers no deeper ink, and the upstream
 * reference tab pairs cream with the same green).
 */
export const UI_ACCENT_LIGHT_INK_CONTRAST = 1.95

/**
 * One variant's accents: the palette `green` (title text — upstream foreground
 * green), the `statusline1` background fill, and the scheme canvas `bg0` ink
 * used on that fill.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ green: string, fill: string, ink: string }} all opaque `#RRGGBB`.
 */
function accentFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return { green: palette.fg.green, fill: palette.fg.statusline1, ink: palette.ramp.bg0 }
}

/**
 * The six accent surfaces, keyed by `${scheme}-${strength}`. `green` is the
 * text green, `fill` the `statusline1` selection background, `ink` the scheme
 * canvas used on that fill.
 * @returns {Record<string, { green: string, fill: string, ink: string }>} keyed `light-hard` … `dark-soft`.
 */
export function uiAccentRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = accentFor(scheme, strength)
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
 * One rule from a selector list and declarations.
 * @param {string} scope
 * @param {string[]} selectors
 * @param {Array<[string, string]>} declarations
 * @returns {string}
 */
function accentRule (scope, selectors, declarations) {
  const body = declarations.map(([property, value]) => `  ${property}: ${value};`).join('\n')
  return `${selectors.map((selector) => `${scope} ${selector}`).join(',\n')} {\n${body}\n}`
}

/**
 * One variant's four rules: the green conversation title, the selected row
 * surface, its fill child and the check glyph.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ green: string, fill: string, ink: string }} roles
 * @returns {string}
 */
function uiAccentRules (scheme, strength, roles) {
  const scope = scopeFor(scheme, strength)
  return [
    accentRule(scope, [HEADER_TITLE], [['color', roles.green]]),
    accentRule(scope, [MENU_SELECTED, MENU_SELECTED_RADIO], [
      ['background', roles.fill],
      ['color', roles.ink],
      // The option's nested text / icon cells restate their own colour tokens,
      // so the band ink is written onto the tokens themselves (MENU_INK_TOKENS).
      ...MENU_INK_TOKENS.map((token) => [token, roles.ink])
    ]),
    accentRule(scope, [MENU_SELECTED_FILL, MENU_SELECTED_FILL_RADIO], [['background', roles.fill]]),
    accentRule(scope, [MENU_CHECK, MENU_CHECK_RADIO], [['color', roles.ink]])
  ].join('\n\n')
}

/**
 * The complete chrome accent stylesheet (six variants × four rules).
 * @returns {string}
 */
export function uiAccentStyles () {
  const roles = uiAccentRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      uiAccentRules(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
