import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio, labLightness, mix } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  WORK_STEP_DARK_CONTRAST,
  WORK_STEP_DIM,
  WORK_STEP_EXPANDED_BODY,
  WORK_STEP_FOLD_SUMMARY,
  WORK_STEP_GROUP_HEADER,
  WORK_STEP_LIGHT_CONTRAST,
  WORK_STEP_ROW,
  workStepRoles,
  workStepStyles
} from '../src/work-steps.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned inks of the 2026-11-10 follow-up: palette `fg` mixed 15% toward the
 * scheme canvas `bg0` (one hierarchy step below body text, above the old grey).
 */
const EXPECTED = {
  'light-hard': '#748085',
  'light-medium': '#747f83',
  'light-soft': '#737d81',
  'dark-hard': '#b9af98',
  'dark-medium': '#bab099',
  'dark-soft': '#bbb19b'
}

/** The scope of one variant's rule. */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** The chat canvas the step rows sit on. */
function canvasOf (scheme, strength) {
  return tokensFor({ ...DEFAULT_STATE, [scheme]: strength })['--dsw-alias-bg-base'][scheme]
}

/** The scheme foreground `fg` (= `label-primary`). */
function bodyInkOf (scheme, strength) {
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme].fg.fg
}

/** The old step ink (= `label-tertiary`). */
function oldInkOf (scheme, strength) {
  return tokensFor({ ...DEFAULT_STATE, [scheme]: strength })['--dsw-alias-label-tertiary'][scheme]
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one dimmed-body ink per variant, pinned to the 2026-11-10 follow-up values', () => {
  const roles = workStepRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].toLowerCase(), EXPECTED[variant].toLowerCase(), variant)
    assert.match(roles[variant], /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the step ink is fg mixed WORK_STEP_DIM toward the canvas', () => {
  const roles = workStepRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const expected = mix(bodyInkOf(scheme, strength), canvasOf(scheme, strength), WORK_STEP_DIM)
    assert.equal(roles[variant].toLowerCase(), expected.toLowerCase(), `${variant}: wrong derived ink`)
  }
  // Pinned as a literal so loosening the constant cannot silently flatten the
  // hierarchy step the user asked for.
  assert.equal(WORK_STEP_DIM, 0.15)
})

test('the step ink sits between body text and the old grey (hierarchy, not body ink)', () => {
  const roles = workStepRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const canvas = canvasOf(scheme, strength)
    const after = contrastRatio(roles[variant], canvas)
    const body = contrastRatio(bodyInkOf(scheme, strength), canvas)
    const previous = contrastRatio(oldInkOf(scheme, strength), canvas)
    assert.ok(after < body, `${variant}: step ink ${after.toFixed(2)} is not dimmer than body ${body.toFixed(2)}`)
    assert.ok(after > previous, `${variant}: step ink ${after.toFixed(2)} does not improve on label-tertiary ${previous.toFixed(2)}`)
    assert.ok(
      labLightness(roles[variant]) > 0 && Math.abs(labLightness(bodyInkOf(scheme, strength)) - labLightness(roles[variant])) >= 6,
      `${variant}: the hierarchy step must stay perceptible (>= 6 CIE L*)`
    )
  }
})

test('the step ink keeps the documented contrast floors, per scheme', () => {
  const roles = workStepRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const ratio = contrastRatio(roles[variant], canvasOf(scheme, strength))
    const floor = scheme === 'dark' ? WORK_STEP_DARK_CONTRAST : WORK_STEP_LIGHT_CONTRAST
    assert.ok(ratio >= floor, `${variant}: step ink on the canvas = ${ratio.toFixed(2)} < ${floor}`)
    if (scheme === 'dark') {
      assert.ok(ratio >= 4.5, `${variant}: dark step ink = ${ratio.toFixed(2)} < 4.5 (WCAG AA)`)
    }
  }
  // Literals (not just imported) so weakening the constants cannot make both
  // the checker and this suite green at the same time.
  assert.equal(WORK_STEP_DARK_CONTRAST, 4.5)
  assert.equal(WORK_STEP_LIGHT_CONTRAST, 3.5)
})

test('the sheet emits one rule per variant for the rows, header, summary and expanded body', () => {
  const css = workStepStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length)
  assert.equal(WORK_STEP_ROW, '[data-chat-flow-key] [data-disclosure-row]')
  assert.equal(WORK_STEP_GROUP_HEADER, '[data-chat-flow-key] [data-process-activity]')
  assert.equal(WORK_STEP_FOLD_SUMMARY, '[data-chat-flow-key] [data-turn-process]')
  assert.equal(WORK_STEP_EXPANDED_BODY, '[data-chat-flow-key] [data-markdown-variant="compact"]')
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const rule = rules.find((entry) => entry.startsWith(`${scope} ${WORK_STEP_ROW},`))
      assert.ok(rule, `missing rule for ${variant}`)
      assert.ok(rule.includes(`${scope} ${WORK_STEP_GROUP_HEADER},`), `${variant}: the group header must be re-inked`)
      assert.ok(rule.includes(`${scope} ${WORK_STEP_FOLD_SUMMARY},`), `${variant}: the fold summary must be re-inked`)
      assert.ok(rule.includes(`${scope} ${WORK_STEP_EXPANDED_BODY} {`), `${variant}: the expanded reasoning body must be re-inked`)
      assert.ok(rule.includes(`color: ${EXPECTED[variant]}`), `${variant}: wrong colour`)
      assert.equal(rule.match(new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')).length, 4, `${variant}: each selector carries the scope once`)
    }
  }
})

test('the selectors use DSH layout contracts, never the hashed module prefix', () => {
  const css = workStepStyles()
  assert.match(WORK_STEP_ROW, /^\[data-chat-flow-key\] \[data-disclosure-row\]$/)
  assert.match(WORK_STEP_GROUP_HEADER, /^\[data-chat-flow-key\] \[data-process-activity\]$/)
  assert.match(WORK_STEP_FOLD_SUMMARY, /^\[data-chat-flow-key\] \[data-turn-process\]$/)
  assert.match(WORK_STEP_EXPANDED_BODY, /^\[data-chat-flow-key\] \[data-markdown-variant="compact"\]$/)
  assert.ok(!css.includes('_row_'), 'the DisclosureRow build hash must not be pinned')
  assert.ok(!css.includes('l4nv8'), 'the current build hash must not be pinned')
  assert.ok(!css.includes('label-tertiary'))
})

test('the work-step sheet is always-on, un-gated and uses no !important', () => {
  const css = workStepStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
