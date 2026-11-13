import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import {
  HOME_WHALE_CANVAS,
  HOME_WHALE_CODE_INK,
  HOME_WHALE_OFFICIAL_FILTER,
  HOME_WHALE_OFFICIAL_OPACITY,
  HOME_WHALE_OPACITY,
  homeWhaleRoles,
  homeWhaleStyles
} from '../src/home-whale.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned colours of the 2026-11-13 request: the palette **text green** `green`
 * verbatim in every variant (dark `#A7C080`, light `#8DA101`) — the same role
 * the hero mark, its headline and the workspace folder names use, not the
 * lighter `statusline1` accent.
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

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one green whale ink per variant, pinned to the 2026-11-13 values', () => {
  const roles = homeWhaleRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].toLowerCase(), EXPECTED[variant].toLowerCase(), variant)
    assert.match(roles[variant], /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the colours are the palette text green, untouched', () => {
  const roles = homeWhaleRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(
      roles[variant].toLowerCase(),
      palette.fg.green.toLowerCase(),
      `${variant}: the home whale must use the palette text green`
    )
  }
})

test('the sheet emits one rule per variant that cancels the grayscale and re-inks both fills', () => {
  const css = homeWhaleStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length)
  assert.equal(HOME_WHALE_CANVAS, 'canvas[data-home-whale]')
  assert.equal(HOME_WHALE_CODE_INK, '--home-whale-code-ink')
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const rule = rules.find((entry) => entry.startsWith(`${scope} ${HOME_WHALE_CANVAS} {`))
      assert.ok(rule, `missing rule for ${variant}`)
      assert.ok(rule.includes('filter: none;'), `${variant}: the official grayscale must be cancelled`)
      assert.ok(rule.includes(`opacity: ${HOME_WHALE_OPACITY};`), `${variant}: the raised layer opacity is missing`)
      assert.ok(rule.includes(`color: ${EXPECTED[variant]};`), `${variant}: the dot fill ink is wrong`)
      assert.ok(
        rule.includes(`${HOME_WHALE_CODE_INK}: ${EXPECTED[variant]};`),
        `${variant}: the code-letter ink is wrong`
      )
      assert.equal(
        rule.match(new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')).length,
        1,
        `${variant}: the scope must appear exactly once`
      )
    }
  }
})

test('the sheet raises the layer opacity from the official 0.18 to the approved 0.3', () => {
  const css = homeWhaleStyles()
  // Both values are pinned as literals: the official baseline is documentation,
  // the theme's value is what the user approved ("有点太淡了，稍微把透明度调高一点
  // 试试"). A colour edit must not silently drift either one.
  assert.equal(HOME_WHALE_OFFICIAL_OPACITY, 0.18)
  assert.equal(HOME_WHALE_OPACITY, 0.3)
  assert.ok(HOME_WHALE_OPACITY > HOME_WHALE_OFFICIAL_OPACITY, 'the theme must be more present than the official layer')
  assert.ok(HOME_WHALE_OPACITY < 0.5, 'the whale must stay a background texture, not a foreground layer')
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length)
  for (const rule of rules) {
    assert.ok(rule.includes(`opacity: ${HOME_WHALE_OPACITY};`), 'every variant must carry the raised opacity')
  }
  assert.ok(!/animation|transition|transform|width|height|inset/i.test(css))
})

test('the anchor is the canvas marker, never the hashed module class', () => {
  const css = homeWhaleStyles()
  assert.ok(HOME_WHALE_CANVAS.includes('data-home-whale'))
  assert.ok(!css.includes('_canvas_'), 'the CSS-module class must not be pinned')
  assert.ok(!/canvas\[class/.test(css))
})

test('the sheet is always-on, un-gated and uses no !important', () => {
  const css = homeWhaleStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})

test('the official filter the sheet cancels is pinned as a literal', () => {
  // Pinned as a literal (not just imported) so weakening the constant cannot
  // make the sheet and this suite green at the same time.
  assert.equal(HOME_WHALE_OFFICIAL_FILTER, 'grayscale(1)')
  const css = homeWhaleStyles()
  assert.ok(!css.includes(HOME_WHALE_OFFICIAL_FILTER), 'the sheet must cancel the filter, not restate it')
})
