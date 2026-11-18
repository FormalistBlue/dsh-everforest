// Everforest paint for DSH's user-message bubble.
//
// DSH's chat `UserMessageBubble` paints the bubble with
//
//   .bubble {
//     background: var(--dsw-specific-bubble);
//     color: var(--dsw-alias-label-primary);
//   }
//
// (verified against the installed 0.2.2-rc.1 frontend CSS; the class hash and
// the primitive wrapper change per build, the rule shape does not). The token
// layer owns the *fallback* surface (`--dsw-specific-bubble`: the moss paper in
// the light schemes, the `bg1` step in the dark ones), but the accent paint
// below cannot ride a token: the bubble's fallback ink is `label-primary`, and
// neither cream-on-moss nor pale-sage-on-accent is a readable combination, so an
// accent-filled token would turn an unreadable block into the DSH-upgrade
// fallback. This small always-on sheet paints the bubble directly instead, and
// losing the sheet restores the old readable pair.
//
// History
//
//   - 2026-11-08 review picked "苔纸" (C) for light and "只换字色" (F) for dark:
//     light = moss paper + derived deep pine `#3E5647`; dark = unchanged `bg1`
//     surface + derived pale sage `#DAE2C7` (both inked by this sheet).
//   - 2026-11-10 report: the dark bubble read as "有点淡" — it sat only 1.16:1
//     from the canvas. The user asked for the selected sidebar row's look
//     verbatim: "试试直接改成侧边栏选中那种绿色和文字颜色", then extended it to the
//     light scheme the same day: "浅色气泡的也和侧边栏颜色保持一致".
//   - 2026-11-10 long-message test: cream on the light accent green is only
//     2.00–2.32:1, thin for a paragraph. A derived deep ink `#2F3B33` (4.88:1)
//     was tried and then rejected: "文字还是换回白色吧". The light bubble is
//     back to the sidebar pair verbatim — same `statusline1` fill, same canvas
//     `bg0` cream ink. That is the accent layer's documented trade-off
//     (`docs/reference/contrast.md` §2i), now an explicit user choice rather than
//     a silent correction; the deep ink lives only in this history note.
//   - 2026-11-15 review: the same deep ink was landed again off a side-by-side
//     demo (the selected row's 11px badge and 12px time were the argument) and
//     then withdrawn at the user's request — "效果都不太好…都还原吧". Cream ink
//     is the shipped pair again; design doc §45 records the withdrawal.
//
// Current pairs:
//
//   light-hard   #93B259 + #FFFBEF  2.32:1
//   light-medium #93B259 + #FDF6E3  2.22:1
//   light-soft   #93B259 + #F3EAD3  2.00:1
//   dark-hard    #A7C080 + #272E33  6.88:1
//   dark-medium  #A7C080 + #2D353B  6.23:1
//   dark-soft    #A7C080 + #333C43  5.62:1
//
// The dark pair is WCAG AA. The light pair is the palette's own ceiling for cream
// ink on `statusline1` — exactly what the selected session row, the selected
// navigation row and the send button already use. The fallback path (sheet lost,
// token surface + `label-primary`) stays AA in every variant, and the dark
// schemes keep AA either way.
//
// Text selection (2026-11-13): the global `::selection` sheet (`src/selection.js`)
// paints every surface with the scheme's `bg_visual` — a pale grey in the light
// schemes (#DED8DB / #D9D4D6 / #CFC9CC) and a dark plum in the dark ones. On this
// accent-filled bubble the *text* colour that comes with it is unreadable, because
// the bubble ink is inverted relative to the canvas: cream on the light bands is
// 1.36-1.38:1, and the dark canvas ink on the dark plum is 1.22-1.27:1. The first
// landing that day gave the bubble its own selection band as well (light "A
// 同色系加深", dark "C 反相取词"), but the user asked to keep the highlight colour
// identical on every surface and let option C repaint only the selected text
// ("先还原，改成用方案C 试试，只变动修改文字颜色"). So the band stays the one
// global `bg_visual` and this sheet only overrides the selected text ink:
//
//   light  #2F3B33 deep pine on the light bands   7.09-8.33:1
//   dark   #FFFBEF cream on the shared #4C3743-#5C3F4F   8.91-10.49:1
//
// The trade-off the user accepted: a single highlight colour everywhere (light
// band vs the green bubble is 1.47:1 at light·soft) instead of a stronger
// bubble-only band.

// Nested content: the bubble text inherits the painted ink, and session
// reference chips restate their own colour through
// `--dsw-alias-state-business-primary`, so that token is re-pointed at the band
// ink inside the bubble's subtree (the same idea as `MENU_INK_TOKENS` in
// `src/ui-accents.js`). Other nested cards (`JsonBlock` for extra content
// blocks) keep their own surface + ink tokens and are left alone.
//
// Scope: the always-on color-mode attribute on `<html>` plus the strength
// attribute the token layer writes, and DSH's own `body[data-ds-dark-theme]`
// flag — the pattern every always-on sheet in this theme uses.
//
// One bubble primitive, three places (2026-11-15). DSH's chat renders the user
// row as `_userStack` and the bubble through the shared `UserMessageBubble`
// primitive; two more callers render the *same* primitive (or the same `.bubble`
// rule) outside that stack, so anchoring only on `_userStack` left them on the
// token's moss paper while every other user bubble was accent-green:
//
//   - `[data-question-reply]` — the answered `ask_user_question` card
//     (`QuestionReplyView`: row > bubbleWidth > UserMessageBubble). The user
//     asked why that bubble was cream next to green chat bubbles (2026-11-15),
//     and DSH paints it natively with the same `--dsw-specific-bubble` surface.
//   - `[data-command-input]` — the `/goal` command echo, which DSH's own sheet
//     documents as "the command echo is a user message". The 2026-11-15 rc.3
//     review could not find the attribute in any shipped bundle (the runtime
//     only has `data-composer-input`), so this rule matches nothing on rc.3; it
//     is kept as a fallback for a host that does render it, and it is no longer
//     treated as a verified anchor (design §12).
//
// The `_bubble` fragment still keeps the tooltip bubble (`_bubble_44yfq_1`, also
// a `_bubble` class) out of every rule: tooltips are portaled to `<body>`, so
// they never sit inside one of these anchors. The reply card's `_bubbleWidth`
// max-width wrapper also contains that fragment, so its anchor excludes it —
// without that, the paint landed on the square full-width box and the rounded
// bubble disappeared into it (2026-11-15 report), see `CHAT_BUBBLE_SELECTORS`.
//
// The question-reply card also brings a muted line: its `dt` is
// `color: var(--dsw-alias-label-secondary)` — DSH's own muted ink, which is
// readable on the moss paper but collapses on the accent fill (1.40:1 in the
// light schemes, 1.31:1 in the dark ones). The paint rule re-points that token —
// and the reference-chip ink token — inside the bubble's subtree.
//
// 2026-11-15 (evening): the card is one accent surface again. The earlier rounds put
// the question on a paper block (variant `bg_green` in the light schemes,
// `#5D6E56` in the dark ones), which the user then judged "不好看" — a green
// card holding pale blocks reads as two widgets, not as one answer. The ask is
// now the default theme's own hierarchy: no second fill, the question simply
// recedes by its ink (`dt` muted, `dd` at the bubble ink), so the paint rule
// points `--dsw-alias-label-secondary` at `chatBubbleQuestionInk`: the bubble
// ink one step softer, the step measured in CIE L* rather than in contrast,
// because the light schemes only own ~2.3:1 above the fill — a ratio-based mute
// would either vanish into the green or take the answer's contrast with it.
//
// The module is a pure ESM source: no DOM, no state. `scripts/build.mjs` bundles
// it into `client.js`; `src/client-entry.js` owns the `<style>` element.

import { mix, labLightness } from './color.js'
import { FOREGROUNDS, RAMPS, STRENGTHS } from './palette.js'

/** Light-scheme bubble fill: the interaction accent (selected-row green). */
export const CHAT_BUBBLE_LIGHT_FILL = FOREGROUNDS.light.statusline1

/**
 * Light-scheme bubble ink per strength: the scheme canvas `bg0` (the cream the
 * light canvases are already made of), which is the accent layer's own ink pair
 * for `statusline1` fills.
 *
 * 2026-11-15 note: the 2026-11-15 review briefly re-inked every accent surface
 * with the deep pine `#2F3B33` (4.88:1); the user compared both in a side-by-side
 * demo and asked for the cream ink back, so the bubble keeps the sidebar's pair
 * verbatim (2.00–2.32:1, contrast.md §6.8).
 * @type {Readonly<Record<'hard' | 'medium' | 'soft', string>>}
 */
export const CHAT_BUBBLE_LIGHT_INK = Object.freeze({
  hard: RAMPS.light.hard.bg0,
  medium: RAMPS.light.medium.bg0,
  soft: RAMPS.light.soft.bg0
})

/** Dark-scheme bubble fill: the interaction accent (selected-row green). */
export const CHAT_BUBBLE_DARK_FILL = FOREGROUNDS.dark.statusline1

/**
 * Dark-scheme bubble ink per strength: the scheme canvas `bg0`, the accent
 * layer's own ink for `statusline1` fills.
 * @type {Readonly<Record<'hard' | 'medium' | 'soft', string>>}
 */
export const CHAT_BUBBLE_DARK_INK = Object.freeze({
  hard: RAMPS.dark.hard.bg0,
  medium: RAMPS.dark.medium.bg0,
  soft: RAMPS.dark.soft.bg0
})

/**
 * The bubble's selected-text ink per scheme (2026-11-13 user choice: option C,
 * but only the text colour changes — the highlight band stays the one global
 * `bg_visual` colour on every surface). The light schemes use the deep-pine ink
 * of option C over the shared pale band; the dark schemes invert to cream.
 * @type {Readonly<Record<'light' | 'dark', string>>}
 */
export const CHAT_BUBBLE_SELECTION_INK = Object.freeze({
  light: '#2F3B33',
  dark: '#FFFBEF'
})

/**
 * The bubble element(s): DSH's chat package renders the user row as
 * `_userStack` and the bubble as `_bubble`; the hashed class prefixes are build
 * output, the fragments are the published bundle's stable shapes. The question
 * reply and the command echo render the same primitive under their own data
 * attributes instead (see the header note), so they are anchored separately.
 * @type {readonly string[]}
 */
export const CHAT_BUBBLE_SELECTORS = Object.freeze([
  '[class*="_userStack"] [class*="_bubble"]',
  // `BfLV8a_bubbleWidth` is the reply card's max-width wrapper (`row >
  // bubbleWidth > UserMessageBubble`) and its class name also contains the
  // `_bubble` fragment. Without the exclusion the paint lands on that square,
  // full-width box and the rounded bubble inside vanishes into it (2026-11-15
  // user report: "现在看到回复卡是方的，圆边框没了").
  '[data-question-reply] [class*="_bubble"]:not([class*="_bubbleWidth"])',
  '[data-command-input] [class*="_bubble"]'
])

/**
 * The question text inside a reply bubble. DSH gives it
 * `color: var(--dsw-alias-label-secondary)`; the paint rule re-points that token
 * on the bubble, so no extra selector is needed.
 */
export const CHAT_BUBBLE_QUESTION_INK_TOKEN = '--dsw-alias-label-secondary'

/**
 * How far the question ink sits from the answer ink, in CIE L* (2026-11-15).
 *
 * The reply card is one accent surface: the question line keeps the bubble ink's
 * hue and only steps back, so the card reads as "question asked / answer given"
 * the way DSH's own `QuestionReplyView` does (`dt` at `label-secondary`, `dd` at
 * the bubble ink). The step is perceptual, not a contrast ratio: the light
 * schemes own only ~2.3:1 above the fill, and a fixed ratio there would either
 * disappear into the green or consume the answer's own contrast. 6 L* is the
 * "slightly softer" step the 2026-11-15 review settled on — below 4 L* the two
 * lines still read as one voice (4.1 L* was invisible in the demo), past 8 L* the
 * question starts to look disabled.
 */
export const CHAT_BUBBLE_QUESTION_INK_STEP = 6

/**
 * One variant's question ink: the bubble ink moved `CHAT_BUBBLE_QUESTION_INK_STEP`
 * L* toward the bubble fill (darker in the light schemes, lighter in the dark
 * ones — always softer, never a second colour), found by walking the ink → fill
 * blend in 1% shares. Derived instead of pinned so a palette edit moves the
 * question with the answer instead of breaking the relationship; the gates in
 * `scripts/check-contrast.mjs` (G23) hold both ends of the step.
 *
 * Measured (answer / question on the fill): light 2.32 / 1.99, 2.22 / 1.90,
 * 2.00 / 1.70; dark 6.88 / 5.59, 6.23 / 5.03, 5.62 / 4.52.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} an opaque `#RRGGBB`.
 */
export function chatBubbleQuestionInk (scheme, strength) {
  const { fill, ink } = chatBubbleRole(scheme, strength)
  const from = labLightness(ink)
  const direction = labLightness(fill) > from ? 1 : -1
  for (let step = 1; step <= 100; step += 1) {
    const candidate = mix(ink, fill, step / 100)
    if ((labLightness(candidate) - from) * direction >= CHAT_BUBBLE_QUESTION_INK_STEP) return candidate
  }
  return fill
}

/**
 * One variant's bubble paint: the accent fill and its canvas ink.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ fill: string, ink: string }} both opaque `#RRGGBB`.
 */
export function chatBubbleRole (scheme, strength) {
  return scheme === 'light'
    ? { fill: CHAT_BUBBLE_LIGHT_FILL, ink: CHAT_BUBBLE_LIGHT_INK[strength] }
    : { fill: CHAT_BUBBLE_DARK_FILL, ink: CHAT_BUBBLE_DARK_INK[strength] }
}

/** The color-mode-on prefix every rule in this sheet is scoped under. */
const COLOR_MODE_ON = 'html[data-everforest-color-mode="on"]'

/**
 * One variant's scope: the strength attribute the token layer writes plus DSH's
 * own dark-theme flag on <body>.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function scopeFor (scheme, strength) {
  return scheme === 'light'
    ? `${COLOR_MODE_ON}[data-everforest-light="${strength}"] body:not([data-ds-dark-theme])`
    : `${COLOR_MODE_ON}[data-everforest-dark="${strength}"] body[data-ds-dark-theme]`
}

/**
 * Every bubble anchor under one variant scope, as a single comma-separated
 * selector list. The scope has to be repeated per anchor (a list after one scope
 * would only scope the first entry).
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} [suffix] - additional selector steps (e.g. `' ::selection'`).
 * @returns {string}
 */
function scopedBubbles (scheme, strength, suffix = '') {
  const scope = scopeFor(scheme, strength)
  return CHAT_BUBBLE_SELECTORS.map((selector) => `${scope} ${selector}${suffix}`).join(',\n')
}

/**
 * A variant's bubble-selection rule. The selector repeats the variant scope and
 * the bubble anchor, then adds a descendant `::selection`, so it is more
 * specific than the global sheet (`src/selection.js`) and only text inside the
 * bubble is re-inked. No `background-color`: the highlight stays the global
 * `bg_visual` colour, so text selection looks identical on every surface.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function bubbleSelectionRule (scheme, strength) {
  return [
    `${scopedBubbles(scheme, strength, ' ::selection')} {`,
    `  color: ${CHAT_BUBBLE_SELECTION_INK[scheme]};`,
    '}'
  ].join('\n')
}

/**
 * The always-on bubble stylesheet: one paint rule per variant (accent fill, the
 * canvas ink, the muted question ink and the reference-chip token) plus its
 * text-selection rule. No rule paints the question block itself any more — the
 * card is one surface (2026-11-15), and the question recedes through the token
 * the paint rule re-points.
 * @returns {string}
 */
export function chatBubbleStyles () {
  const rules = []
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const { fill, ink } = chatBubbleRole(scheme, strength)
      rules.push([
        `${scopedBubbles(scheme, strength)} {`,
        `  background: ${fill};`,
        `  color: ${ink};`,
        // Session reference chips restate their own colour token; re-point it at
        // the band ink so a chip stays readable on the accent fill.
        `  --dsw-alias-state-business-primary: ${ink};`,
        // The reply card paints its question line with the muted label token; on
        // the accent fill DSH's own `label-secondary` is ~1.2:1. This is the one
        // step that keeps the card's two voices apart after the paper block went
        // away: the token takes the softened ink, everything else keeps the fill's.
        `  ${CHAT_BUBBLE_QUESTION_INK_TOKEN}: ${chatBubbleQuestionInk(scheme, strength)};`,
        '}'
      ].join('\n'))
      rules.push(bubbleSelectionRule(scheme, strength))
    }
  }
  return rules.join('\n\n')
}
