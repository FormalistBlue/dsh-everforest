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
//       marker / quote / hr     green (2026-11-15 request: the markdown decoration
//                            family is the theme green, not the aqua accent)
//       checkbox                 green as well, both schemes (same request); a solid
//                            fill carrying a canvas-colour check mark — cream on
//                            the light green, the deep slate on the dark one. DSH
//                            marks every task-list box `disabled` and Chromium
//                            greys a disabled native control, so the box is drawn
//                            instead of accent-coloured
//       table band / zebra / hover   green tints into bg-base (14% / 6% / 10%);
//                            the frame / column hairlines around and inside the
//                            table come from the neutral border ramp instead of
//                            a colour (a coloured 3:1 border desaturates into
//                            grey-green, so the ramp is the honest choice)
//       blockquote fill         green tint into bg-base (8%, the marker hue —
//                            2026-11-15, it was the aqua tint until the
//                            decoration family moved to the theme green)
//       session row warn / done   solid fill from the palette's own bg_yellow /
//                            bg_green. The waiting row is the one status surface
//                            whose hue sits next to Everforest's warm canvas, so
//                            on the light strengths it is deepened toward
//                            fg.yellow until it reads as a band, while the dark
//                            variants invert: a bright amber surface carrying the
//                            scheme's deep contrast ink (2026-10-24 restyle and
//                            follow-ups, design doc §13.8.1); hover is one step
//                            stronger. light·soft's finished row cannot use the
//                            palette wash (it lands 0.08 L* from the sidebar), so
//                            it is tinted from fg.blue over white instead and runs
//                            on that variant's own 4.2 floor — the hue carries the
//                            state (§34, deepened in §35). Its waiting row has the
//                            opposite problem — the palette yellow lands 0.04 L*
//                            from the cream sidebar and there is no hue step to
//                            spend either — so it takes its own 4.2 / 4.1 pair and
//                            is deepened along bg_yellow → fg.yellow (§37).
//       status dots warn / done orange / blue, guarded on bg-base AND sidebar
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
// 2026-10-30: the task-list checkbox stopped being a native `accent-color` box.
// DSH renders every task-list item's checkbox `disabled`, and Chromium ignores
// `accent-color` on a disabled control (native grey), so the user's report
// ("复选框的样式可以优化一下，不需要做成灰色，可以带上颜色") could not be met by a
// colour token: the box is redrawn with the accent hue and the redundant list
// marker is dropped. The first pass coloured every variant blue; the same-day
// review accepted the dark boxes and asked the light ones to try green, so light
// took `fg.aqua` and dark kept `fg.blue`. 2026-11-15: the whole decoration family
// (`marker` / `quote` / `hr` / `check`) moved to `fg.green`, the theme green, at
// the user's request. See `TASK_CHECKBOX`.
// 2026-11-18: the dark check mark was briefly re-inked white; 2026-11-19 the user
// asked for the dark tick back ("dark 模式下，中间的勾勾用黑色显示"), so both
// schemes read the scheme canvas again. See design §48 / §51.
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
 * @property {string} marker - list bullet / ordered-list number colour (green).
 * @property {string} quote - blockquote left border (green, the marker role).
 * @property {string} hr - horizontal-rule fill (green, the marker role).
 * @property {string} check - task-list checkbox accent: the theme green in every
 *   variant (2026-11-15 request — it used to be light aqua / dark blue). The
 *   checked box's fill and border; the idle box is a lighter outline over a tint
 *   of the same colour, and the check mark itself is the canvas `bg-base`.
 *   DSH's box is always `disabled`, so Chromium ignores `accent-color` and the
 *   control is drawn by the stylesheet instead.
 * @property {string} band - table-header background band (green tint).
 * @property {string} zebra - even table-row stripe (lighter green tint).
 * @property {string} tableHover - hovered table row (green tint).
 * @property {string} tableHandle - chat-table column-resize handle, i.e. the 2px
 *   guide drawn on a draggable column boundary. The palette's `header_aqua`:
 *   one step deeper than the `fg.aqua` accent, so the line reads as a calm green
 *   on the header band in both schemes (2026-10-30: the accent aqua was too
 *   bright on the dark header band and too vivid on the light one).
 * @property {string} quoteBg - blockquote fill (green tint, the marker hue).
 * @property {string} rowWarn - session row waiting for the user: solid fill from
 *   the palette's `bg_yellow`, deepened toward `fg.yellow` on the light
 *   strengths until it separates from the sidebar; the dark variants use a bright
 *   amber surface with the deep contrast ink instead (design doc §13.8.1).
 *   light·soft cannot separate on hue (the cream sidebar is the same yellow
 *   family), so it runs on its own 4.2 / 4.1 pair and takes the deeper step (§37).
 * @property {string} rowWarnHover - `rowWarn` moved toward `fg.yellow` (re-guarded).
 * @property {string} rowDone - finished, not yet opened session row: solid fill
 *   from the palette's `bg_blue`. Blue came back on 2026-11-08 (design §22): the
 *   open session row owns the green accent band, and the "finished,
 *   not read" row must stay out of that hue; `bg_blue` is the palette1 status
 *   surface the plugin used before the green accent pass. light·soft is the
 *   exception: the cream sidebar leaves that wash no lightness room, so its fill
 *   is a pale tint of `fg.blue` over white (2026-11-15, design §34; deepened the
 *   same day to that variant's 4.2 floor, §35).
 * @property {string} rowDoneHover - `rowDone` with the fill one step stronger.
 * @property {string} dotWarn - waiting session status dot (orange).
 * @property {string} dotDone - finished session status dot (blue).
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
 * `bg_blue` for a finished one. These are the upstream's own dedicated status
 * surfaces, so the hue never drifts the way a derived tint does (the 0.4.0 sRGB
 * blend read as neutral grey; an OKLab-derived tint still looked off in dark
 * mode — 2026-10-24 user reports). The finished row moved from `bg_green` to
 * `bg_blue` on 2026-11-08 (design §22): green now marks the open session row, so
 * the status surfaces keep blue for "finished, not read". Both schemes use the
 * palette pair; the contrast guard only nudges when a soft-strength value misses
 * 4.5:1.
 */
const ROW_RAMP = {
  warn: { fill: 'bgYellow', accent: 'yellow' },
  done: { fill: 'bgBlue', accent: 'blue' }
}

/** How far a hovered row moves toward its accent (re-guarded to 4.5:1). */
const ROW_HOVER_TINT = 0.16

/**
 * Minimum CIE L* step between a waiting-row fill and the sidebar. `bg_yellow`
 * is the one palette status surface whose hue sits next to Everforest's warm
 * canvas (and its light strengths are only ~1 L* away from the sidebar), so the
 * palette value alone reads as "no background" in light. The fill is deepened
 * toward `fg.yellow` until it clears this floor, stopping where the 4.5:1 text
 * gate runs out. Dark values already clear the floor and stay palette-exact.
 */
const ROW_WARN_SEPARATION = 3.5

/**
 * Text gates of the light·soft waiting row (`ROW_WARN_TINT_TARGET` resting,
 * `ROW_WARN_HOVER_TARGET` hovered).
 *
 * This is the one row where a hue step is not available at all: light `bg_blue`
 * at least reads as blue against cream, but a pale yellow on the warm cream
 * sidebar (`#eee7ce`) is the same hue family, so the L* step has to carry the
 * whole state. At 4.5:1 the fill only reaches ΔL* −0.04 (i.e. `#f2e6c9`, the
 * 2026-11-15 report "待回答的会话的背景黄色太不明显了"), because the palette
 * wash already sits on the gate. Deepening along `bg_yellow` → `fg.yellow` to
 * 4.2 / 4.1:1 buys ΔL* −2.4 / −3.4 and lifts the chroma from 15.6 to ~25, i.e.
 * a band that reads as yellow — the same sub-4.5 trade-off this variant already
 * makes for its finished row (4.39/4.25, §35) and its diff rows (4.1, §13.7).
 * Every other variant keeps 4.5:1.
 */
const ROW_WARN_TINT_TARGET = 4.2
const ROW_WARN_HOVER_TARGET = 4.1

/**
 * Minimum CIE L* step between a finished-row fill (`bg_blue`) and the sidebar.
 * Light `bg_blue` is a near-canvas wash and dark·soft lands only ~3 L* from the
 * sidebar, so the fill is deepened toward `fg.blue` until it clears this floor,
 * stopping where the 4.5:1 text gate runs out. That is the same ramp the blue
 * selected row used before 2026-11-07 (design §15), so the "finished, not read"
 * row keeps the look the user asked back on 2026-11-08 (design §22).
 */
const ROW_DONE_SEPARATION = 4.5

/**
 * Where the light·soft "finished" row tint starts on the white → `fg.blue` line
 * before the ink gate backs it off (see `doneRowTint`).
 */
const ROW_DONE_TINT_START = 0.3

/**
 * Text gate for the light·soft "finished" row, per state.
 *
 * This is the one row pair that sits below the 4.5:1 surface gate. The 2026-11-15
 * tint (`#dcecf5`, 4.62:1) still read as "a bit bright" against the cream sidebar
 * (2026-11-15 follow-up), and at 4.5:1 the white → `fg.blue` line has only
 * 0.12 of contrast left to spend — i.e. no visible depth at all. The pair is
 * therefore deepened to 4.35 / 4.25:1: still ~1.5 above the 3:1 decorative floor,
 * the documented ceiling of this scheme (the same trade-off as its diff rows at
 * 4.1:1, design §35). Every other variant keeps the 4.5:1 gate.
 */
const ROW_DONE_TINT_TARGET = 4.35

/**
 * One further step for `rowDoneHover`, so the resting row keeps the same
 * 0.10 contrast interval the other variants use (light·hard is 4.58 / 4.52).
 */
const ROW_DONE_HOVER_TARGET = 4.25

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
function liftRowFill (color, sidebar, ink, accent, target) {
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
 * until `ink` keeps `min` contrast on the result. The weight is never
 * increased, so a too-strong start simply returns the untinted base.
 * @param {string} base - surface colour (`bg-base` or the sidebar fill).
 * @param {string} tint - accent hue blended into it.
 * @param {number} start - maximum tint weight (0-1).
 * @param {string} ink - text colour the surface must stay readable with.
 * @param {number} [min=SURFACE_CONTRAST] - contrast the tint has to keep.
 * @returns {string}
 */
function safeTint (base, tint, start, ink, min = SURFACE_CONTRAST) {
  let weight = start
  let value = mix(base, tint, weight)
  while (weight > 0 && contrastRatio(ink, value) < min) {
    weight = Math.round((weight - 0.01) * 100) / 100
    value = mix(base, tint, weight)
  }
  return value
}

/**
 * The light·soft "waiting" row fill: the palette `bg_yellow` deepened toward
 * `fg.yellow` until the row ink reaches `target`.
 *
 * The other light strengths stop deepening at the 4.5:1 gate; this variant cannot
 * (see `ROW_WARN_TINT_TARGET`), so the pair is taken down to 4.2 / 4.1:1 instead.
 * The fill keeps the palette hue as its starting point (no white anchor: unlike
 * the finished row, going lighter than the cream sidebar would only wash the
 * yellow out) and walks toward the waiting accent one 1% step at a time, keeping
 * the last step that still passes the gate — the same construction as
 * `readableRowFill` / `liftRowFill`, just on a lower floor.
 * @param {string} base - the palette `bg_yellow` wash.
 * @param {string} accent - `fg.yellow`, the waiting accent.
 * @param {string} ink - the variant's `label-primary`.
 * @param {number} target - contrast the fill has to keep with `ink`.
 * @returns {string}
 */
function warnRowTint (base, accent, ink, target) {
  let best = base
  for (let weight = 0.01; weight <= 0.5001; weight += 0.01) {
    const next = mix(base, accent, weight)
    if (contrastRatio(ink, next) < target) break
    best = next
  }
  return best
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

/**
 * The light·soft "finished" row tint: the status blue mixed into the white
 * anchor, deepened until `label-primary` reaches the variant's own gate.
 *
 * The palette `bg_blue` wash has no room on the cream sidebar. Light `bg_blue`
 * `#E1E7DD` is already at 4.44:1 with `label-primary`, so `readableRowFill` has
 * to pull it toward the warm `bg0` until the gate passes — and the resulting
 * `#E6E8DA` sits **0.08 L\*** from the sidebar, i.e. the row reads as "no
 * background" (2026-11-15 user report: "蓝色的已完成的蓝色背景颜色有点不显眼").
 * Raising the tint's lightness is not available either (the sidebar is already
 * the light end of the ramp). The state is carried by *hue* instead: a tint of
 * the same `fg.blue` the status dot uses, so the band is blue at the sidebar's
 * own luminance while the dot and the trailing label stay exactly where they
 * were.
 *
 * The 2026-11-15 first landing pinned the tint at 4.62:1 and the user then asked
 * for it "a little deeper" (same day), so the weight is no longer capped by
 * 4.5:1: `target` is the pair's own gate (see `ROW_DONE_TINT_TARGET`).
 * @param {string} blue - the scheme's `fg.blue` (the "finished" status hue).
 * @param {string} ink - the variant's `label-primary`.
 * @param {number} target - contrast the tint has to keep with `ink`.
 * @returns {string}
 */
function doneRowTint (blue, ink, target) {
  return safeTint('#ffffff', blue, ROW_DONE_TINT_START, ink, target)
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
    const quoteBg = safeTint(bg, fg.green, QUOTE_TINT, labelPrimary)
    /** Canvas + every surface a piece of markdown text can sit on. */
    const textSurfaces = [bg, band, zebra, tableHover, quoteBg]

    // The decoration family (list bullets and ordered-list numbers, the
    // blockquote bar, the `hr` rule, the task-list checkbox) takes the palette's
    // green. 2026-11-15 request: "对话中的 markdown 格式内容的颜色、分隔线、勾选框、
    // list 前面的符号或者数字，都改为使用主题的绿色" — they were aqua (`#83C092` in
    // dark), and the checkbox was aqua in light / blue in dark, i.e. the one part
    // of the markdown palette that did not read as the theme's green. Green is the
    // same guard h4 uses, so in dark the family is exactly `#A7C080` (the brand
    // green) and in light it is the guarded `fg.green` the h4 heading already
    // carries. The blockquote fill follows the bar: a green bar over an aqua wash
    // would leave the mint accent behind in the one element the bar belongs to.
    const marker = guardTo(fg.green, [bg], DECORATION_CONTRAST, ink)
    // The column-resize handle takes the palette's `header_aqua` instead of the
    // accent `aqua`: same hue, one step deeper (`#569D79` in both schemes), so
    // the 2px guide stays a calm green on the header band instead of the bright
    // accent (2026-10-30 request). Deliberately not guarded — lifting it toward
    // the ink would restore the brightness this role exists to remove, and a
    // 2px line is outside the text gates.
    const tableHandle = fg.headerAqua
    // Status dots sit on both the canvas and the sidebar.
    const dotWarn = guardTo(fg.orange, [bg, sidebar], DOT_CONTRAST, ink)
    const dotDone = guardTo(fg.blue, [bg, sidebar], DOT_CONTRAST, ink)
    /**
     * Session-row fill from the palette's `bg_yellow` / `bg_blue`. The light
     * waiting rows are deepened toward their accent when the palette value sits
     * too close to the sidebar (§13.8.1); the dark waiting rows invert instead —
     * a bright amber surface that carries the scheme's deep contrast ink, because
     * Everforest's dark `bg_yellow` cannot read as yellow under the light ink.
     * Finished rows use the `bg_blue` status surface and are deepened toward
     * `fg.blue` until they clear the visibility floor (§22). Hover moves the fill
     * one accent step further and is re-guarded, so the fills stay on one ramp.
     * light·soft is the exception: the cream sidebar leaves the `bg_blue` wash no
     * lightness room at all, so its finished row is tinted from the status blue
     * itself (`doneRowTint`) at that variant's own 4.2 gate (§35), and its waiting
     * row — whose palette yellow is the same hue as the sidebar — is deepened
     * toward the waiting accent on its own 4.2 / 4.1 pair (`warnRowTint`, §37).
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
      if (warn && scheme === 'light' && strength === 'soft') {
        return warnRowTint(
          palette.ramp.bgYellow,
          fg.yellow,
          labelPrimary,
          preset.endsWith('Hover') ? ROW_WARN_HOVER_TARGET : ROW_WARN_TINT_TARGET
        )
      }
      if (!warn && scheme === 'light' && strength === 'soft') {
        return doneRowTint(
          fg.blue,
          labelPrimary,
          preset.endsWith('Hover') ? ROW_DONE_HOVER_TARGET : ROW_DONE_TINT_TARGET
        )
      }
      const paletteFill = readableRowFill(palette.ramp[ramp.fill], palette.ramp.bg0, labelPrimary)
      const fill = liftRowFill(
        paletteFill,
        sidebar,
        labelPrimary,
        fg[ramp.accent],
        warn ? ROW_WARN_SEPARATION : ROW_DONE_SEPARATION
      )
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
      tableHandle,
      // Task-list checkbox: the theme green in both schemes (2026-11-15 request;
      // it used to be light = aqua, dark = blue). Guarded on every surface the box
      // can be drawn on, like the accent text.
      check: guardTo(fg.green, textSurfaces, DECORATION_CONTRAST, ink),
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

/**
 * Markdown content container (DSH hashes the class, `markdown` stays a substring).
 */
const MARKDOWN_CONTAINER = '[class*="markdown"]:not([data-markdown-variant="compact"])'

/** The markdown container behind the always-on colour-mode gate. */
export const MARKDOWN_SCOPE = `${COLOR_MODE_ON} ${MARKDOWN_CONTAINER}`

/**
 * The horizontal-scroll wrapper DSH wraps around every markdown table. It is
 * the frame that carries the table's outer border (a collapsed table cannot
 * paint a rounded outer border itself) and keeps the scroller's clipping.
 */
const TABLE_FRAME = `${MARKDOWN_SCOPE} [class*="tableScroll"]`

/**
 * The task-list checkbox. DSH renders every task-list item's box as
 * `<input type="checkbox" disabled>` (web-frontend bundle, list-item renderer),
 * and Chromium ignores `accent-color` on a disabled control: the box is painted
 * with the native grey instead of the accent (verified 2026-10-30 in the shared
 * debug Chrome — an accent-coloured disabled checkbox still rendered grey). The
 * colour therefore has to be drawn, not delegated: the native appearance is
 * removed and the box takes an accent-tinted border / fill, with the check mark
 * as an `::after` border pair in the canvas colour.
 */
const TASK_CHECKBOX = `${MARKDOWN_SCOPE} input[type="checkbox"]`

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
  [`${TASK_CHECKBOX}:checked`, 'background-color', 'check'],
  [`${TASK_CHECKBOX}:checked`, 'border-color', 'check'],
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
 * box does not press against its text. They follow the colour rules so
 * the `inherit` wins over `strong` / `em`.
 * @type {Array<[string, Array<[string, string]>]>}
 */
const LITERAL_RULES = [
  [`${MARKDOWN_SCOPE} :where(h1,h2,h3,h4,h5,h6) :is(strong,em)`, [['color', 'inherit']]],
  // The tinted quote fill should not start and end on the text line: DSH gives
  // a blockquote a left rule and left padding only, so without vertical padding
  // the aqua fill hugs the first and last line. 2px top/bottom (2026-10-30
  // request: "上下稍微加 2px padding") plus the right padding / rounded right
  // corners keep the fill off the text on every side.
  [`${MARKDOWN_SCOPE} blockquote`, [['padding-top', '2px'], ['padding-bottom', '2px'], ['padding-right', '12px'], ['border-radius', '0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0']]],
  // Task-list checkbox (2026-10-30 request: "复选框的样式可以优化一下，不需要做成
  // 灰色，可以带上颜色"). DSH keeps the list marker *and* the checkbox, so a task
  // list showed a stray bullet next to every box — the checkbox is the marker, so
  // the marker is dropped. The box itself is redrawn (see `TASK_CHECKBOX`): a 14px
  // square whose idle state is an accent outline over an accent tint and whose
  // checked state is the solid accent fill, with the check mark drawn as an
  // `::after` border pair in the canvas colour `bg-base`. The box is drawn, not
  // delegated: DSH renders every task item `disabled` and Chromium greys a
  // disabled native control out.
  [`${MARKDOWN_SCOPE} ul.contains-task-list > li.task-list-item`, [['list-style', 'none']]],
  [TASK_CHECKBOX, [
    ['-webkit-appearance', 'none'],
    ['appearance', 'none'],
    ['box-sizing', 'border-box'],
    ['width', '14px'],
    ['height', '14px'],
    ['margin', '0 8px 0 0'],
    // The idle box belongs to the same family as the checked one: a 68% accent
    // hairline over a 10% accent tint, so an unchecked item still reads as part of
    // the green decoration family instead of DSH's neutral grey. The checked box
    // below is the one that turns fully solid.
    ['border', '1px solid color-mix(in srgb, var(--everforest-color-check) 68%, transparent)'],
    ['border-radius', '3px'],
    ['background-color', 'color-mix(in srgb, var(--everforest-color-check) 10%, transparent)'],
    ['vertical-align', '-2px'],
    ['position', 'relative'],
    ['cursor', 'default']
  ]],
  [`${TASK_CHECKBOX}:checked::after`, [
    ['content', '""'],
    ['position', 'absolute'],
    ['left', '3.5px'],
    ['top', '0.5px'],
    ['width', '4px'],
    ['height', '8px'],
    // Canvas ink in both schemes: cream on the light green, the deep slate on the
    // dark one (6.88 / 6.23 / 5.62:1 there). 2026-11-19: the dark white tick that
    // ran between 11-18 and this change is reverted — the user asked for the black
    // tick back (design §51).
    ['border', 'solid var(--dsw-alias-bg-base)'],
    ['border-width', '0 1.5px 1.5px 0'],
    ['transform', 'rotate(42deg)']
  ]],
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
  // both are hairlines, like DSH's own cell rules. DSH's 16px cell padding reads
  // a little loose once the frame is drawn, so every cell gets a 12px left inset
  // (2026-10-30 request); the last cell's right padding that DSH zeroes for its
  // borderless look is restored to 16px so text does not touch the frame, and
  // the last row drops its bottom rule because the frame already draws it.
  // DSH also floors every cell at `min-width: 100px` (content box), which the
  // 12/16px padding turns into a ~128px column: even a one-digit `#` column
  // could not get narrower than that (2026-11-04 report). The plugin's own
  // minimum is the 64px border-box width its drag stops at, so the content
  // floor is 64 - 12 - 16 = 36px, kept as a calc so it follows the padding; the
  // `max-width: min(30vw, 320px)` cap is untouched, so long cells wrap exactly
  // where they used to and a table still keeps its natural widths and scrolls.
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
  [`${TABLE_FRAME} th, ${TABLE_FRAME} td`, [
    ['padding-left', '12px'],
    ['border-right', '.5px solid var(--dsw-alias-border-l2)'],
    ['min-width', 'calc(64px - 12px - 16px)']
  ]],
  [`${TABLE_FRAME} th:last-child, ${TABLE_FRAME} td:last-child`, [['border-right', '0']]],
  [`${TABLE_FRAME} tbody tr:last-child > td`, [['border-bottom', '0']]],
  [`${TABLE_FRAME} td:last-child`, [['padding-right', '16px']]],
  // The table header gets one type step above the cell text and bold (2026-10-30
  // request: "字体加大一号，粗体"). DSH renders `th` with the secondary markdown
  // step (13px at the default content size) at weight 500, which reads as just
  // another data row once the frame is drawn. The size rides DSH's own content
  // axis (`--dsh-content-font-size`, so the Settings font size still scales it)
  // and the line height stays DSH's table-head line, so the row height does not
  // change.
  [`${TABLE_FRAME} th`, [['font-size', 'var(--dsh-content-font-size, 14px)'], ['font-weight', '700']]],
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
  // The wide table's outer frame is drawn on the `<table>` (§18.1), so its
  // horizontal scrollbar sits below that frame with nothing under it. Draw the
  // missing bottom rule on the scrollbar's own track: the track only exists
  // while the table really overflows, so the rule appears exactly when the bar
  // is painted — no JS, no layout space, nothing to restore. Fill tables keep
  // their wrapper frame, so the rule is scoped to the wide re-boxing. A `.5px`
  // border rasterizes like the rest of the plugin's hairlines (1px at DPR 1,
  // one device pixel at DPR 2); a `.5px` background-gradient stop does not
  // paint at DPR 1 (verified 2026-11-10), hence a border rather than a
  // background image. The thumb's transparent bottom inset lets the rule show
  // through under the resting pill.
  [`${TABLE_FRAME}.md-table-wide::-webkit-scrollbar-track`, [['border-bottom', '.5px solid var(--dsw-alias-border-l3)']]],
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
