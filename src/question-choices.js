// Everforest paint for the `ask_user_question` multi-select checkbox.
//
// DSH's question composer (`dsh-client-ui-user-questions`' `QuestionComposer`)
// draws the leading indicator of every option row itself: a 20×20 seat with a
// 14×14 radius-4 box on its `::before` layer, and for a multi-select question a
// checkbox instead of the single-select number. Its own rules (verified against
// the installed 0.2.2-rc.3 bundle) are:
//
//   .checkbox::before        border: 0.5px solid var(--dsw-alias-border-l4)
//   .checkboxChecked         color: var(--dsw-alias-label-primary-foreground)
//   .checkboxChecked::before border-color / background: var(--dsw-alias-label-primary)
//
// i.e. a checked box is painted with the *primary text ink* and its check glyph
// with the inverted foreground — a dark charcoal square with a cream tick in the
// light schemes, a cream square with a dark tick in the dark ones. That is
// neutral chrome: it reads as "checked", but not as this theme's green, while
// every other selected surface in the theme (session row, dropdown option, send
// button, chat bubble) is already the interaction accent.
//
// The 2026-11-15 request ("对话中提问的时候，多选按钮的样式可以调整一下吗？按主题的绿色
// 调整") therefore re-inks that pair with the theme's own accent pair — the
// `statusline1` solid fill plus the scheme canvas `bg0` as the check ink — the
// pairing `src/ui-accents.js` (G19) and `src/chat-bubble.js` already own:
//
//   light-hard   #93B259 + #FFFBEF  2.32:1
//   light-medium #93B259 + #FDF6E3  2.22:1
//   light-soft   #93B259 + #F3EAD3  2.00:1
//   dark-hard    #A7C080 + #272E33  6.88:1
//   dark-medium  #A7C080 + #2D353B  6.23:1
//   dark-soft    #A7C080 + #333C43  5.62:1
//
// The dark pair is WCAG AA; the light pair is the palette's documented
// cream-ink ceiling on `statusline1` (contrast.md §2i) — the same trade-off the
// selected row, the bubble and the send button already run, and the user picked
// it explicitly over a deep-ink variant for the bubble on 2026-11-10. The check
// glyph is a graphical object rather than body text, and the fill itself carries
// most of the "checked" signal; the box also stays legible as a shape because
// the green is far more saturated than the cream card.
//
// Hover: while the pointer is on an option row DSH washes the row with
// `interactive-bg-hover` and leaves the hairline neutral. The sheet lifts that
// hairline to the accent fill, so the control previews the colour it is about to
// take. A checked box is unaffected (its border already is the fill).
//
// The idle (unchecked) hairline stays DSH's `border-l4`: tinting five idle boxes
// green would turn the option list into a field of green outlines, and the ask
// was about the button's selection state.
//
// Anchors are DSH's stable attributes, never the hashed CSS-module prefix: the
// composer frame carries `data-question-key`, each choice is a `[data-option-row]`,
// and the box itself is the `_checkbox` / `_checkboxChecked` local-name fragment
// (the same `[class*="_…"]` approach as `_bubble` / `markBusy`). The answered
// reply card (`[data-question-reply]`) renders no checkbox, so nothing else is
// hit by these rules.
//
// The module is a pure ESM source: no DOM, no state. `scripts/build.mjs` bundles
// it into `client.js`; `src/client-entry.js` owns the `<style>` element.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The question composer frame: DSH tags it with the pending batch key. */
export const QUESTION_COMPOSER = '[data-question-key]'

/** One choice row inside the composer. */
export const QUESTION_OPTION_ROW = `${QUESTION_COMPOSER} [data-option-row]`

/** The multi-select box (its `::before` is the visible 14px square). */
export const QUESTION_CHECKBOX = `${QUESTION_COMPOSER} [class*="_checkbox"]`

/** The checked box: DSH adds the `checkboxChecked` local-name class. */
export const QUESTION_CHECKBOX_CHECKED = `${QUESTION_COMPOSER} [class*="_checkboxChecked"]`

/** A box whose row is hovered: its hairline previews the accent fill. */
export const QUESTION_CHECKBOX_HOVER = `${QUESTION_OPTION_ROW}:hover [class*="_checkbox"]`

/**
 * One variant's accent pair for the checked box: the interaction accent fill and
 * the scheme canvas `bg0` as the tick ink — the same pair the selected session
 * row and the chat bubble use (light 2.00–2.32:1, dark 5.62–6.88:1, WCAG AA in
 * the dark schemes). The 2026-11-15 review briefly re-inked the tick (deep pine in
 * light, cream white in dark); the user withdrew that and asked for the canvas
 * pair back (design §45).
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ fill: string, ink: string }} both opaque `#RRGGBB`.
 */
export function questionChoiceRole (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return {
    fill: palette.fg.statusline1,
    ink: palette.ramp.bg0
  }
}

/**
 * The six variants' accent pairs, keyed `${scheme}-${strength}`.
 * @returns {Record<string, { fill: string, ink: string }>}
 */
export function questionChoiceRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = questionChoiceRole(scheme, strength)
    }
  }
  return roles
}

/**
 * The variant scope: the strength attribute the token layer writes on `<html>`
 * plus DSH's own dark-theme flag on <body> — the pattern every always-on sheet
 * uses (`src/turn-rail.js`, `src/running-title.js`). The color-mode attribute is
 * deliberately NOT part of it: this is interactive chrome, not markdown content,
 * and gating it would make the box the only chrome sheet that stops being painted
 * if that anchor ever goes away (2026-11-15 review).
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
 * One variant's three rules, in cascade order: checked ink → checked fill → the
 * hover preview. The hover rule comes last but only moves `border-color`, so a
 * checked box (border already the fill) keeps its look.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ fill: string, ink: string }} roles
 * @returns {string}
 */
function questionChoiceVariantRules (scheme, strength, roles) {
  const scope = scopeFor(scheme, strength)
  return [
    `${scope} ${QUESTION_CHECKBOX_CHECKED} {
  color: ${roles.ink};
}`,
    `${scope} ${QUESTION_CHECKBOX_CHECKED}::before {
  border-color: ${roles.fill};
  background: ${roles.fill};
}`,
    `${scope} ${QUESTION_CHECKBOX_HOVER}::before {
  border-color: ${roles.fill};
}`
  ].join('\n\n')
}

/** Rules emitted per variant (asserted by the unit tests). */
export const QUESTION_CHOICE_RULES_PER_VARIANT = 3

/**
 * The complete multi-select checkbox stylesheet: six variants × three rules.
 * @returns {string}
 */
export function questionChoiceStyles () {
  const roles = questionChoiceRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      questionChoiceVariantRules(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
