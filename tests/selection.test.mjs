import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { RAMPS, SCHEMES, STRENGTHS } from '../src/palette.js'
import { selectionStyles } from '../src/selection.js'

/**
 * The selector of one variant's `::selection` rule.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

test('one ::selection rule per scheme and strength, background = bg_visual', () => {
  const css = selectionStyles()
  assert.equal((css.match(/::selection/g) || []).length, SCHEMES.length * STRENGTHS.length)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const ramp = RAMPS[scheme][strength]
      assert.ok(css.includes(scopeOf(scheme, strength)), `missing selector for ${scheme}-${strength}`)
      assert.ok(css.includes(`background-color: ${ramp.bgVisual}`), `wrong background for ${scheme}-${strength}`)
    }
  }
})

test('selection keeps each element’s own text colour (Enchanted behaviour)', () => {
  const css = selectionStyles()
  // Every rule lets the originating element's colour win; a fixed scheme ink
  // would flatten syntax colours and color-mode headings into one colour.
  assert.equal((css.match(/color: inherit/g) || []).length, SCHEMES.length * STRENGTHS.length)
  assert.ok(!/(?:^|[;\s])color: #[0-9a-f]{6}/i.test(css), 'selection must not force a fixed foreground colour')
})

test('light selection uses the Enchanted #DED8DB effective value', () => {
  const css = selectionStyles()
  for (const strength of STRENGTHS) {
    assert.ok(css.includes(scopeOf('light', strength) + ' ::selection'), `missing light-${strength} rule`)
  }
  assert.equal(RAMPS.light.hard.bgVisual, '#DED8DB')
  assert.equal((css.match(/#DED8DB/g) || []).length, STRENGTHS.length)
})

test('the selection sheet is independent of the color mode and uses no !important', () => {
  const css = selectionStyles()
  assert.ok(!css.includes('data-everforest-color-mode'))
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
