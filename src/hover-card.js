// Everforest "hover card" surface for DSH's floating previews.
//
// The session / schedule preview is ui-primitives' HoverCard: a portalled
// `<div>` (compiled CSS `._card_l6gf9_9`: fixed, width 244px, padding 12px 16px,
// radius-lg, `background: var(--dsw-alias-hovercard-bg)`, `box-shadow:
// var(--dsw-shadow-lv3)`) whose direct child is the hover content root
// (`_hoverContent_…`, rendered by ui-workspace's `WorkspaceHoverContent` and
// `SessionHoverContent`).
//
// The token layer now paints that card with the same elevated paper the menus
// and tips use (`--dsw-alias-hovercard-bg` = `surface(p, 2)` in both schemes,
// see src/tokens.js). On the light cream canvas the paper sits only a ~1 L* step
// away from the sidebar, and on the dark canvas `bg2` is still a small step from
// the content — in both schemes the card depended on DSH's own `shadow-lv3`
// alone, which reads as "no edge" against the busy chat background (2026-11-25
// follow-up report: 「浅色和深色模式下看着感觉和背景有点融到一起了，看看能不能让
// 辨识度更高一点」).
//
// The rim is the one thing a colour token cannot express, so this always-on
// sheet adds a 1px hairline on top of DSH's own elevation:
//
//   box-shadow: 0 0 0 1px var(--dsw-alias-border-l4), var(--dsw-shadow-lv3, …)
//
// Both pieces are theme tokens, so the six variants follow automatically:
// `border-l4` is the warm `bg5` hairline at 90% in light and its lifted ink at
// 100% in dark, while the fallback only matters if DSH ever drops the elevation
// variable. DSH's own `shadow-lv3` starts with a 1px black 20% ring, which is
// invisible on the dark card — hence the token hairline rather than a second
// hand-written shadow.
//
// The anchor is the workspace content's stable local class name (`hoverContent`)
// — never the `l6gf9` CSS-module hash, which is build output. No `!important`:
// `div:has(> [class*="hoverContent"])` (0,2,1) outranks the card's own
// `._card_l6gf9_9` (0,1,0) in the cascade.

import { COLOR_MODE_ON } from './color-mode.js'

/** The hover content root shared by the workspace and session previews. */
export const HOVER_CARD_CONTENT = '[class*="hoverContent"]'

/** The portalled card that wraps the hover content root. */
export const HOVER_CARD_CARD = `${COLOR_MODE_ON} div:has(> ${HOVER_CARD_CONTENT})`

/** DSH's own elevation token, with a literal fallback in case it is renamed. */
export const HOVER_CARD_SHADOW_FALLBACK = '0 8px 24px rgba(0, 0, 0, 0.18)'

/**
 * The single hover-card rule: a token hairline around DSH's own elevation.
 * @returns {string}
 */
export function hoverCardStyles () {
  return `${HOVER_CARD_CARD} {
  box-shadow: 0 0 0 1px var(--dsw-alias-border-l4), var(--dsw-shadow-lv3, ${HOVER_CARD_SHADOW_FALLBACK});
}
`
}
