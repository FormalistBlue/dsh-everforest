// Everforest ink for DSH's user-message bubble (the "只换字色" half of the
// 2026-11-08 bubble review; the light background is the moss paper from
// `bubbleSurface` in `src/tokens.js`).
//
// DSH's chat `MessageItem.module.css` paints `.bubble` with
// `color: var(--dsw-alias-label-primary)`, and the token layer cannot give the
// bubble its own ink without recolouring every primary label. A small always-on
// stylesheet is therefore the only way to ink the bubble separately. The token
// layer still keeps `label-primary` readable on the bubble surface, so losing
// this sheet only loses the tint, not WCAG AA.
//
// The 2026-11-08 review picked "苔纸" (C) for light and "只换字色" (F) for dark:
//   - light: deep pine `#3E5647` on the moss `bg_green` paper (6.45–7.07:1).
//     Hand-tuned derived ink: the official `fg` `#5C6A72` reads blue-grey on the
//     green paper and sits at 4.54:1 on the hard variant.
//   - dark: pale sage `#DAE2C7` on the unchanged `bg1` bubble (7.26–8.98:1).
//
// Rules are scoped under the color-mode attribute (already on `<html>`) and
// matched on the chat package's class-name fragments. DSH 0.2.x ships the user
// message row as `LOmM4q_userStack` / `LOmM4q_bubble` (the published client
// bundle keeps that fixed prefix); the `[class*="..."]` form also covers the
// hashed `_bubble_...` build variant, while requiring the `userStack` ancestor
// keeps the tooltip bubble (`_bubble_44yfq_1`, also a `_bubble` class) untouched.
//
// The module is a pure ESM source: no DOM, no state. `scripts/build.mjs` bundles
// it into `client.js`; `src/client-entry.js` owns the `<style>` element.

/**
 * Bubble ink per colour scheme (derived, not an Everforest palette role).
 * @type {Readonly<{ light: string, dark: string }>}
 */
export const CHAT_BUBBLE_INK = Object.freeze({
  light: '#3E5647',
  dark: '#DAE2C7'
})

/**
 * The always-on bubble-ink stylesheet.
 * @returns {string}
 */
export function chatBubbleStyles () {
  return [
    'html[data-everforest-color-mode="on"] body:not([data-ds-dark-theme]) [class*="_userStack"] [class*="_bubble"] {',
    `  color: ${CHAT_BUBBLE_INK.light};`,
    '}',
    'html[data-everforest-color-mode="on"] body[data-ds-dark-theme] [class*="_userStack"] [class*="_bubble"] {',
    `  color: ${CHAT_BUBBLE_INK.dark};`,
    '}'
  ].join('\n')
}
