// Everforest "running session title" light effect for the DSH workspace list.
//
// 2026-11-15 user request: "给正在进行中的对话的左侧工作区里面的对话标题增加一下样式，
// 文字颜色改为主题绿，并且带有光影动画" — and, after the first comparison round,
// "就用方案B吧，但是浅色模式的需要调整一下，白光会让文字看不清楚".
//
// Surface: the title span of a session row that is *running* — DSH renders a
// neutral loading spinner (`StateDot(state="ongoing")`, an `<svg
// data-state="ongoing">`) in the row's leading slot while the Session is live
// (ui-workspace `Rows.tsx` `sessionStatuses`: `node.running` → `state:
// 'ongoing'`). The selected row is excluded: it is painted as the solid accent
// band with the canvas ink (`src/active-session.js`), where green text would sit
// on green fill. The color-mode "finished / needs approval" rows carry a
// `warning` / `done` dot instead, so they never match this anchor either.
//
// The effect is a glare travelling across the glyphs, out of the palette — no
// DOM change, no font / line-height / truncation change:
//
//   color: transparent + a 260% wide green gradient + background-clip: text,
//   with the band traveling right in the first 45% of each 2.4s cycle and the
//   rest of the cycle parked off-box (so the title is at rest ~55% of the time).
//
// Direction per scheme (2026-11-15 second round): the band always moves AWAY
// from the canvas, so it only ever increases contrast.
//
//   light schemes: the band DEEPENS the text green toward black 25%
//     (`#8DA101` → `#6C7C01`, 2.68 → ~4.4:1). The first round swept a pale
//     wash instead (green lifted toward `bg0`); on the cream sidebar that is a
//     white glare that leaves the glyphs at 1.29–1.46:1 — the user reported it
//     directly ("白光会让文字看不清楚"). A deeper band is the same green in
//     shadow, and it reads *better* than the resting title.
//
//   dark schemes: the band lifts the green toward white 50%
//     (`#A7C080` → `#D3E0C0`, 5.00 → ~7.2:1) — a pale glint, the direction the
//     user approved in round one.
//
// Fallbacks: the resting green is written on the same selector *without*
// `background-clip: text`, and `color: transparent` lives only inside an
// `@supports` block, so a host without text clipping still shows plain green
// text. `prefers-reduced-motion: reduce` paints the resting green and drops the
// gradient entirely.
//
// Always-on and independent of the color mode, like the other navigation
// chrome (`src/active-session.js`, `src/workspace-labels.js`): the row's state
// is a navigation signal, not markdown content.
//
// Anchors are DSH's own contracts: `[role="treeitem"]` +
// `data-row-key^="session:"` (the same the other navigation sheets use),
// `[data-state="ongoing"]` (the real StateDot markup), `aria-selected`, and the
// title's CSS-module local name `title` on a direct child of the row — never the
// hashed prefix.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'
import { mix } from './color.js'

/** The running session rows of the sidebar tree (selected rows excluded). */
export const RUNNING_SESSION_ROW =
  '[role="treeitem"][data-row-key^="session:"]:has([data-state="ongoing"]):not([aria-selected="true"])'

/**
 * The row's title cell. `ui-workspace` renders the row as
 * `slot / title / rowResting / rowActions`, and the title is the only direct
 * `span` whose CSS-module local name is `title` (the hover card's `hoverTitle`
 * and the search rows' `searchResultTitle` are not children of a session row).
 */
export const RUNNING_SESSION_TITLE = `${RUNNING_SESSION_ROW} > span[class*="title"]`

/** One full glare cycle: a 1.08s sweep followed by a 1.32s rest. */
export const RUNNING_TITLE_CYCLE_MS = 2400

/** Part of the cycle the band is travelling, in percent. The rest is a hold. */
export const RUNNING_TITLE_TRAVEL_PERCENT = 45

/** Gradient tile width relative to the title box; 260% keeps the band narrow. */
export const RUNNING_TITLE_TILE_PERCENT = 260

/** The animation name (prefixed so it cannot collide with a DSH keyframe). */
export const RUNNING_TITLE_KEYFRAMES = 'everforest-running-title'

/**
 * How far the light schemes' band deepens the green toward black (a shadow
 * pass). 28% takes `#8DA101` to `#667401`, i.e. 2.35–2.68 → 4.17–4.76:1 on the
 * three light sidebars; deeper reads as ink, shallower disappears at 14px.
 */
export const RUNNING_TITLE_LIGHT_DEEPEN = 0.28

/**
 * How far the dark schemes' band lifts the green toward white (a glint).
 * 50% takes `#A7C080` to `#D3E0C0`, i.e. 5.00 → ~7.2:1 on dark·soft.
 */
export const RUNNING_TITLE_DARK_LIFT = 0.5

/** The three rules each variant emits: fallback, glare, reduced motion. */
export const RUNNING_TITLE_RULES_PER_VARIANT = 3

/**
 * Measured resting-title floor of the light schemes: the palette text green on
 * the cream sidebar is 2.35–2.68:1 (the same trade-off the folder names already
 * carry, docs/reference/contrast.md §2h), so the gate pins the measured value.
 */
export const RUNNING_TITLE_LIGHT_RESTING_CONTRAST = 2.3

/**
 * Measured band floor of the light schemes. The band is a *shadow*: it must sit
 * clearly above the resting title (a bright band would be the white glare the
 * user rejected), so the gate pins the measured 4.17–4.76:1.
 */
export const RUNNING_TITLE_LIGHT_BAND_CONTRAST = 4.1

/**
 * Measured resting-title floor of the dark schemes: the text green on the dark
 * sidebar is 5.00–6.17:1, a real WCAG AA pair.
 */
export const RUNNING_TITLE_DARK_RESTING_CONTRAST = 4.5

/**
 * Measured band floor of the dark schemes: the glint lifts the green to
 * 7.24–8.94:1, i.e. it is always brighter than the resting title.
 */
export const RUNNING_TITLE_DARK_BAND_CONTRAST = 7.0

/**
 * The two colours of one variant's effect.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ rest: string, band: string }} both opaque `#RRGGBB`.
 */
function runningTitleFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  const rest = palette.fg.green
  const band = scheme === 'light'
    ? mix(rest, '#000000', RUNNING_TITLE_LIGHT_DEEPEN)
    : mix(rest, '#ffffff', RUNNING_TITLE_DARK_LIFT)
  return { rest, band }
}

/**
 * The six variants' colour pairs, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, { rest: string, band: string }>} keyed `light-hard` … `dark-soft`.
 */
export function runningTitleRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = runningTitleFor(scheme, strength)
    }
  }
  return roles
}

/**
 * The scope of one variant: the strength attribute the token layer writes on
 * `<html>` plus DSH's own dark-theme flag on `<body>`.
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
 * The gradient of one variant: solid green, a band, solid green — drawn on a
 * tile wider than the text box so the band can travel edge to edge.
 * @param {string} rest solid palette green.
 * @param {string} band the glare (deepened in light, lifted in dark).
 * @returns {string}
 */
function gradientOf (rest, band) {
  return `linear-gradient(100deg, ${rest} 0%, ${rest} 36%, ${band} 44%, ${band} 54%, ${rest} 62%, ${rest} 100%)`
}

/**
 * The three rules of one variant:
 *   1. the resting green on the title (also the no-`background-clip` fallback);
 *   2. the glare itself, emitted only where text clipping exists;
 *   3. the reduced-motion opt-out back to the resting green.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ rest: string, band: string }} role
 * @returns {string}
 */
function runningTitleRules (scheme, strength, role) {
  const title = `${scopeFor(scheme, strength)} ${RUNNING_SESSION_TITLE}`
  const fallback = `${title} {\n  color: ${role.rest};\n}`
  const glare = `@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  ${title} {
    color: transparent;
    background-image: ${gradientOf(role.rest, role.band)};
    background-size: ${RUNNING_TITLE_TILE_PERCENT}% 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    animation: ${RUNNING_TITLE_KEYFRAMES} ${RUNNING_TITLE_CYCLE_MS}ms linear infinite;
  }
}`
  const still = `@media (prefers-reduced-motion: reduce) {
  ${title} {
    color: ${role.rest};
    background-image: none;
    animation: none;
  }
}`
  return [fallback, glare, still].join('\n\n')
}

/**
 * The single keyframe pair shared by all six variants: the band enters from the
 * left (the tile's far edge) and parks off-box for the rest of the cycle.
 * @returns {string}
 */
function runningTitleKeyframes () {
  return `@keyframes ${RUNNING_TITLE_KEYFRAMES} {
  0% { background-position: 100% 50%; }
  ${RUNNING_TITLE_TRAVEL_PERCENT}% { background-position: 0% 50%; }
  100% { background-position: 0% 50%; }
}`
}

/**
 * The complete running-title stylesheet: six variants × three rules, plus the
 * shared keyframes block.
 * @returns {string}
 */
export function runningTitleStyles () {
  const roles = runningTitleRoles()
  const rules = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) =>
    runningTitleRules(scheme, strength, roles[`${scheme}-${strength}`])))
  return [...rules, runningTitleKeyframes()].join('\n\n')
}
