import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  QUESTION_CHECKBOX,
  QUESTION_CHECKBOX_CHECKED,
  QUESTION_CHECKBOX_HOVER,
  QUESTION_CHOICE_RULES_PER_VARIANT,
  QUESTION_COMPOSER,
  QUESTION_OPTION_ROW,
  questionChoiceRole,
  questionChoiceRoles,
  questionChoiceStyles
} from '../src/question-choices.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned pairs of the 2026-11-15 request: the checked box takes the interaction
 * accent `statusline1` (light `#93B259`, dark `#A7C080`) as its fill and the
 * scheme canvas `bg0` as the tick ink — the pair the selected session row, the
 * dropdown option and the chat bubble already carry.
 */
const EXPECTED = {
  'light-hard': { fill: '#93B259', ink: '#FFFBEF' },
  'light-medium': { fill: '#93B259', ink: '#FDF6E3' },
  'light-soft': { fill: '#93B259', ink: '#F3EAD3' },
  'dark-hard': { fill: '#A7C080', ink: '#272E33' },
  'dark-medium': { fill: '#A7C080', ink: '#2D353B' },
  'dark-soft': { fill: '#A7C080', ink: '#333C43' }
}

/**
 * Tick floors. The pair is the accent layer's own (light cream 2.00–2.32:1 with
 * its documented 1.95 floor, dark canvas ink 5.62–6.88:1 = WCAG AA).
 */
const ACCENT_DARK_INK_CONTRAST = 4.5

/** The light schemes' accent ink on `statusline1` (cream `bg0`, 2.00–2.32:1). */
const ACCENT_LIGHT_INK_CONTRAST = 1.95

/** A checked box must not disappear into the card (its own light·soft floor). */
const FILL_VISIBILITY_CONTRAST = 1.9

/** The scope of one variant's rules — strength + DSH's dark flag (always-on chrome). */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one accent pair per variant, pinned to the interaction green and the canvas ink', () => {
  const roles = questionChoiceRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].fill.toLowerCase(), EXPECTED[variant].fill.toLowerCase(), `${variant} fill`)
    assert.equal(roles[variant].ink.toLowerCase(), EXPECTED[variant].ink.toLowerCase(), `${variant} ink`)
    assert.match(roles[variant].fill, /^#[0-9a-f]{6}$/i, `${variant}: fill must be an opaque #RRGGBB`)
    assert.match(roles[variant].ink, /^#[0-9a-f]{6}$/i, `${variant}: ink must be an opaque #RRGGBB`)
  }
})

test('the pair is the palette accent, not a hand-picked green', () => {
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(questionChoiceRole(scheme, strength).fill.toLowerCase(), palette.fg.statusline1.toLowerCase(), variant)
    // Both schemes take the scheme canvas `bg0` as the tick ink, like the selected
    // row, the dropdown option and the chat bubble.
    assert.equal(
      questionChoiceRole(scheme, strength).ink.toLowerCase(),
      palette.ramp.bg0.toLowerCase(),
      variant
    )
  }
})

test('the tick stays readable on the fill in every variant', () => {
  for (const variant of VARIANT_NAMES) {
    const { fill, ink } = questionChoiceRole(...variant.split('-'))
    const ratio = contrastRatio(ink, fill)
    const floor = variant.startsWith('dark') ? ACCENT_DARK_INK_CONTRAST : ACCENT_LIGHT_INK_CONTRAST
    assert.ok(ratio >= floor, `${variant}: tick on fill ${ratio.toFixed(2)}:1 < ${floor}`)
  }
})

test('the checked box keeps a visible shape on the composer card', () => {
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const { fill } = questionChoiceRole(scheme, strength)
    const card = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })['--dsw-specific-input-major'][scheme]
    const ratio = contrastRatio(fill, card)
    assert.ok(
      ratio >= FILL_VISIBILITY_CONTRAST,
      `${variant}: checked fill on the question card ${ratio.toFixed(2)}:1 < ${FILL_VISIBILITY_CONTRAST}`
    )
  }
})

test('the anchors are DSH contracts, not CSS-module hashes', () => {
  assert.equal(QUESTION_COMPOSER, '[data-question-key]')
  assert.equal(QUESTION_OPTION_ROW, '[data-question-key] [data-option-row]')
  assert.equal(QUESTION_CHECKBOX, '[data-question-key] [class*="_checkbox"]')
  assert.equal(QUESTION_CHECKBOX_CHECKED, '[data-question-key] [class*="_checkboxChecked"]')
  assert.equal(QUESTION_CHECKBOX_HOVER, '[data-question-key] [data-option-row]:hover [class*="_checkbox"]')
  for (const selector of [QUESTION_COMPOSER, QUESTION_OPTION_ROW, QUESTION_CHECKBOX, QUESTION_CHECKBOX_CHECKED, QUESTION_CHECKBOX_HOVER]) {
    assert.ok(!/wnLwla|SNx2jG/.test(selector), `must not depend on a hashed module prefix: ${selector}`)
  }
})

test('the sheet emits three rules per variant in cascade order', () => {
  const rules = styleRules(questionChoiceStyles())
  assert.equal(QUESTION_CHOICE_RULES_PER_VARIANT, 3)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * QUESTION_CHOICE_RULES_PER_VARIANT)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const { fill, ink } = EXPECTED[variant]

      const inkRule = rules.find((rule) => rule.startsWith(`${scope} ${QUESTION_CHECKBOX_CHECKED} {`))
      assert.ok(inkRule, `missing tick-ink rule for ${variant}`)
      assert.ok(inkRule.includes(`color: ${ink};`), `${variant}: tick ink`)

      const fillRule = rules.find((rule) => rule.startsWith(`${scope} ${QUESTION_CHECKBOX_CHECKED}::before {`))
      assert.ok(fillRule, `missing fill rule for ${variant}`)
      assert.ok(fillRule.includes(`border-color: ${fill};`), `${variant}: box border`)
      assert.ok(fillRule.includes(`background: ${fill};`), `${variant}: box fill`)

      const hoverRule = rules.find((rule) => rule.startsWith(`${scope} ${QUESTION_CHECKBOX_HOVER}::before {`))
      assert.ok(hoverRule, `missing hover rule for ${variant}`)
      assert.ok(hoverRule.includes(`border-color: ${fill};`), `${variant}: hover preview`)
      assert.ok(!hoverRule.includes('background'), `${variant}: hover must not fill an unchecked box`)
    }
  }
})

test('the checked fill rule leaves the tick painted by DSH and only re-inks it', () => {
  const css = questionChoiceStyles()
  // DSH draws the 14px square on `::before`; the sheet must not resize it.
  assert.ok(!css.includes('width:'), 'the sheet must not change the box geometry')
  assert.ok(!css.includes('height:'), 'the sheet must not change the box geometry')
  assert.ok(!css.includes('border-width'), 'the sheet must not add a border width')
})

test('the sheet is always-on, un-gated by JS and free of !important', () => {
  const css = questionChoiceStyles()
  assert.ok(!css.includes('!important'))
  // Interactive chrome, like every other always-on sheet: the color-mode anchor
  // must NOT gate it (2026-11-15 review — it used to be the only one that did).
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
  // The option text / description inks are DSH's own; only the box is repainted.
  assert.ok(!css.includes('--dsw-alias-label-primary'), 'must not repaint the option label ink')
  assert.ok(!css.includes('--dsw-alias-label-primary-foreground'), 'must not fall back to DSH’s inverted tick')
})
