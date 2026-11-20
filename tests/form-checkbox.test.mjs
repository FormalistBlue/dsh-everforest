import assert from 'node:assert/strict'
import { test } from 'node:test'

import { contrastRatio } from '../src/color.js'
import {
  FORM_CHECKBOX,
  FORM_CHECKBOX_CHECKED,
  FORM_CHECKBOX_FOCUS,
  formCheckboxStyles
} from '../src/form-checkbox.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

const CSS = formCheckboxStyles()

/** The light schemes' documented cream-ink floor on the accent fill (G17 / G19). */
const LIGHT_TICK_FLOOR = 1.95

/** The dark schemes are WCAG AA on the accent fill. */
const DARK_TICK_FLOOR = 4.5

test('the selector anchors on DSH local-name fragments and only native inputs', () => {
  // `_checkbox` is the shared Checkbox label; `_acknowledgement` is the risk
  // dialog's own label class. Both are local-name fragments, never the hashed
  // prefix the CSS module generates.
  assert.match(FORM_CHECKBOX, /\[class\*="_checkbox"\]/)
  assert.match(FORM_CHECKBOX, /\[class\*="_acknowledgement"\]/)
  assert.ok(FORM_CHECKBOX.endsWith('input[type="checkbox"]'), 'must end in the native input so spans are untouched')
  // The markdown task list has no `_checkbox` ancestor and the question composer's
  // box is a span, so neither is painted by this sheet.
  assert.doesNotMatch(FORM_CHECKBOX, /markdown|data-question-key/)
})

test('the box is drawn, not delegated to the native accent', () => {
  const rule = CSS.slice(CSS.indexOf(FORM_CHECKBOX), CSS.indexOf(FORM_CHECKBOX_CHECKED))
  assert.match(rule, /-webkit-appearance: none;/)
  assert.match(rule, /appearance: none;/)
  // `accent-color` cannot recolour the glyph (Chromium derives it from the
  // accent's luminance), so the sheet must not rely on it.
  assert.doesNotMatch(CSS, /accent-color/)
  assert.match(CSS, /border: 1px solid color-mix\(in srgb, var\(--dsw-alias-brand-primary\) 68%, transparent\);/)
  assert.match(CSS, /background-color: color-mix\(in srgb, var\(--dsw-alias-brand-primary\) 10%, transparent\);/)
})

test('the checked state takes the accent fill and the scheme canvas tick', () => {
  const checked = CSS.slice(CSS.indexOf(`${FORM_CHECKBOX_CHECKED} {`), CSS.indexOf(`${FORM_CHECKBOX_CHECKED}::after`))
  assert.match(checked, /border-color: var\(--dsw-alias-brand-primary\);/)
  assert.match(checked, /background-color: var\(--dsw-alias-brand-primary\);/)
  const tick = CSS.slice(CSS.indexOf(`${FORM_CHECKBOX_CHECKED}::after`), CSS.indexOf(`${FORM_CHECKBOX_FOCUS} {`))
  assert.match(tick, /border: solid var\(--dsw-alias-bg-base\);/)
  assert.match(tick, /border-width: 0 1\.5px 1\.5px 0;/)
  assert.match(tick, /transform: translate\(-50%, -58%\) rotate\(42deg\);/)
})

test('the tick pair is the palette pair, and clears its documented floor', () => {
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
      const layer = tokensFor({ light: strength, dark: strength })
      // The sheet reads the tokens; the tokens must be the pair the rest of the
      // theme uses — interaction accent fill + scheme canvas ink.
      assert.equal(layer['--dsw-alias-brand-primary'][scheme], palette.fg.statusline1, `${variant}: brand-primary`)
      assert.equal(layer['--dsw-alias-bg-base'][scheme], palette.ramp.bg0, `${variant}: bg-base`)
      const ratio = contrastRatio(palette.ramp.bg0, palette.fg.statusline1)
      const floor = scheme === 'dark' ? DARK_TICK_FLOOR : LIGHT_TICK_FLOOR
      assert.ok(ratio >= floor, `${variant}: tick on fill ${ratio.toFixed(2)}:1 < ${floor}`)
    }
  }
})

test('focus keeps a visible ring and the sheet stays override-free', () => {
  assert.match(CSS, new RegExp(`${FORM_CHECKBOX_FOCUS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`))
  assert.match(CSS, /outline: 2px solid var\(--dsw-focus-ring-color, var\(--dsw-alias-state-business-primary\)\);/)
  assert.doesNotMatch(CSS, /!important/)
  assert.match(CSS, /\n$/)
})
