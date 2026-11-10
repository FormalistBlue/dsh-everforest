// Ink for the chat "work steps" list (工作步骤): the per-step rows, the
// collapsible group header, the settled turn's fold summary and the expanded
// reasoning body.
//
// DSH renders every step line through ui-primitives' `DisclosureRow`, whose row
// carries
//
//   ._row_<hash> { color: var(--dsw-alias-label-tertiary) }
//   ._row_<hash>:hover { color: var(--dsw-alias-label-secondary) }
//
// (verified against the installed 0.2.2-rc.1 `dsh-web-frontend` index CSS: the
// module hash changes per build, the rule shape does not), the group header
// button is the same grey (`ChatGroupSeat.module.css`:
// `.title { color: var(--dsw-alias-label-tertiary) }`), so is the settled turn's
// fold-summary row (`TurnProcessNodeView.module.css`:
// `.root { color: var(--dsw-alias-label-tertiary) }`) and so is the expanded
// reasoning body (`MarkdownText`'s compact variant:
// `.compact { color: var(--dsw-alias-label-tertiary) }`, used only by the
// reasoning content factory). An expanded or folded turn process therefore read
// as one flat grey block.
//
// Everforest maps `label-tertiary` to the upstream muted grey `grey0` (light
// `#A6B0A0`, dark `#7A8478`), i.e. 1.88–3.54:1 on the canvas. DSH's native
// tertiary is far brighter than that on its near-black canvas, so the native
// prominence the grey was chosen for does not survive the palette mapping.
// 2026-11-10 user report (screenshot of the step list): "现在颜色太浅了，
// 看不清楚，改成和正常文字差不多的深浅".
//
// The first pass painted the list with `label-primary` verbatim (the assistant
// answer's ink). The same-day follow-up asked for hierarchy instead: "改稍微浅
// 一点点，和正文形成差距，但还是要比改之前深。包括展开的内容的文字颜色，也同样
// 处理". The ink is therefore the palette `fg` mixed `WORK_STEP_DIM` (15%) toward
// the scheme canvas `bg0`: one deliberate step below body text (7.8–8.8 CIE L*
// darker in the dark schemes, 7.8–8.8 L* lighter in the light ones) while still
// far above the old `label-tertiary`. Measured on the canvas:
//
//   light-hard 3.93:1 · light-medium 3.81:1 · light-soft 3.52:1
//   dark-hard 6.33:1 · dark-medium 5.79:1 · dark-soft 5.29:1
//
// The dark schemes keep WCAG AA. The light schemes cannot: their body text is
// already only 4.66–5.40:1 on the cream canvas, so any visible hierarchy step
// drops below 4.5 — the measured 3.5 floor is pinned in the tests as the
// user-approved trade-off (still nearly twice the old tertiary contrast). Hover
// deliberately keeps the same ink: DSH's own hover rules dim the row / header to
// `label-secondary`, which would read as a flicker back towards the old grey;
// the hover affordance keeps its icon -> chevron swap.
//
// The scope is the chat flow only, and the anchors are DSH's layout contracts,
// never the CSS-module hash prefixes:
//   - `[data-chat-flow-key]` is written on every chat flow item and on the
//     process group wrapper (`ChatView` / `ChatGroupSeat` in ui-chat);
//   - `[data-disclosure-row]` is the row element the `DisclosureRow` primitive
//     renders (its header wrapper carries `data-disclosure-header`);
//   - `[data-process-activity]` is the group header button;
//   - `[data-turn-process]` is the settled turn's fold-summary button;
//   - `[data-markdown-variant="compact"]` is the expanded reasoning body
//     (`MarkdownText`'s compact variant; ReasoningContent is its only user in
//     the installed bundles). The compact sheet makes links, code and headings
//     inherit its ink, so one rule recolours the prose without fighting the
//     syntax palette.
//
// Always-on and independent of the color mode: this is chat chrome, not
// markdown content styling (the same bucket as `src/chat-bubble.js`). The token
// layer is untouched.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'
import { mix } from './color.js'

/** One work-step row of the chat flow (`DisclosureRow`). */
export const WORK_STEP_ROW = '[data-chat-flow-key] [data-disclosure-row]'

/** The collapsible header of a grouped work-step run. */
export const WORK_STEP_GROUP_HEADER = '[data-chat-flow-key] [data-process-activity]'

/**
 * The settled turn's process summary row ("用时 … · 已调用工具 …", the disclosure
 * that folds the whole run). `TurnProcessNodeView` paints it with
 * `label-tertiary` as well, so it would otherwise stay faint next to the
 * recoloured rows and the group header.
 */
export const WORK_STEP_FOLD_SUMMARY = '[data-chat-flow-key] [data-turn-process]'

/**
 * The expanded reasoning body (the compact markdown variant). It carries its own
 * `label-tertiary`; without a rule it would stay faint under a recoloured
 * "思考" row (2026-11-10 follow-up: "包括展开的内容的文字颜色，也同样处理").
 */
export const WORK_STEP_EXPANDED_BODY = '[data-chat-flow-key] [data-markdown-variant="compact"]'

/**
 * How far the work-step ink is mixed from the scheme foreground `fg` toward the
 * canvas `bg0`. 0 = normal body text, 1 = canvas. 15% is the "slightly lighter
 * than body, but clearly readable" step of the 2026-11-10 follow-up: 7.8–8.8 CIE
 * L* away from `label-primary` in every variant.
 */
export const WORK_STEP_DIM = 0.15

/**
 * Minimum contrast the step text keeps on the chat canvas in the dark schemes
 * (measured 5.29–6.33:1 — a real WCAG AA pair).
 */
export const WORK_STEP_DARK_CONTRAST = 4.5

/**
 * Measured floor of the light schemes (3.52–3.93:1). The cream canvas has only
 * 4.66–5.40:1 of body-text headroom, so a visible hierarchy step cannot stay at
 * AA; the user asked for the hierarchy, so the measured floor is pinned instead
 * of being guarded away (still nearly twice the old `label-tertiary` contrast).
 */
export const WORK_STEP_LIGHT_CONTRAST = 3.5

/**
 * The step ink of one variant: palette `fg` mixed `WORK_STEP_DIM` toward the
 * scheme canvas `bg0` — the same anchor `--dsw-alias-label-primary` and
 * `--dsw-alias-bg-base` use.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} opaque `#RRGGBB`.
 */
function workStepInkFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return mix(palette.fg.fg, palette.ramp.bg0, WORK_STEP_DIM)
}

/**
 * The six step inks, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, string>} keyed `light-hard` … `dark-soft`.
 */
export function workStepRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = workStepInkFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body> — the same pattern as
 * `src/workspace-labels.js` and `src/hero-title.js`.
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
 * One variant's rule: the step row, the group header, the turn's fold summary
 * and the expanded reasoning body on the dimmed text ink.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} ink
 * @returns {string}
 */
function workStepRule (scheme, strength, ink) {
  const scope = scopeFor(scheme, strength)
  return [
    `${scope} ${WORK_STEP_ROW},`,
    `${scope} ${WORK_STEP_GROUP_HEADER},`,
    `${scope} ${WORK_STEP_FOLD_SUMMARY},`,
    `${scope} ${WORK_STEP_EXPANDED_BODY} {`,
    `  color: ${ink};`,
    '}'
  ].join('\n')
}

/**
 * The complete work-step ink stylesheet (six rules).
 * @returns {string}
 */
export function workStepStyles () {
  const roles = workStepRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      workStepRule(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
