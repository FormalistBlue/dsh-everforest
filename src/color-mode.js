// Everforest "color mode": the always-on content-layer role colours and stylesheet.
//
// Color mode ships as a default feature since 2026-10-24 — the 0.4.x Settings
// switch was removed at the user's request, so the Client always sets the three
// `data-everforest-*` attributes from `COLOR_MODE_ATTRS` on
// `document.documentElement` and the stylesheet returned by `colorModeStyles()`
// always matches. Every selector is still prefixed with
// `html[data-everforest-color-mode="on"]`: the attribute is the stylesheet's
// scope anchor (it keeps the rules inert if the mode ever needs to be switched
// again) while the token layer never changes either way.
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
//       table band / zebra / hover   green tints into bg-base (14% / 6% / 10%);
//                            the frame / column hairlines around and inside the
//                            table come from the neutral border ramp instead of
//                            a colour (a coloured 3:1 border desaturates into
//                            grey-green, so the ramp is the honest choice)
//       blockquote fill         aqua tint into bg-base (8%)
//       session row warn / done   solid fill from the palette's own bg_yellow /
//                            bg_green. The waiting row is the one status surface
//                            whose hue sits next to Everforest's warm canvas, so
//                            on the light strengths it is deepened toward
//                            fg.yellow until it reads as a band, while the dark
//                            variants invert: a bright amber surface carrying the
//                            scheme's deep contrast ink (2026-10-24 restyle and
//                            follow-ups, design doc §13.8.1); hover is one step
//                            stronger.
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
//     row puts on `<body>`) plus the element rules that consume the variables and
//     the literal rules (heading emphasis, blockquote shape, table frame/grid).
//
// The formulas and expected values are the ones validated by the 2026-10-23
// "中彩" preview (`.tmp/color-mode-preview`); the role colours are pinned by
// `tests/color-mode.test.mjs` and hard-gated in `scripts/check-contrast.mjs`.
// The 2026-10-24 status-row restyle keeps the solid fill of 0.4.0 but takes the
// fill colours straight from Everforest's palette1 background accents (`bg_red` /
// `bg_green`); both an sRGB-derived and an OKLab-derived tint were rejected in
// visual review, the palette colours are the upstream's own status surfaces.
// 2026-10-24 follow-up: the user read the waiting row's red as an error, so the
// waiting fill is now `bg_yellow` (dots stay orange; "warn" keeps its hue family
// between the yellow dot ring and the warm canvas). See design doc §13.8 / §13.9.
//
// The module is a pure ESM source: no DOM, no storage, no state. `node --test`
// imports it directly and `scripts/build.mjs` bundles it into `client.js`
// (`src/client-entry.js` owns the DOM side).

import { DEFAULT_STATE, SCHEMES, STRENGTHS, VARIANT_NAMES, resolvePalette } from './palette.js'
import { contrastRatio, labLightness, mix } from './color.js'
import { tokensFor } from './tokens.js'

/**
 * The `data-*` attributes the Client sets on `document.documentElement`.
 * `mode` is always `'on'` in this version (the stylesheet's scope anchor);
 * `light` / `dark` carry each scheme's strength so the stylesheet can pick the
 * matching variant without a JS lookup per frame.
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
 * @property {string} rowWarn - session row waiting for the user: solid fill from
 *   the palette's `bg_yellow`, deepened toward `fg.yellow` on the light
 *   strengths until it separates from the sidebar; the dark variants use a bright
 *   amber surface with the deep contrast ink instead (design doc §13.8.1).
 * @property {string} rowWarnHover - `rowWarn` moved toward `fg.yellow` (re-guarded).
 * @property {string} rowDone - finished, not yet opened session row: solid fill
 *   from the palette's `bg_green`.
 * @property {string} rowDoneHover - `rowDone` with the fill one step stronger.
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

/**
 * Session-row fills come straight from Everforest's palette1 background
 * accents (sainnhe/everforest `palette.md`): `bg_yellow` for a waiting row,
 * `bg_green` for a finished one. These are the upstream's own dedicated status
 * surfaces, so the hue never drifts the way a derived tint does (the 0.4.0 sRGB
 * blend read as neutral grey; an OKLab-derived tint still looked off in dark
 * mode — 2026-10-24 user reports). Both schemes use the palette pair; the
 * contrast guard only nudges when a soft-strength value misses 4.5:1.
 */
const ROW_RAMP = {
  warn: { fill: 'bgYellow', accent: 'yellow' },
  done: { fill: 'bgGreen', accent: 'green' }
}

/** How far a hovered row moves toward its accent (re-guarded to 4.5:1). */
const ROW_HOVER_TINT = 0.16

/**
 * Minimum CIE L* step between a waiting-row fill and the sidebar. `bg_yellow`
 * is the one palette status surface whose hue sits next to Everforest's warm
 * canvas (and its light strengths are only ~1 L* away from the sidebar), so the
 * palette value alone reads as "no background" in light. The fill is deepened
 * toward `fg.yellow` until it clears this floor, stopping where the 4.5:1 text
 * gate runs out — light·soft has no headroom and therefore keeps the palette
 * hue only (same ceiling as the active-session row, design doc §15). Dark values
 * already clear the floor and stay palette-exact.
 */
const ROW_WARN_SEPARATION = 3.5

/**
 * Deepen a row fill toward its accent until it is `target` L* away from the
 * sidebar, keeping the last step that still passes the text gate.
 * @param {string} color - guarded palette fill.
 * @param {string} sidebar - the sidebar surface the row sits on.
 * @param {string} ink - the row's text colour.
 * @param {string} accent - accent the fill is deepened toward.
 * @param {number} target - minimum CIE L* distance from the sidebar.
 * @returns {string}
 */
function liftWarnFill (color, sidebar, ink, accent, target) {
  const distance = (fill) => Math.abs(labLightness(fill) - labLightness(sidebar))
  if (distance(color) >= target) return color
  let best = color
  for (let weight = 0.01; weight <= 1.0001; weight += 0.01) {
    const next = mix(color, accent, weight)
    if (contrastRatio(ink, next) < SURFACE_CONTRAST) break
    best = next
    if (distance(next) >= target) return next
  }
  return best
}

/**
 * How far the dark waiting-row amber is pulled from `fg.yellow` toward the
 * scheme's deep canvas (`bgDim`). 22% keeps it a clearly yellow surface while
 * staying inside the inverted-ink gate (measured 5.0–5.8:1; design §13.8.1).
 */
const ROW_WARN_AMBER = 0.22

/**
 * Pull a light surface toward the deep canvas until the deep contrast ink
 * (`--dsw-alias-label-primary-inverted`, i.e. `bgDim`) keeps `SURFACE_CONTRAST`.
 * This is the guard for the dark waiting row, whose bright amber surface carries
 * the inverted ink instead of `label-primary`.
 * @param {string} color - surface colour.
 * @param {string} ink - deep contrast ink.
 * @param {string} bgDim - the scheme's deepest canvas.
 * @returns {string}
 */
function readableDeepInk (color, ink, bgDim) {
  if (contrastRatio(ink, color) >= SURFACE_CONTRAST) return color
  for (let weight = 0.01; weight <= 1.0001; weight += 0.01) {
    const next = mix(color, bgDim, weight)
    if (contrastRatio(ink, next) >= SURFACE_CONTRAST) return next
  }
  return mix(color, bgDim, 1)
}

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

/**
 * Pull a row fill toward the scheme's canvas (`bg0`) until `label-primary`
 * keeps `SURFACE_CONTRAST`. Blending toward `bg0` is safe in both directions:
 * dark canvases darken the fill, light canvases lighten it, so the guard never
 * guesses a direction.
 * @param {string} color - palette background accent.
 * @param {string} bg0 - scheme's deepest background.
 * @param {string} ink - text colour the surface must stay readable with.
 * @returns {string}
 */
function readableRowFill (color, bg0, ink) {
  if (contrastRatio(ink, color) >= SURFACE_CONTRAST) return color
  for (let weight = 0.02; weight <= 1.0001; weight += 0.02) {
    const next = mix(color, bg0, weight)
    if (contrastRatio(ink, next) >= SURFACE_CONTRAST) return next
  }
  return mix(color, bg0, 1)
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
    const palette = resolvePalette(state)[scheme]
    const fg = palette.fg
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
    // Status dots sit on both the canvas and the sidebar.
    const dotWarn = guardTo(fg.orange, [bg, sidebar], DOT_CONTRAST, ink)
    const dotDone = guardTo(fg.green, [bg, sidebar], DOT_CONTRAST, ink)
    /**
     * Session-row fill from the palette's `bg_yellow` / `bg_green`. The light
     * waiting rows are deepened toward their accent when the palette value sits
     * too close to the sidebar (§13.8.1); the dark waiting rows invert instead —
     * a bright amber surface that carries the scheme's deep contrast ink, because
     * Everforest's dark `bg_yellow` cannot read as yellow under the light ink.
     * Hover moves the fill one accent step further and is re-guarded, so the four
     * fills stay on one ramp.
     */
    const rowFill = (preset) => {
      const warn = preset.startsWith('warn')
      const ramp = ROW_RAMP[warn ? 'warn' : 'done']
      if (warn && scheme === 'dark') {
        const deepInk = pick('--dsw-alias-label-primary-inverted')
        const amber = readableDeepInk(
          mix(fg.yellow, palette.ramp.bgDim, ROW_WARN_AMBER),
          deepInk,
          palette.ramp.bgDim
        )
        if (!preset.endsWith('Hover')) return amber
        return readableDeepInk(mix(amber, fg.yellow, ROW_HOVER_TINT), deepInk, palette.ramp.bgDim)
      }
      const paletteFill = readableRowFill(palette.ramp[ramp.fill], palette.ramp.bg0, labelPrimary)
      const fill = warn
        ? liftWarnFill(paletteFill, sidebar, labelPrimary, fg[ramp.accent], ROW_WARN_SEPARATION)
        : paletteFill
      if (!preset.endsWith('Hover')) return fill
      const hover = mix(fill, fg[ramp.accent], ROW_HOVER_TINT)
      return readableRowFill(hover, palette.ramp.bg0, labelPrimary)
    }
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
      rowWarn: rowFill('warn'),
      rowWarnHover: rowFill('warnHover'),
      rowDone: rowFill('done'),
      rowDoneHover: rowFill('doneHover'),
      // Status dots sit on both the canvas and the sidebar.
      dotWarn,
      dotDone
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
 * Map the current palette pair onto the `data-*` attributes for
 * `document.documentElement`. The mode attribute is always `"on"` — color mode
 * is a shipped default since 2026-10-24, not a toggle; the strengths are passed
 * through as-is (the Client keeps them normalized).
 * @param {{ light: string, dark: string }} state
 * @returns {Record<string, string>}
 */
export function colorModeDataset (state) {
  return {
    [COLOR_MODE_ATTRS.mode]: 'on',
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

/**
 * Every element rule is scoped to the mode attribute, which this version always
 * sets to `"on"` — the anchor keeps the stylesheet out of the plain-token layer.
 */
const COLOR_MODE_ON = `html[${COLOR_MODE_ATTRS.mode}="on"]`

/** Markdown content container (DSH hashes the class, `markdown` stays a substring). */
export const MARKDOWN_SCOPE = `${COLOR_MODE_ON} [class*="markdown"]:not([data-markdown-variant="compact"])`

/**
 * The horizontal-scroll wrapper DSH wraps around every markdown table. It is
 * the frame that carries the table's outer border (a collapsed table cannot
 * paint a rounded outer border itself) and keeps the scroller's clipping.
 */
const TABLE_FRAME = `${MARKDOWN_SCOPE} [class*="tableScroll"]`

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
 * more specific than the base rule, so the stronger fill wins while hovered.
 * @param {'warning' | 'done'} state
 * @returns {string}
 */
function sessionRowHover (state) {
  return `${sessionRow(state)}:hover`
}

/**
 * Dark waiting-row ink scope. The bright amber fill carries the scheme's deep
 * contrast ink (`--dsw-alias-label-primary-inverted`), so the title inherits it
 * and the trailing label / status dot are switched to `inherit`. The DSH class
 * names are CSS-module hashes, matched by their stable `_time` / `data-state`
 * suffix the same way the `markdown` container above is matched.
 */
const DARK_WARN_ROW = `${COLOR_MODE_ON} body[data-ds-dark-theme] [role="treeitem"][data-row-key^="session:"]:has([data-state="warning"]):not([aria-selected="true"])`

/**
 * [selector, CSS property, role key] for every variable-driven element rule.
 * Order matters where two rules can hit the same element: the table-row hover
 * rule must follow the zebra rule, and each session-row hover fill must follow
 * its base fill.
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
  [sessionRowHover('warning'), 'background-color', 'rowWarnHover'],
  [sessionRow('done'), 'background-color', 'rowDone'],
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
  [`${MARKDOWN_SCOPE} blockquote`, [['padding-right', '12px'], ['border-radius', '0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0']]],
  // Table frame and column rules. DSH's table only draws horizontal cell rules,
  // so without them a table reads as a list of loose rows. Fill tables are 100%
  // wide, so their scroll wrapper can carry the outer border (and clip it to a
  // rounded rectangle). Wide tables are different: DSH deliberately "bleeds"
  // `.md-table-wide` over the chat scroll area (`width: 100% + lead + spare`,
  // negative margin-left plus an equal padding-left so the table content stays
  // aligned with the text column) and hides the horizontal scrollbar until the
  // pointer hovers the wrapper. Re-box the wrapper onto the table so it becomes
  // a plain `overflow-x: auto` viewport of the text column: `width: max-content`
  // hugs a fitting table, `max-width: 100%` pins the right edge to the text
  // column's right edge, `margin-left: 0` / `padding-left: 0` drop the bleed
  // padding, and `overflow-x: auto` / `padding-bottom: 0` replace DSH's
  // hover-only scrollbar with one that appears exactly when the table is wider
  // than the column. The columns keep their natural widths and the wrapper
  // scrolls instead of wrapping them (2026-10-28 report: Element-style fixed
  // columns with a horizontal scrollbar). Width, margin-left and padding-left
  // move together; overriding any of them alone slides the table off the text
  // column (2026-10-27 misalignment report). The frame stays on the `<table>`: a
  // wrapper border would draw around the bleed area, not around the table.
  // The frame takes the stronger `l3` step and the inner column rules the `l2`
  // step so the outer edge stays readable over the header band and zebra fills;
  // both are hairlines, like DSH's own cell rules. The first / last cell padding
  // that DSH zeroes for its borderless look is restored so text does not touch
  // the frame, and the last row drops its bottom rule because the frame already
  // draws it.
  [`${TABLE_FRAME}.md-table-wide`, [
    ['width', 'max-content'],
    ['max-width', '100%'],
    ['margin-left', '0'],
    ['padding-left', '0'],
    ['overflow-x', 'auto'],
    ['padding-bottom', '0']
  ]],
  [`${TABLE_FRAME}:not(.md-table-wide)`, [['border', '.5px solid var(--dsw-alias-border-l3)'], ['border-radius', 'var(--dsw-radius-sm)']]],
  [`${TABLE_FRAME}.md-table-wide > table`, [['border', '.5px solid var(--dsw-alias-border-l3)']]],
  [`${TABLE_FRAME} th, ${TABLE_FRAME} td`, [['border-right', '.5px solid var(--dsw-alias-border-l2)']]],
  [`${TABLE_FRAME} th:last-child, ${TABLE_FRAME} td:last-child`, [['border-right', '0']]],
  [`${TABLE_FRAME} tbody tr:last-child > td`, [['border-bottom', '0']]],
  [`${TABLE_FRAME} th:first-child, ${TABLE_FRAME} td:first-child`, [['padding-left', '16px']]],
  [`${TABLE_FRAME} td:last-child`, [['padding-right', '16px']]],
  // Horizontal scrollbar of a scrolled table (2026-10-29 request: "make it
  // thicker on hover, easier to grab", then "add a transition animation").
  // The visible thumb stays the same 5px pill DSH paints, sitting directly under
  // the table, but the reserved track is 10px: the thumb box (and with it the
  // grab target) spans the whole track, and a transparent bottom border insets
  // the painted pill to 5px at the top of the track. The track height never
  // changes, so the pill grows downward without moving the table or the content
  // below it. The inset is a custom property because the hover transition is
  // driven by `src/table-scrollbar.js`: Chromium never runs a CSS transition or
  // animation on a scrollbar pseudo-element (a 10s `transition` is parsed but no
  // Web Animation starts and the paint jumps to the end state, verified
  // 2026-10-29), while pointer events over the native scrollbar are delivered to
  // this element and this property is inherited by the scrollbar
  // pseudo-element — so the module animates the inset frame by frame. Colours
  // stay DSH's (`--dsh-scrollbar-thumb` / `--dsh-scrollbar-thumb-hover` through
  // the theme token layer), and `background-clip: content-box` is re-asserted so
  // the transparent border is not painted over.
  [`${TABLE_FRAME}::-webkit-scrollbar`, [['height', '10px']]],
  [`${TABLE_FRAME}::-webkit-scrollbar-thumb`, [['border-top', '0'], ['border-bottom', 'var(--everforest-table-scrollbar-inset, 5px) solid transparent'], ['background-clip', 'content-box']]],
  // Dark waiting rows: deep contrast ink on the amber surface (design §13.8.1).
  // The row actions that appear on hover (the "…" menu, archive, pin) carry
  // `label-tertiary` / `label-primary` and would vanish on the amber fill, so
  // they get the deep ink too.
  [DARK_WARN_ROW, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_time"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [data-state="warning"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_iconButton"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_iconButton"]:hover`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_pinIndicator"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]]
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
