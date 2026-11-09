// Everforest green for the new-session hero: the whale mark and its title.
//
// DSH's new-session welcome screen (ui-conversation `HeroShell`, verified
// against the installed 0.2.2-rc.1 client bundle) paints the brand mark and the
// "探索未至之境" headline with one shared ink:
//
//   .WOwLGG_headline { color: var(--dsw-alias-label-primary); }
//   .WOwLGG_titleGroup > span   (the title text inherits the headline ink)
//   .WOwLGG_fish { color: var(--dsw-alias-label-primary); }  // path fill="currentColor"
//
// 2026-11-09 user request (an annotated screenshot of the welcome screen): "帮
// 我把这里的也改成绿色" — the whale + title pair takes the palette **text
// green** `green` (upstream: "Function Names, Method Names, Strings,
// Characters, Search Highlights"; dark `#A7C080`, light `#8DA101`), the same
// role the sidebar workspace names use (`src/workspace-labels.js`). It is
// deliberately not the selection background `statusline1`: upstream defines
// that one as a *background* colour (`#93B259` in the light schemes), and the
// lighter tint reads as a wash on a 26px headline.
//
// The hero is identified by structure, not by a hashed class: the CSS-module
// local name `headline` alone also matches the context-meter popover
// (`.A6Bq1a_headline`, `label-tertiary`), while the welcome headline is the one
// that contains the `fishHitbox` brand-mark wrapper. `:has()` keeps the rule on
// the hero without pinning the build's module hash. The brand mark is re-inked
// on its own because DSH restates `color` on the fish instead of letting it
// inherit (the SVG path paints with `fill="currentColor"`).
//
// No contrast guard is applied: the dark schemes keep 5.62–6.88:1 (WCAG AA);
// the light schemes sit at 2.42–2.81:1, the palette's own ceiling for the text
// green on the canvas (the same trade-off `src/workspace-labels.js` documents).
// The measured values are pinned in `tests/hero-title.test.mjs` and recorded in
// `docs/design.md` §28.
//
// Always-on and independent of the color mode: it is chrome, not markdown
// content colouring.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/**
 * The new-session hero headline: the only `headline` that carries the brand
 * mark. `fishHitbox` is DSH's own wrapper around the `conversation.hero.brand.mark`
 * slot, so the hook survives a plugin that replaces the default whale.
 */
export const HERO_HEADLINE = '[class*="headline"]:has([class*="fishHitbox"])'

/**
 * The whale brand mark inside that headline. The substring covers both the
 * fallback `HeroFish` SVG and a slot-provided mark that applies the `fish`
 * className DSH passes it.
 */
export const HERO_BRAND_MARK = `${HERO_HEADLINE} [class*="fish"]`

/**
 * Minimum contrast the dark schemes keep for the green title on the canvas
 * (5.62–6.88:1 measured, WCAG AA).
 */
export const HERO_TITLE_DARK_CONTRAST = 4.5

/**
 * Documented floor of the light schemes' text green on the canvas
 * (2.42–2.81:1; the palette offers no deeper text green without leaving the
 * upstream colour, and the user asked for the upstream green verbatim).
 */
export const HERO_TITLE_LIGHT_CONTRAST = 2.3

/**
 * The hero ink of one variant: the palette text green, untouched.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} opaque `#RRGGBB`.
 */
function heroTitleFor (scheme, strength) {
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme].fg.green
}

/**
 * The six hero colours, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, string>} keyed `light-hard` … `dark-soft`.
 */
export function heroTitleRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = heroTitleFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body> — the same pattern as
 * `src/workspace-labels.js` and `src/ui-accents.js`.
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
 * One variant's rule: the headline and its brand mark on the text green.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} color
 * @returns {string}
 */
function heroTitleRule (scheme, strength, color) {
  const scope = scopeFor(scheme, strength)
  return [
    `${scope} ${HERO_HEADLINE},`,
    `${scope} ${HERO_BRAND_MARK} {`,
    `  color: ${color};`,
    '}'
  ].join('\n')
}

/**
 * The complete hero-title stylesheet (six rules).
 * @returns {string}
 */
export function heroTitleStyles () {
  const roles = heroTitleRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      heroTitleRule(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
