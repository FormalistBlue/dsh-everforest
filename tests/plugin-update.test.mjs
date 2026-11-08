import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  PLUGIN_UPDATE_BADGE_DARK_CONTRAST,
  PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST,
  PLUGIN_UPDATE_BODY,
  PLUGIN_UPDATE_TEXT_DARK_CONTRAST,
  PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST,
  UPDATE_OUTCOME_GLYPH,
  UPDATE_STEP,
  UPDATE_STEP_DOT,
  UPDATE_STEP_LABEL,
  pluginUpdateRoles,
  pluginUpdateStyles
} from '../src/plugin-update.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned colours of the plugin-update dialog: the interaction accent
 * `statusline1` for finished steps / solid badges and the palette `red` for
 * failed ones.
 */
const EXPECTED = {
  'light-hard': { green: '#93B259', red: '#F85552', ink: '#FFFBEF', label: '#5C6A72' },
  'light-medium': { green: '#93B259', red: '#F85552', ink: '#FDF6E3', label: '#5C6A72' },
  'light-soft': { green: '#93B259', red: '#F85552', ink: '#F3EAD3', label: '#5C6A72' },
  'dark-hard': { green: '#A7C080', red: '#E67E80', ink: '#272E33', label: '#D3C6AA' },
  'dark-medium': { green: '#A7C080', red: '#E67E80', ink: '#2D353B', label: '#D3C6AA' },
  'dark-soft': { green: '#A7C080', red: '#E67E80', ink: '#333C43', label: '#D3C6AA' }
}

test('the four update-dialog floors are pinned to literals', () => {
  // Pinned as literals (not just imported) so weakening the constant cannot
  // make both the checker and this suite green at the same time.
  assert.equal(PLUGIN_UPDATE_TEXT_DARK_CONTRAST, 4.0)
  assert.equal(PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST, 1.9)
  assert.equal(PLUGIN_UPDATE_BADGE_DARK_CONTRAST, 4.5)
  assert.equal(PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST, 1.95)
})

/** The scope of one variant's rules. */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one colour set per variant, pinned to the palette interaction accent', () => {
  const roles = pluginUpdateRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.deepEqual(roles[variant], {
      green: palette.fg.statusline1,
      red: palette.fg.red,
      ink: palette.ramp.bg0,
      label: palette.fg.fg
    }, variant)
    assert.deepEqual(roles[variant], EXPECTED[variant], `${variant}: pinned values drifted`)
    // The light schemes must read the lighter `#93B259` (2026-11-08 follow-up:
    // the light dialog's 完成 button is that green); dark is unchanged.
    if (scheme === 'light') assert.equal(roles[variant].green, '#93B259', `${variant}: light green must be statusline1`)
  }
})

test('the step text and the solid badge keep their documented floors', () => {
  const roles = pluginUpdateRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const tokens = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
    const surface = tokens['--dsw-alias-bg-module-platform'][scheme]
    const textRatio = contrastRatio(roles[variant].green, surface)
    const badgeRatio = contrastRatio(roles[variant].ink, roles[variant].green)
    const textFloor = scheme === 'dark' ? PLUGIN_UPDATE_TEXT_DARK_CONTRAST : PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST
    const badgeFloor = scheme === 'dark' ? PLUGIN_UPDATE_BADGE_DARK_CONTRAST : PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST
    assert.ok(textRatio >= textFloor, `${variant}: step text = ${textRatio.toFixed(2)} < ${textFloor}`)
    assert.ok(badgeRatio >= badgeFloor, `${variant}: badge ink = ${badgeRatio.toFixed(2)} < ${badgeFloor}`)
    // The dark schemes keep a real AA badge and a readable step text.
    if (scheme === 'dark') {
      assert.ok(badgeRatio >= 4.5, `${variant}: dark badge ink = ${badgeRatio.toFixed(2)} < 4.5`)
      assert.ok(textRatio >= 4.0, `${variant}: dark step text = ${textRatio.toFixed(2)} < 4.0`)
    }
  }
})

test('the sheet emits five rules per variant with the dialog stable hooks', () => {
  const css = pluginUpdateStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * 5)
  assert.equal(PLUGIN_UPDATE_BODY, '[data-plugin-update]')
  assert.equal(UPDATE_STEP, `${PLUGIN_UPDATE_BODY} [data-state]`)
  assert.equal(UPDATE_STEP_LABEL, `${UPDATE_STEP} > span:last-child`)
  assert.equal(UPDATE_STEP_DOT, `${UPDATE_STEP} > span:first-child`)
  assert.equal(UPDATE_OUTCOME_GLYPH, `${PLUGIN_UPDATE_BODY} > [role="status"] > [data-tone="success"]`)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const expected = EXPECTED[variant]
      const ruleOf = (prefix) => rules.find((rule) => rule.startsWith(`${scope} ${prefix} {`))
      assert.ok(ruleOf(UPDATE_STEP_LABEL), `${variant}: missing the base label rule`)
      assert.ok(ruleOf(UPDATE_STEP_LABEL).includes(`color: ${expected.label}`), `${variant}: wrong base ink`)
      const done = ruleOf(`${UPDATE_STEP}[data-state="done"] > span:last-child`)
      assert.ok(done, `${variant}: missing the done-label rule`)
      assert.ok(done.includes(`color: ${expected.green}`), `${variant}: wrong done-label colour`)
      const failed = ruleOf(`${UPDATE_STEP}[data-state="failed"] > span:last-child`)
      assert.ok(failed, `${variant}: missing the failed-label rule`)
      assert.ok(failed.includes(`color: ${expected.red}`), `${variant}: wrong failed-label colour`)
      const badge = ruleOf(`${UPDATE_STEP}[data-state="done"] > span:first-child`)
      assert.ok(badge, `${variant}: missing the solid done-badge rule`)
      assert.ok(badge.includes(`background: ${expected.green}`), `${variant}: badge fill must be the success green`)
      assert.ok(badge.includes(`color: ${expected.ink}`), `${variant}: badge ink must be the canvas`)
      const glyph = ruleOf(UPDATE_OUTCOME_GLYPH)
      assert.ok(glyph, `${variant}: missing the outcome-glyph rule`)
      assert.ok(glyph.includes(`background: ${expected.green}`), `${variant}: outcome glyph fill drifted`)
      assert.ok(glyph.includes(`color: ${expected.ink}`), `${variant}: outcome glyph ink drifted`)
    }
  }
})

test('the update-dialog sheet is always-on, un-gated and uses no !important', () => {
  const css = pluginUpdateStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
