// Everforest "color mode": the opt-in content-layer role colours and stylesheet.
//
// Color mode is an experimental content enhancement, **off by default**: when
// the Client sets the three `data-everforest-*` attributes from
// `COLOR_MODE_ATTRS` on `document.documentElement`, the stylesheet returned by
// `colorModeStyles()` starts matching; while the mode attribute is `"off"` every
// selector is prefixed with `html[data-everforest-color-mode="on"]`, so the CSS
// matches nothing and the page is pixel-identical to the base theme.
//
// Two things live here:
//
//   - `colorModeRoles()` — the "中彩" (medium-color) role colours for all six
//     palette variants. Nothing is hand-picked: `tokensFor()` supplies each
//     variant's `--dsw-alias-bg-base`, `--dsw-specific-sidebar-fill` and
//     `--dsw-alias-label-primary`, `resolvePalette()` supplies the accent hues,
//     and every value is then contrast-guarded with the pure helpers from
//     `src/color.js`:
//       headings h1–h3          guard(red / orange / yellow, bg-base, 3:1)
//       marker / quote / hr / check  guard(aqua, bg-base, 3:1)
//       band / zebra            green tinted into bg-base (14% / 6%)
//       row warn / done (+hover)  orange / green tinted into sidebar (12% / 18%)
//       dot warn / done         guarded to 3:1 on both bg-base and sidebar
//     The tint weights are the maximum the `label-primary` text on that surface
//     can afford (4.5:1), so light strengths settle lower than dark ones.
//   - `colorModeStyles()` — the complete static stylesheet for those roles: six
//     custom-property blocks (light scheme = `body:not([data-ds-dark-theme])`,
//     dark scheme = `body[data-ds-dark-theme]`, the attribute DSH's ui-theme boot
//     row puts on `<body>`) plus the element rules that consume the variables.
//
// The formulas and expected values are the ones validated by the 2026-10-23
// "中彩" preview (`.tmp/color-mode-preview`); the role colours are pinned by
// `tests/color-mode.test.mjs` and hard-gated in `scripts/check-contrast.mjs`.
//
// The module is a pure ESM source: no DOM, no storage, no state. `node --test`
// imports it directly and `scripts/build.mjs` bundles it into `client.js`
// (`src/client-entry.js` owns the DOM side).

import { DEFAULT_STATE, SCHEMES, STRENGTHS, VARIANT_NAMES, resolvePalette } from './palette.js'
import { contrastRatio, mix } from './color.js'
import { tokensFor } from './tokens.js'

/**
 * The `data-*` attributes the Client sets on `document.documentElement`.
 * `mode` is `'on' | 'off'`; `light` / `dark` carry each scheme's strength so
 * the stylesheet can pick the matching variant without a JS lookup per frame.
 * @type {{ mode: string, light: string, dark: string }}
 */
export const COLOR_MODE_ATTRS = Object.freeze({
  mode: 'data-everforest-color-mode',
  light: 'data-everforest-light',
  dark: 'data-everforest-dark'
})

/**
 * The "中彩" role colours of one palette variant, all opaque `#RRGGBB`.
 * @typedef {object} ColorModeRoles
 * @property {string} h1 - markdown-level-1 heading colour (red hue).
 * @property {string} h2 - markdown-level-2 heading colour (orange hue).
 * @property {string} h3 - markdown-level-3 heading colour (yellow hue).
 * @property {string} marker - list bullet marker and checkbox accent (aqua).
 * @property {string} quote - blockquote left border.
 * @property {string} hr - horizontal-rule fill.
 * @property {string} check - task-list checkbox accent colour.
 * @property {string} band - table-header background band (green tint).
 * @property {string} zebra - even table-row stripe (lighter green tint).
 * @property {string} rowWarn - session row waiting for the user (orange tint).
 * @property {string} rowDone - finished, not yet opened session row (green tint).
 * @property {string} rowWarnHover - `rowWarn` on hover (stronger tint).
 * @property {string} rowDoneHover - `rowDone` on hover (stronger tint).
 * @property {string} dotWarn - waiting session status dot (orange).
 * @property {string} dotDone - finished session status dot (green).
 */

/** Minimum contrast for a coloured heading / decoration against `bg-base`. */
const DECORATION_CONTRAST = 3

/** Minimum contrast for `label-primary` text on a tinted color-mode surface. */
const SURFACE_CONTRAST = 4.5

/** Minimum contrast for a status dot on both `bg-base` and the sidebar. */
const DOT_CONTRAST = 3

/* ------------------------------------------------------------------ *
 * Contrast guards (the same math as the "中彩" preview)
 * ------------------------------------------------------------------ */

/**
 * Blend `color` toward `ink` until it reaches `target` contrast on `bg`.
 * Returns the colour unchanged when it already passes.
 * @param {string} color - starting colour.
 * @param {string} bg - background the colour is painted on.
 * @param {number} target - minimum contrast ratio.
 * @param {string} ink - scheme ink the colour is blended toward.
 * @returns {string}
 */
function guardTo (color, bg, target, ink) {
  if (contrastRatio(color, bg) >= target) return color
  for (let step = 1; step <= 100; step += 1) {
    const value = mix(color, ink, step / 100)
    if (contrastRatio(value, bg) >= target) return value
  }
  return mix(color, ink, 1)
}

/**
 * Blend `color` toward `ink` until it passes `target` on **both** backgrounds.
 * Used for the session status dots, which sit on the content canvas in the chat
 * list and on the sidebar surface in the session tree.
 * @param {string} color - starting colour.
 * @param {string} bgA - first background.
 * @param {string} bgB - second background.
 * @param {number} target - minimum contrast ratio on each background.
 * @param {string} ink - scheme ink the colour is blended toward.
 * @returns {string}
 */
function minGuard (color, bgA, bgB, target, ink) {
  let weight = 0
  let value = color
  while (weight < 1 && (contrastRatio(value, bgA) < target || contrastRatio(value, bgB) < target)) {
    weight = Math.round((weight + 0.01) * 100) / 100
    value = mix(color, ink, weight)
  }
  return value
}

/**
 * Tint `base` with `tint` at up to `start` weight, backing off 1% at a time
 * until `ink` keeps `SURFACE_CONTRAST` on the result. The weight is never
 * increased, so a too-strong start simply returns the untinted base.
 * @param {string} base - surface colour (`bg-base` or the sidebar fill).
 * @param {string} tint - accent hue blended into it.
 * @param {number} start - maximum tint weight (0-1).
 * @param {string} ink - text colour the surface must stay readable with.
 * @returns {string}
 */
function safeTint (base, tint, start, ink) {
  let weight = start
  let value = mix(base, tint, weight)
  while (weight > 0 && contrastRatio(ink, value) < SURFACE_CONTRAST) {
    weight = Math.round((weight - 0.01) * 100) / 100
    value = mix(base, tint, weight)
  }
  return value
}

/* ------------------------------------------------------------------ *
 * Roles
 * ------------------------------------------------------------------ */

/**
 * Compute the six variant role records from the current token layer.
 * @returns {Record<string, ColorModeRoles>} keyed by `${scheme}-${strength}`.
 */
function buildColorModeRoles () {
  const roles = {}
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const state = { ...DEFAULT_STATE, [scheme]: strength }
    const overlay = tokensFor(state)
    const pick = (name) => {
      const entry = overlay[name]
      if (!entry) throw new Error(`colorModeRoles: tokensFor() has no ${name}`)
      return entry[scheme]
    }
    const fg = resolvePalette(state)[scheme].fg
    const ink = fg.fg
    const bg = pick('--dsw-alias-bg-base')
    const sidebar = pick('--dsw-specific-sidebar-fill')
    const labelPrimary = pick('--dsw-alias-label-primary')
    const marker = guardTo(fg.aqua, bg, DECORATION_CONTRAST, ink)
    roles[variant] = Object.freeze({
      h1: guardTo(fg.red, bg, DECORATION_CONTRAST, ink),
      h2: guardTo(fg.orange, bg, DECORATION_CONTRAST, ink),
      h3: guardTo(fg.yellow, bg, DECORATION_CONTRAST, ink),
      marker,
      quote: marker,
      hr: marker,
      check: marker,
      band: safeTint(bg, fg.green, 0.14, labelPrimary),
      zebra: safeTint(bg, fg.green, 0.06, labelPrimary),
      rowWarn: safeTint(sidebar, fg.orange, 0.12, labelPrimary),
      rowDone: safeTint(sidebar, fg.green, 0.12, labelPrimary),
      rowWarnHover: safeTint(sidebar, fg.orange, 0.18, labelPrimary),
      rowDoneHover: safeTint(sidebar, fg.green, 0.18, labelPrimary),
      dotWarn: minGuard(fg.orange, bg, sidebar, DOT_CONTRAST, ink),
      dotDone: minGuard(fg.green, bg, sidebar, DOT_CONTRAST, ink)
    })
  }
  return Object.freeze(roles)
}

let cachedRoles = null

/**
 * The "中彩" role colours for all six variants.
 * @returns {Record<string, ColorModeRoles>}
 */
export function colorModeRoles () {
  if (cachedRoles === null) cachedRoles = buildColorModeRoles()
  return cachedRoles
}

/**
 * Map a Client state onto the `data-*` attributes for
 * `document.documentElement`. A falsy `colorMode` maps to `"off"`; the
 * strengths are passed through as-is (the Client keeps them normalized).
 * @param {{ colorMode?: boolean, light: string, dark: string }} state
 * @returns {Record<string, string>}
 */
export function colorModeDataset (state) {
  return {
    [COLOR_MODE_ATTRS.mode]: state.colorMode ? 'on' : 'off',
    [COLOR_MODE_ATTRS.light]: state.light,
    [COLOR_MODE_ATTRS.dark]: state.dark
  }
}

/* ------------------------------------------------------------------ *
 * Stylesheet
 * ------------------------------------------------------------------ */

/** CSS custom property name of one camelCase role key (`rowWarn` → `row-warn`). */
function cssVariable (role) {
  return `--everforest-color-${role.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`
}

/** Every element rule is scoped to the mode being on, so "off" matches nothing. */
const COLOR_MODE_ON = `html[${COLOR_MODE_ATTRS.mode}="on"]`

/** Markdown content container (DSH hashes the class, `markdown` stays a substring). */
const MARKDOWN_SCOPE = `${COLOR_MODE_ON} [class*="markdown"]:not([data-markdown-variant="compact"])`

/**
 * Session-tree row selector for one state, keyed by the status dot it contains.
 * `:not([aria-selected="true"])` keeps the selected-row highlight intact.
 * @param {'warning' | 'done'} state
 * @returns {string}
 */
function sessionRow (state) {
  return `${COLOR_MODE_ON} [role="treeitem"][data-row-key^="session:"]:has([data-state="${state}"]):not([aria-selected="true"])`
}

/**
 * The `:hover` variant of `sessionRow`; the extra pseudo-class also makes it
 * more specific than the base rule, so it wins while hovered.
 * @param {'warning' | 'done'} state
 * @returns {string}
 */
function sessionRowHover (state) {
  return `${COLOR_MODE_ON} [role="treeitem"][data-row-key^="session:"]:has([data-state="${state}"]):hover:not([aria-selected="true"])`
}

/** [selector, CSS property, role key] for every element rule. */
const ELEMENT_RULES = [
  [`${MARKDOWN_SCOPE} h1`, 'color', 'h1'],
  [`${MARKDOWN_SCOPE} h2`, 'color', 'h2'],
  [`${MARKDOWN_SCOPE} h3`, 'color', 'h3'],
  [`${MARKDOWN_SCOPE} li::marker`, 'color', 'marker'],
  [`${MARKDOWN_SCOPE} blockquote`, 'border-left-color', 'quote'],
  [`${MARKDOWN_SCOPE} hr`, 'background-color', 'hr'],
  [`${MARKDOWN_SCOPE} thead th`, 'background-color', 'band'],
  [`${MARKDOWN_SCOPE} tbody tr:nth-child(even) > td`, 'background-color', 'zebra'],
  [`${MARKDOWN_SCOPE} input[type="checkbox"]`, 'accent-color', 'check'],
  [`${COLOR_MODE_ON} [data-state="warning"]`, 'color', 'dotWarn'],
  [`${COLOR_MODE_ON} [data-state="done"]`, 'color', 'dotDone'],
  [sessionRow('warning'), 'background-color', 'rowWarn'],
  [sessionRow('done'), 'background-color', 'rowDone'],
  [sessionRowHover('warning'), 'background-color', 'rowWarnHover'],
  [sessionRowHover('done'), 'background-color', 'rowDoneHover']
]

/**
 * Build the full stylesheet from the role records.
 * @param {Record<string, ColorModeRoles>} roles
 * @returns {string}
 */
function buildColorModeStyles (roles) {
  const rules = []
  // Light blocks first, then dark (each scheme owns one `body` attribute).
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const record = roles[`${scheme}-${strength}`]
      const selector = scheme === 'light'
        ? `html[${COLOR_MODE_ATTRS.mode}="on"][${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
        : `html[${COLOR_MODE_ATTRS.mode}="on"][${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
      const declarations = Object.entries(record).map(([role, value]) => `  ${cssVariable(role)}: ${value};`)
      rules.push(`${selector} {\n${declarations.join('\n')}\n}`)
    }
  }
  for (const [selector, property, role] of ELEMENT_RULES) {
    rules.push(`${selector} {\n  ${property}: var(${cssVariable(role)});\n}`)
  }
  return `${rules.join('\n\n')}\n`
}

let cachedStyles = null

/**
 * The complete static stylesheet: six custom-property blocks (one per variant)
 * followed by the element rules. Independent of the current state — the Client
 * injects it once and the attribute blocks select the active variant.
 * @returns {string}
 */
export function colorModeStyles () {
  if (cachedStyles === null) cachedStyles = buildColorModeStyles(colorModeRoles())
  return cachedStyles
}
