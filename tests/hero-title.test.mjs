import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  HERO_BRAND_MARK,
  HERO_HEADLINE,
  HERO_TITLE_DARK_CONTRAST,
  HERO_TITLE_LIGHT_CONTRAST,
  heroTitleRoles,
  heroTitleStyles
} from '../src/hero-title.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned colours of the 2026-11-09 hero request: the palette **text green**
 * `green` verbatim in every variant (dark `#A7C080`, light `#8DA101`) — the
 * same role the conversation title and the workspace folder names use, not the
 * lighter `statusline1` selection background.
 */
const EXPECTED = {
  'light-hard': '#8DA101',
  'light-medium': '#8DA101',
  'light-soft': '#8DA101',
  'dark-hard': '#A7C080',
  'dark-medium': '#A7C080',
  'dark-soft': '#A7C080'
}

/** The scope of one variant's rule. */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** The conversation canvas the hero sits on. */
function canvasOf (scheme, strength) {
  return tokensFor({ ...DEFAULT_STATE, [scheme]: strength })['--dsw-alias-bg-base'][scheme]
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one green hero ink per variant, pinned to the 2026-11-09 values', () => {
  const roles = heroTitleRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].toLowerCase(), EXPECTED[variant].toLowerCase(), variant)
    assert.match(roles[variant], /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the colours are the palette text green, untouched', () => {
  const roles = heroTitleRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(
      roles[variant].toLowerCase(),
      palette.fg.green.toLowerCase(),
      `${variant}: the hero must use the palette text green`
    )
  }
})

test('the hero ink keeps the documented canvas floors, per scheme', () => {
  const roles = heroTitleRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const ratio = contrastRatio(roles[variant], canvasOf(scheme, strength))
    const floor = scheme === 'dark' ? HERO_TITLE_DARK_CONTRAST : HERO_TITLE_LIGHT_CONTRAST
    assert.ok(ratio >= floor, `${variant}: hero ink on the canvas = ${ratio.toFixed(2)} < ${floor}`)
    if (scheme === 'dark') {
      // Dark schemes are a real WCAG AA pair (5.62–6.88:1).
      assert.ok(ratio >= 4.5, `${variant}: dark hero ink = ${ratio.toFixed(2)} < 4.5`)
    } else {
      // The light palette cannot go higher without turning the accent into the
      // grey ink; the measured ceiling is pinned instead of being corrected.
      assert.ok(ratio < 4.5, `${variant}: light hero ink unexpectedly reached 4.5:1 (update the deviation)`)
    }
  }
})

test('the two documented floors are pinned to literals', () => {
  // Pinned as literals (not just imported) so weakening the constant cannot
  // make both the checker and this suite green at the same time.
  assert.equal(HERO_TITLE_DARK_CONTRAST, 4.5)
  assert.equal(HERO_TITLE_LIGHT_CONTRAST, 2.3)
})

test('the sheet emits one rule per variant for the headline and its brand mark', () => {
  const css = heroTitleStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length)
  assert.equal(HERO_HEADLINE, '[class*="headline"]:has([class*="fishHitbox"])')
  assert.equal(HERO_BRAND_MARK, `${HERO_HEADLINE} [class*="fish"]`)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const rule = rules.find((entry) => entry.startsWith(`${scope} ${HERO_HEADLINE},`))
      assert.ok(rule, `missing rule for ${variant}`)
      assert.ok(rule.includes(`${scope} ${HERO_BRAND_MARK} {`), `${variant}: the brand mark must be re-inked`)
      assert.ok(rule.includes(`color: ${EXPECTED[variant]}`), `${variant}: wrong colour`)
      assert.equal(rule.match(new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')).length, 2, `${variant}: each selector carries the scope once`)
    }
  }
})

test('the selectors use the hero structure, never the hashed module prefix', () => {
  assert.ok(HERO_HEADLINE.includes('headline'))
  assert.ok(HERO_HEADLINE.includes(':has('))
  assert.ok(HERO_HEADLINE.includes('fishHitbox'))
  assert.ok(HERO_BRAND_MARK.startsWith(HERO_HEADLINE))
  const css = heroTitleStyles()
  assert.ok(!css.includes('WOwLGG'), 'the build hash must not be pinned')
  assert.ok(!css.includes('crumbCurrent'), 'the conversation title stays DSH-native')
})

test('the hero sheet is always-on, un-gated and uses no !important', () => {
  const css = heroTitleStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
