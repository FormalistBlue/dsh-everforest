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
//   - `colorModeRoles()` — the "中彩" (medium-colour) role colours for all six
//     palette variants. Nothing is hand-picked: `tokensFor()` supplies each
//     variant's surfaces (`bg-base`, `sidebar-fill`, `label-primary`,
//     `label-tertiary`, the inline-code chip and the code-block surface),
//     `resolvePalette()` supplies the accent hues, and every value is then
//     contrast-guarded with the pure helpers from `src/color.js`.
//
//     The mapping follows Everforest Enchanted's markdown palette
//     (obsidian-everforest-enchanted `theme.css`, headings red→purple, emphasis
//     purple, inline code blue, internal links aqua, faint strikethrough,
//     tinted blockquotes/tables), adapted to the roles DSH's markdown renderer
//     actually exposes:
//       headings h1–h6          red / orange / yellow / green / blue / purple
//       strong + em             purple (guarded as normal-size text)
//       inline code text        blue, on the blue inline-code chip
//       internal file links     aqua (external links keep the link token)
//       del + done task items   label-tertiary (intentionally faint)
//       marker / quote / hr     aqua
//       checkbox accent         blue
//       table band / zebra / hover   green tints into bg-base (14% / 6% / 10%)
//       blockquote fill         aqua tint into bg-base (8%)
//       session row warn / done (+hover)  orange / green into sidebar (12% / 18%)
//       status dots warn / done orange / green, guarded on bg-base AND sidebar
//
//     Thresholds: large/bold headings h1–h4 and the decorations/checkbox accent
//     are non-body text -> 3:1; accent text (h5/h6, emphasis, inline code,
//     internal links) is also held at 3:1 against every surface it can sit on
//     (canvas, table band/zebra/hover, blockquote fill; the inline-code chip is
//     a surface of its own). 3:1 and not 4.5:1 is deliberate: light Everforest
//     accents cannot reach 4.5:1 without collapsing into the ink colour (at 4.5
//     the light·soft purple/blue/aqua all became `#5C6A72`, i.e. no colour left),
//     and Enchanted paints them near 2.6:1. Primary body text keeps 4.5:1 on
//     every tinted surface; the tint weights are the maximum that text can
//     afford, so light strengths settle lower than dark ones.
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
 * @property {string} h4 - markdown-level-4 heading colour (green hue).
 * @property {string} h5 - markdown-level-5 heading colour (blue hue).
 * @property {string} h6 - markdown-level-6 heading colour (purple hue).
 * @property {string} emphasis - strong / em text colour (purple).
 * @property {string} inlineCode - inline-code text colour (blue).
 * @property {string} linkInternal - internal file-link colour (aqua).
 * @property {string} faint - del and completed-task text (label-tertiary).
 * @property {string} marker - list bullet marker (aqua).
 * @property {string} quote - blockquote left border (aqua).
 * @property {string} hr - horizontal-rule fill (aqua).
 * @property {string} check - task-list checkbox accent (blue).
 * @property {string} band - table-header background band (green tint).
 * @property {string} zebra - even table-row stripe (lighter green tint).
 * @property {string} tableHover - hovered table row (green tint).
 * @property {string} quoteBg - blockquote fill (aqua tint).
 * @property {string} rowWarn - session row waiting for the user (orange tint).
 * @property {string} rowDone - finished, not yet opened session row (green tint).
 * @property {string} rowWarnHover - `rowWarn` on hover (stronger tint).
 * @property {string} rowDoneHover - `rowDone` on hover (stronger tint).
 * @property {string} dotWarn - waiting session status dot (orange).
 * @property {string} dotDone - finished session status dot (green).
 */

/** Minimum contrast for a large / bold coloured heading or a decoration. */
const DECORATION_CONTRAST = 3

/**
 * Minimum contrast for normal-size coloured markdown text (bold, italic,
 * inline code, internal links, h5/h6).
 *
 * 3:1, not 4.5:1, on purpose: the light Everforest accents cannot reach 4.5:1
 * on the cream canvas without collapsing into the ink colour (guarded at 4.5
 * the light·soft purple/blue/aqua all became `#5C6A72`, i.e. no colour left).
 * Enchanted itself paints these at ~2.6:1 in light; this mode keeps the hue at
 * a strictly better 3:1 while every piece of *primary* body text still holds
 * 4.5:1 (the tinted surfaces are clamped for `label-primary`). Dark variants
 * already pass 4.5:1 unmodified, so the guard only bites in light.
 */
const ACCENT_TEXT_CONTRAST = 3

/** Minimum contrast for `label-primary` text on a tinted color-mode surface. */
const SURFACE_CONTRAST = 4.5

/** Minimum contrast for a status dot on both `bg-base` and the sidebar. */
const DOT_CONTRAST = 3

/* Tint weights (maximum that the text on the surface can afford). */
const BAND_TINT = 0.14
const ZEBRA_TINT = 0.06
const TABLE_HOVER_TINT = 0.1
const QUOTE_TINT = 0.08
const ROW_TINT = 0.12
const ROW_HOVER_TINT = 0.18

/* ------------------------------------------------------------------ *
 * Contrast guards (the same math as the "中彩" preview)
 * ------------------------------------------------------------------ */

/**
 * Blend `color` toward `ink` until it reaches `target` contrast on **every**
 * background in `backgrounds`. Returns the colour unchanged when it already
 * passes. One background is the common case; multi-background calls guard text
 * that can sit on the canvas, a table fill or a blockquote fill.
 * @param {string} color - starting colour.
 * @param {string[]} backgrounds - surfaces the colour is painted on.
 * @param {number} target - minimum contrast ratio on each background.
 * @param {string} ink - scheme ink the colour is blended toward.
 * @returns {string}
 */
function guardTo (color, backgrounds, target, ink) {
  if (backgrounds.every((bg) => contrastRatio(color, bg) >= target)) return color
  for (let step = 1; step <= 100; step += 1) {
    const value = mix(color, ink, step / 100)
    if (backgrounds.every((bg) => contrastRatio(value, bg) >= target)) return value
  }
  return mix(color, ink, 1)
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
    const labelTertiary = pick('--dsw-alias-label-tertiary')
    const inlineCodeSurface = pick('--dsw-alias-markdown-inline-code')

    // Surfaces first: the text colours are guarded against all of them.
    const band = safeTint(bg, fg.green, BAND_TINT, labelPrimary)
    const zebra = safeTint(bg, fg.green, ZEBRA_TINT, labelPrimary)
    const tableHover = safeTint(bg, fg.green, TABLE_HOVER_TINT, labelPrimary)
    const quoteBg = safeTint(bg, fg.aqua, QUOTE_TINT, labelPrimary)
    /** Canvas + every surface a piece of markdown text can sit on. */
    const textSurfaces = [bg, band, zebra, tableHover, quoteBg]

    const marker = guardTo(fg.aqua, [bg], DECORATION_CONTRAST, ink)
    roles[variant] = Object.freeze({
      // Headings: Enchanted's red → orange → yellow → green → blue → purple.
      h1: guardTo(fg.red, [bg], DECORATION_CONTRAST, ink),
      h2: guardTo(fg.orange, [bg], DECORATION_CONTRAST, ink),
      h3: guardTo(fg.yellow, [bg], DECORATION_CONTRAST, ink),
      h4: guardTo(fg.green, [bg], DECORATION_CONTRAST, ink),
      h5: guardTo(fg.blue, textSurfaces, ACCENT_TEXT_CONTRAST, ink),
      h6: guardTo(fg.purple, textSurfaces, ACCENT_TEXT_CONTRAST, ink),
      // Inline text styles.
      emphasis: guardTo(fg.purple, textSurfaces, ACCENT_TEXT_CONTRAST, ink),
      inlineCode: guardTo(fg.blue, [inlineCodeSurface], ACCENT_TEXT_CONTRAST, ink),
      linkInternal: guardTo(fg.headerAqua, textSurfaces, ACCENT_TEXT_CONTRAST, ink),
      faint: labelTertiary,
      // Decorations.
      marker,
      quote: marker,
      hr: marker,
      check: guardTo(fg.blue, textSurfaces, DECORATION_CONTRAST, ink),
      // Tinted fills.
      band,
      zebra,
      tableHover,
      quoteBg,
      rowWarn: safeTint(sidebar, fg.orange, ROW_TINT, labelPrimary),
      rowDone: safeTint(sidebar, fg.green, ROW_TINT, labelPrimary),
      rowWarnHover: safeTint(sidebar, fg.orange, ROW_HOVER_TINT, labelPrimary),
      rowDoneHover: safeTint(sidebar, fg.green, ROW_HOVER_TINT, labelPrimary),
      // Status dots sit on both the canvas and the sidebar.
      dotWarn: guardTo(fg.orange, [bg, sidebar], DOT_CONTRAST, ink),
      dotDone: guardTo(fg.green, [bg, sidebar], DOT_CONTRAST, ink)
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

/**
 * [selector, CSS property, role key] for every variable-driven element rule.
 * Order matters where two rules can hit the same element: the table-row hover
 * rule must follow the zebra rule, and the blockquote fill must follow nothing.
 */
const ELEMENT_RULES = [
  [`${MARKDOWN_SCOPE} h1`, 'color', 'h1'],
  [`${MARKDOWN_SCOPE} h2`, 'color', 'h2'],
  [`${MARKDOWN_SCOPE} h3`, 'color', 'h3'],
  [`${MARKDOWN_SCOPE} h4`, 'color', 'h4'],
  [`${MARKDOWN_SCOPE} h5`, 'color', 'h5'],
  [`${MARKDOWN_SCOPE} h6`, 'color', 'h6'],
  [`${MARKDOWN_SCOPE} strong`, 'color', 'emphasis'],
  [`${MARKDOWN_SCOPE} em`, 'color', 'emphasis'],
  [`${MARKDOWN_SCOPE} del`, 'color', 'faint'],
  [`${MARKDOWN_SCOPE} :not(pre) > code`, 'color', 'inlineCode'],
  [`${MARKDOWN_SCOPE} [class*="fileLink"]`, 'color', 'linkInternal'],
  [`${MARKDOWN_SCOPE} li::marker`, 'color', 'marker'],
  [`${MARKDOWN_SCOPE} blockquote`, 'border-left-color', 'quote'],
  [`${MARKDOWN_SCOPE} blockquote`, 'background-color', 'quoteBg'],
  [`${MARKDOWN_SCOPE} hr`, 'background-color', 'hr'],
  [`${MARKDOWN_SCOPE} thead th`, 'background-color', 'band'],
  [`${MARKDOWN_SCOPE} tbody tr:nth-child(even) > td`, 'background-color', 'zebra'],
  [`${MARKDOWN_SCOPE} tbody tr:hover > td`, 'background-color', 'tableHover'],
  [`${MARKDOWN_SCOPE} input[type="checkbox"]`, 'accent-color', 'check'],
  [`${MARKDOWN_SCOPE} li.task-list-item:has(input[type="checkbox"]:checked)`, 'color', 'faint'],
  [`${COLOR_MODE_ON} [data-state="warning"]`, 'color', 'dotWarn'],
  [`${COLOR_MODE_ON} [data-state="done"]`, 'color', 'dotDone'],
  [sessionRow('warning'), 'background-color', 'rowWarn'],
  [sessionRow('done'), 'background-color', 'rowDone'],
  [sessionRowHover('warning'), 'background-color', 'rowWarnHover'],
  [sessionRowHover('done'), 'background-color', 'rowDoneHover']
]

/**
 * Rules that are not a single colour variable: they either re-assert the
 * heading colour inside emphasis, or reshape the blockquote fill so the tinted
 * box does not press against the right edge. They follow the colour rules so
 * the `inherit` wins over `strong` / `em`.
 * @type {Array<[string, Array<[string, string]>]>}
 */
const LITERAL_RULES = [
  [`${MARKDOWN_SCOPE} :where(h1,h2,h3,h4,h5,h6) :is(strong,em)`, [['color', 'inherit']]],
  [`${MARKDOWN_SCOPE} blockquote`, [['padding-right', '12px'], ['border-radius', '0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0']]]
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
  for (const [selector, declarations] of LITERAL_RULES) {
    const body = declarations.map(([property, value]) => `  ${property}: ${value};`).join('\n')
    rules.push(`${selector} {\n${body}\n}`)
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
