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
// schemes (#DED8DB) and a dark plum in the dark ones. On this accent-filled
// bubble the *text* colour that comes with it is unreadable, because the bubble
// ink is inverted relative to the canvas: cream on #DED8DB is 1.17-1.36:1, and
// the dark canvas ink on the dark plum is 1.22-1.27:1. The first landing that day
// gave the bubble its own selection band as well (light "A 同色系加深", dark "C
// 反相取词"), but the user asked to keep the highlight colour identical on every
// surface and let option C repaint only the selected text ("先还原，改成用方案C
// 试试，只变动修改文字颜色"). So the band stays the one global `bg_visual` and
// this sheet only overrides the selected text ink:
//
//   light  #2F3B33 deep pine on the shared #DED8DB band   8.33:1
//   dark   #FFFBEF cream on the shared #4C3743-#5C3F4F   8.91-10.49:1
//
// The trade-off the user accepted: a single highlight colour everywhere (light
// band vs the green bubble is 1.71:1) instead of a stronger bubble-only band.

// Nested content: the bubble text inherits the painted ink, and session
// reference chips restate their own colour through
// `--dsw-alias-state-business-primary`, so that token is re-pointed at the band
// ink inside the bubble's subtree (the same idea as `MENU_INK_TOKENS` in
// `src/ui-accents.js`). Other nested cards (`JsonBlock` for extra content
// blocks) keep their own surface + ink tokens and are left alone.
//
// Scope: the always-on color-mode attribute on `<html>` plus the strength
// attribute the token layer writes, and DSH's own `body[data-ds-dark-theme]`
// flag — the pattern every always-on sheet in this theme uses. The
// `[class*="_userStack"]` ancestor keeps the tooltip bubble (`_bubble_44yfq_1`,
// also a `_bubble` class) out of the rule.
//
// The module is a pure ESM source: no DOM, no state. `scripts/build.mjs` bundles
// it into `client.js`; `src/client-entry.js` owns the `<style>` element.

import { FOREGROUNDS, RAMPS, STRENGTHS } from './palette.js'

/** Light-scheme bubble fill: the interaction accent (selected-row green). */
export const CHAT_BUBBLE_LIGHT_FILL = FOREGROUNDS.light.statusline1

/**
 * Light-scheme bubble ink per strength: the scheme canvas `bg0`, the accent
 * layer's own ink for `statusline1` fills (cream ink, 2.00–2.32:1 — the
 * documented accent trade-off, kept because the user chose it explicitly).
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
 * The bubble element. DSH's chat package renders the user row as
 * `_userStack` and the bubble as `_bubble`; the hashed class prefixes are build
 * output, the fragments are the published bundle's stable shapes.
 */
export const CHAT_BUBBLE_SELECTOR = '[class*="_userStack"] [class*="_bubble"]'

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
    `${scopeFor(scheme, strength)} ${CHAT_BUBBLE_SELECTOR} ::selection {`,
    `  color: ${CHAT_BUBBLE_SELECTION_INK[scheme]};`,
    '}'
  ].join('\n')
}

/**
 * The always-on bubble stylesheet: one paint rule per variant (accent fill, the
 * canvas ink and the reference-chip ink token) plus its text-selection rule.
 * @returns {string}
 */
export function chatBubbleStyles () {
  const rules = []
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const { fill, ink } = chatBubbleRole(scheme, strength)
      rules.push([
        `${scopeFor(scheme, strength)} ${CHAT_BUBBLE_SELECTOR} {`,
        `  background: ${fill};`,
        `  color: ${ink};`,
        // Session reference chips restate their own colour token; re-point it at
        // the band ink so a chip stays readable on the accent fill.
        `  --dsw-alias-state-business-primary: ${ink};`,
        '}'
      ].join('\n'))
      rules.push(bubbleSelectionRule(scheme, strength))
    }
  }
  return rules.join('\n\n')
}
