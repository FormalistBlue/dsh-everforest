// Everforest ink for the "running" spinner of a DSH workspace session row.
//
// 2026-11-18 user request (crop of the sidebar: two rows, each preceded by the
// grey ring, red box around the slot): 「没有选中，正在进行的对话，前面的转圈的
// icon，帮我改成主题绿色试试，dark和light都改」. The titles of those rows already
// carry the text green with the glare (`src/running-title.js`), so the row's
// leading ring was the last neutral glyph on an otherwise green row.
//
// Surface: the row's leading slot renders ui-primitives' `StateDot(state="ongoing")`
// while the Session is live — `<span class="…slot"><svg data-state="ongoing"
// class="_spinner_…"><g class="_spinnerMotion_…"><circle class="_spinnerTrack_…">
// <circle class="_spinnerArc_…">` (verified against the installed 0.2.2-rc.3
// bundle and the live DOM). Its own rule sets the ring's colour once, on the
// `<svg>`: `._spinner_1i3xo_37 { flex: none; color: var(--dsw-alias-label-tertiary) }`,
// and both circles then take that colour through `stroke: currentColor` (track
// `opacity: .25`, arc the animated dash). So re-pointing `color` on the svg
// recolours ring and arc together — no `stroke`, no `stroke-width`, no dash
// pattern, no animation in this sheet: DSH keeps owning the geometry.
//
// The ink is the palette *text* green `green` — the same colour as the running
// title's resting green (`src/running-title.js`) and the workspace folder names
// (`src/workspace-labels.js`), and the same role split the palette review settled
// on: `statusline1` for selected / accent *surfaces*, `fg.green` for *content*
// colouring. The lighter `statusline1` would also be a step DOWN in the light
// schemes (`#93B259` at 1.94–2.21:1, the ring is small), while the text green
// keeps the row reading as one green unit.
//
// Measured on the sidebar fill (the row's own background): dark 5.00–6.17:1,
// light 2.35–2.68:1. In the light schemes that is the palette's ceiling — the
// neutral `label-tertiary` ring it replaces sat at 2.33–2.65:1, so this change
// is a hue swap at equal-or-better contrast, not a legibility trade (the floor is
// pinned in `docs/reference/contrast.md` §2o, G25, and the gate also refuses a
// green that would come out weaker than the neutral it replaced).
//
// The selected row is deliberately excluded: there the row is the solid
// `statusline1` band and the whole leading slot is already painted with the canvas
// ink (`src/active-session.js`, 2026-11-08 「整块高亮的时候，前面这个转圈的图标
// 显示不明显」) — a green ring on a green band would vanish again. Semantic dots
// (`warning` / `done` / `error`) never match the anchor: this rule only targets
// the `ongoing` spinner, whose colour is a neutral, not a state hue.
//
// Always-on and independent of the color mode, like every other piece of
// navigation chrome: the row's state is not markdown content. The anchor is
// DSH's own contract — the session row (`src/running-title.js`'s
// `RUNNING_SESSION_ROW`, itself built from `[role="treeitem"]` +
// `data-row-key^="session:"` + `[data-state="ongoing"]` + `:not([aria-selected])`)
// plus the real `svg[data-state="ongoing"]` markup — never the hashed
// CSS-module class.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'
import { RUNNING_SESSION_ROW } from './running-title.js'

/**
 * The running spinner of an unselected session row: the real `StateDot` markup
 * (`<svg data-state="ongoing">`) inside the row's leading slot. The row anchor
 * is shared with the running-title glare so the title and the ring can never
 * cover different rows.
 */
export const RUNNING_SPINNER = `${RUNNING_SESSION_ROW} svg[data-state="ongoing"]`

/** One rule per variant: a single `color` declaration. */
export const RUNNING_SPINNER_RULES_PER_VARIANT = 1

/**
 * Measured floor of the light schemes: the text green on the cream sidebar is
 * 2.35–2.68:1 — the same palette ceiling the folder names and the running title
 * already carry (G18 / G24), and a hair better than the `label-tertiary` ring it
 * replaces (2.33–2.65:1).
 */
export const RUNNING_SPINNER_LIGHT_CONTRAST = 2.3

/**
 * Floor of the dark schemes: the same green is a real WCAG AA pair on the dark
 * sidebar (5.00–6.17:1), and the neutral ring it replaces was 3.39–4.19:1 there.
 */
export const RUNNING_SPINNER_DARK_CONTRAST = 4.5

/**
 * How far the new green may undercut the neutral `label-tertiary` ring it
 * replaces before the gate fails. The light schemes end up marginally *better*
 * (2.35 vs 2.33 on light·soft); the tolerance only absorbs the palette's own
 * rounding, so a future palette drag that makes the ring genuinely fainter than
 * today's grey still fails.
 */
export const RUNNING_SPINNER_NEUTRAL_TOLERANCE = 0.02

/**
 * The ring colour of one variant: the palette text green, untouched.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} opaque `#RRGGBB`.
 */
function runningSpinnerFor (scheme, strength) {
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme].fg.green
}

/**
 * The six ring colours, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, string>} keyed `light-hard` … `dark-soft`.
 */
export function runningSpinnerRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = runningSpinnerFor(scheme, strength)
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
 * One variant's rule: the ink only. The two circles already paint themselves
 * with `stroke: currentColor`, so the inherited colour is the whole change; the
 * track keeps DSH's own 25% opacity and the arc keeps its dash animation.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} ink opaque `#RRGGBB`.
 * @returns {string}
 */
function runningSpinnerRule (scheme, strength, ink) {
  return `${scopeFor(scheme, strength)} ${RUNNING_SPINNER} {\n  color: ${ink};\n}`
}

/**
 * The complete running-spinner stylesheet: six variants × one rule.
 * @returns {string}
 */
export function runningSpinnerStyles () {
  const roles = runningSpinnerRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      runningSpinnerRule(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
