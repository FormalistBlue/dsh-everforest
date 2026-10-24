// Everforest text selection (`::selection`) for DSH.
//
// DSH's ui-theme ships `--dsw-alias-bg-document-selection`, but the installed
// bundles contain no `::selection` rule that reads it (2026-10-24 check: 0
// matching selectors across 176 stylesheets), so text selection falls back to
// the browser's native blue. This module emits one always-on stylesheet that
// paints selection with Everforest's own `bg_visual` colour per scheme +
// strength, while leaving the text colour untouched: `color: inherit` keeps
// every element's own ink, so syntax colours, links and color-mode headings
// survive a selection (Enchanted behaves the same way). Forcing one scheme ink
// here (2026-10-24 first cut) flattened multi-colour code into a single colour
// — user report.
//
// The six blocks are keyed by the attributes the Client keeps on <html>:
// `data-everforest-light` / `data-everforest-dark` (strength) and DSH's
// `data-ds-dark-theme` flag on <body>. The sheet is installed independently of
// the color mode, which only adds content-layer colours.
//
// `RAMPS[scheme][strength].bgVisual` already carries the effective value: the
// light ramps hold Enchanted's #DED8DB visibility fix (docs/reference/palette.md
// section 3), so this module needs no special case.

import { RAMPS, SCHEMES, STRENGTHS } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/**
 * One `::selection` block for a scheme + strength.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function selectionRule(scheme, strength) {
  const ramp = RAMPS[scheme][strength]
  const scope = scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
  return `${scope} ::selection {\n  background-color: ${ramp.bgVisual};\n  color: inherit;\n}`
}

/**
 * The complete text-selection stylesheet (six rules, one per variant).
 * @returns {string}
 */
export function selectionStyles() {
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) => selectionRule(scheme, strength)))
    .join('\n\n')
}
