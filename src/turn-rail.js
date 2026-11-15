// Everforest "turn navigator" treatment for the DSH conversation panel.
//
// DSH renders a vertical rail of small dashes on the right edge of the chat
// column — one per conversation turn — that jumps to that turn and shows a
// preview card on hover (`dsh-client-ui-chat`'s `TurnNavigator`,
// `TurnNavigator.module.css`). Its bar is a `button[data-index]::before` and DSH
// paints it from global tokens:
//
//   resting   `--dsw-alias-border-l4`      (light #BEC5B2)  scaleX(.6)
//   hover     `--dsw-alias-label-tertiary` (light #A6B0A0)  scaleX(.9)
//   current   `--dsw-alias-label-primary`  (light #5C6A72)  scaleX(1)
//   busy      opacity 1 → .35, 1s ease-in-out infinite
//
// The 2026-11-15 user report ("这里的样式可以调整吗？" with a crop of the rail)
// ended on scheme D of the comparison demo: keep the rail's resting dashes
// neutral, but paint the *current* turn with the theme's text green, thicken the
// bar from 2px to 3px, lengthen it from 20px to 22px, and slow the state change
// from 140ms `ease` to 240ms `cubic-bezier(.22, 1, .36, 1)` so the bar settles
// instead of snapping. The running turn's 1s on/off blink becomes a 1.7s
// breathing fade (opacity 1 → .5), and hover lifts a resting dash to the
// lighter interaction green `statusline1` before it becomes the current turn's
// deeper `green`.
//
// The colours follow the same split as the rest of the theme (see
// `src/workspace-labels.js`): `fg.green` is the foreground/text green used for
// the current state (light #8DA101, dark #A7C080), while `fg.statusline1` is the
// lighter background green used for hover (light #93B259, dark #A7C080). The
// split only shows in the light schemes.
//
// Anchors: DSH sets `data-conversation-scroll` on the conversation scroll body
// (`ConversationRoot`'s `scrollBody`) and the chat view's `nav` is the only
// navigation element inside it; every mark is a `button[data-index]`. That is a
// stable contract and avoids the hashed CSS-module prefix. The two state classes
// that have no attribute contract are addressed by their stable local-name
// suffix — `markBusy` / `markUnloaded` — the same "[class*=\"<localName>\"]"
// approach as `projectText` / `folderActive` in `src/workspace-labels.js`
// (verified against the installed `@deepseek-ai/dsh-client-ui-chat` 0.2.2-rc.3
// bundle).
//
// DSH disables its own transitions under `prefers-reduced-motion` with a
// `.SNx2jG_mark:before` rule; ours has a higher specificity, so this sheet ships
// its own reduce blocks — one per variant, each repeating that variant's scope
// (an unscoped block is *less* specific than the rules it has to cancel and
// silently loses; see `turnRailReducedMotionRule`). Otherwise the new motion
// would ignore the user's preference.
//
// Always-on and independent of the color mode: this is navigation chrome, not
// markdown content.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The conversation scroll body DSH tags; every chat view renders inside it. */
export const TURN_RAIL_ROOT = '[data-conversation-scroll] nav'

/** One turn mark: a button carrying the virtualiser index DSH sets. */
export const TURN_RAIL_MARK = `${TURN_RAIL_ROOT} button[data-index]`

/** The current turn (`aria-current="true"` on the mark). */
export const TURN_RAIL_MARK_ACTIVE = `${TURN_RAIL_MARK}[aria-current="true"]`

/** A mark the pointer is over (DSH also adds `markPreview`; `:hover` is enough). */
export const TURN_RAIL_MARK_HOVER = `${TURN_RAIL_MARK}:hover`

/** A keyboard-focused mark keeps DSH's focus ring and the full-width bar. */
export const TURN_RAIL_MARK_FOCUS = `${TURN_RAIL_MARK}:focus-visible`

/** The running turn: DSH adds its `markBusy` class (hashed prefix, stable name). */
export const TURN_RAIL_MARK_BUSY = `${TURN_RAIL_MARK}[class*="markBusy"]`

/** A turn whose history is not loaded yet: DSH dims and shortens it. */
export const TURN_RAIL_MARK_UNLOADED = `${TURN_RAIL_MARK}[class*="markUnloaded"]`

/** Bar geometry chosen by the 2026-11-15 scheme-D demo. */
export const TURN_RAIL_BAR_HEIGHT = 3
export const TURN_RAIL_BAR_WIDTH = 22
export const TURN_RAIL_BAR_RADIUS = 999

/** Resting / hovered / loaded-current horizontal scales (× `TURN_RAIL_BAR_WIDTH`). */
export const TURN_RAIL_REST_SCALE = 0.64
export const TURN_RAIL_HOVER_SCALE = 0.86

/** Unloaded turns keep DSH's shortened, dimmed look on the wider bar. */
export const TURN_RAIL_UNLOADED_SCALE = 0.44
export const TURN_RAIL_UNLOADED_OPACITY = 0.6

/** State-change motion: 140ms `ease` → 240ms with a long settle. */
export const TURN_RAIL_TRANSITION_MS = 240
export const TURN_RAIL_EASE = 'cubic-bezier(.22, 1, .36, 1)'

/** The running-turn breath: DSH's 1s 1 → .35 blink, softened. */
export const TURN_RAIL_BUSY_MS = 1700
export const TURN_RAIL_BUSY_OPACITY = 0.5
export const TURN_RAIL_BUSY_EASE = 'cubic-bezier(.37, 0, .63, 1)'

/** The at-rule name the sheet emits; also used by the reduce block. */
export const TURN_RAIL_BUSY_KEYFRAMES = 'everforest-turn-breathe'

/**
 * The two greens of one variant.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ active: string, hover: string }} opaque `#RRGGBB`.
 */
function turnRailRolesFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return { active: palette.fg.green, hover: palette.fg.statusline1 }
}

/**
 * The six variants' colour pairs, keyed `${scheme}-${strength}`.
 * @returns {Record<string, { active: string, hover: string }>}
 */
export function turnRailRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = turnRailRolesFor(scheme, strength)
    }
  }
  return roles
}

/**
 * The variant scope, shared by every rule of one scheme + strength.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function turnRailScope (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** `translateY(-50%)` keeps DSH's vertical centring inside the 10px hit row. */
const CENTER = 'translateY(-50%)'

/**
 * One variant's rules, in cascade order: geometry → unloaded → hover → focus →
 * current → busy. The order matters: `:hover` and `[aria-current="true"]` tie on
 * specificity, so the current-turn rule must come last to win while hovered, and
 * the focus rule sits between them to restore the full-length bar.
 *
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ active: string, hover: string }} roles
 * @returns {string[]}
 */
function turnRailVariantRules (scheme, strength, roles) {
  const scope = turnRailScope(scheme, strength)
  const transition = `transition: transform ${TURN_RAIL_TRANSITION_MS}ms ${TURN_RAIL_EASE}, background-color ${TURN_RAIL_TRANSITION_MS}ms ${TURN_RAIL_EASE};`
  return [
    `${scope} ${TURN_RAIL_MARK}::before {
  width: ${TURN_RAIL_BAR_WIDTH}px;
  height: ${TURN_RAIL_BAR_HEIGHT}px;
  border-radius: ${TURN_RAIL_BAR_RADIUS}px;
  transform-origin: 100% 50%;
  transform: ${CENTER} scaleX(${TURN_RAIL_REST_SCALE});
  ${transition}
}`,
    `${scope} ${TURN_RAIL_MARK_UNLOADED}::before {
  opacity: ${TURN_RAIL_UNLOADED_OPACITY};
  transform: ${CENTER} scaleX(${TURN_RAIL_UNLOADED_SCALE});
}`,
    `${scope} ${TURN_RAIL_MARK_HOVER}::before {
  background: ${roles.hover};
  transform: ${CENTER} scaleX(${TURN_RAIL_HOVER_SCALE});
}`,
    `${scope} ${TURN_RAIL_MARK_FOCUS}::before {
  transform: ${CENTER} scaleX(1);
}`,
    `${scope} ${TURN_RAIL_MARK_ACTIVE}::before {
  background: ${roles.active};
  transform: ${CENTER} scaleX(1);
}`,
    `${scope} ${TURN_RAIL_MARK_BUSY}::before {
  animation: ${TURN_RAIL_BUSY_KEYFRAMES} ${TURN_RAIL_BUSY_MS}ms ${TURN_RAIL_BUSY_EASE} infinite;
}`
  ]
}

/** The breathing keyframes, emitted once (the animation carries no colour). */
const TURN_RAIL_KEYFRAMES_RULE = `@keyframes ${TURN_RAIL_BUSY_KEYFRAMES} {
  0%, 100% { opacity: 1; }
  50% { opacity: ${TURN_RAIL_BUSY_OPACITY}; }
}`

/**
 * Restore the user's reduced-motion preference, which DSH's own block cannot do
 * for these rules (our selectors are more specific than `.SNx2jG_mark:before`).
 *
 * The block has to repeat the variant's **full scope**, exactly like the
 * `@supports` / `@media` pair in `src/running-title.js`: a bare
 * `[data-conversation-scroll] nav button[data-index]::before` is two classes and
 * three elements, while the rules it has to cancel are four classes and four
 * elements. The unscoped version this sheet shipped first therefore stayed in
 * the cascade without ever winning — verified in Chromium with
 * `prefers-reduced-motion: reduce` emulated (the 1.7s breath and the 240ms
 * transition kept running), 2026-11-15 review.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function turnRailReducedMotionRule (scheme, strength) {
  const scope = turnRailScope(scheme, strength)
  return `@media (prefers-reduced-motion: reduce) {
  ${scope} ${TURN_RAIL_MARK}::before { transition: none; }
  ${scope} ${TURN_RAIL_MARK_BUSY}::before { animation: none; }
}`
}

/**
 * The complete turn-navigator stylesheet: six variants × six rules, then the
 * breathing keyframes and one reduced-motion block per variant (each scoped like
 * the rules it cancels, see `turnRailReducedMotionRule`).
 * @returns {string}
 */
export function turnRailStyles () {
  const roles = turnRailRoles()
  const rules = []
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      rules.push(...turnRailVariantRules(scheme, strength, roles[`${scheme}-${strength}`]))
    }
  }
  rules.push(TURN_RAIL_KEYFRAMES_RULE)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) rules.push(turnRailReducedMotionRule(scheme, strength))
  }
  return rules.join('\n\n')
}

/**
 * The number of CSS rules the sheet emits per variant (asserted by the unit
 * tests); the reduced-motion blocks are emitted per variant as well, after the
 * keyframes.
 */
export const TURN_RAIL_RULES_PER_VARIANT = 6

/** The number of reduced-motion blocks the sheet emits per variant. */
export const TURN_RAIL_REDUCED_MOTION_PER_VARIANT = 1
