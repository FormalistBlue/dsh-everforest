import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio, hexToRgb, mix, rgbToHex } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import { RUNNING_SESSION_ROW } from '../src/running-title.js'
import {
  RUNNING_SPINNER,
  RUNNING_SPINNER_DARK_CONTRAST,
  RUNNING_SPINNER_LIGHT_CONTRAST,
  RUNNING_SPINNER_NEUTRAL_TOLERANCE,
  RUNNING_SPINNER_RULES_PER_VARIANT,
  runningSpinnerRoles,
  runningSpinnerStyles
} from '../src/running-spinner.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned ring colour of the 2026-11-18 request: the palette text green `green`
 * (dark `#A7C080`, light `#8DA101`) — the same ink as the running title's resting
 * green and the workspace folder names.
 */
const EXPECTED = {
  'light-hard': '#8da101',
  'light-medium': '#8da101',
  'light-soft': '#8da101',
  'dark-hard': '#a7c080',
  'dark-medium': '#a7c080',
  'dark-soft': '#a7c080'
}

/** The scope of one variant's rule. */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/**
 * The row surface of one variant: the sidebar fill as-is, and the translucent
 * `interactive-bg-hover` token flattened over it the way the browser does (a
 * running row can be hovered).
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ sidebar: string, hover: string, neutral: string }}
 */
function surfacesOf (scheme, strength) {
  const tokens = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
  const sidebar = tokens['--dsw-specific-sidebar-fill'][scheme]
  const { r, g, b, a } = hexToRgb(tokens['--dsw-alias-interactive-bg-hover'][scheme])
  return {
    sidebar,
    hover: mix(sidebar, rgbToHex({ r, g, b, a: 1 }), a),
    neutral: tokens['--dsw-alias-label-tertiary'][scheme]
  }
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one ring colour per variant, pinned to the palette text green', () => {
  const roles = runningSpinnerRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(roles[variant].toLowerCase(), EXPECTED[variant], `${variant} ring`)
    assert.equal(roles[variant].toLowerCase(), palette.fg.green.toLowerCase(), `${variant} must be fg.green`)
    assert.match(roles[variant], /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the ring is never weaker than the neutral label-tertiary ring it replaces', () => {
  // The 2026-11-18 change is a hue swap: the text green has to hold at least the
  // neutral ring's contrast on the row (resting and hovered) in every variant.
  assert.equal(RUNNING_SPINNER_NEUTRAL_TOLERANCE, 0.02)
  assert.deepEqual([RUNNING_SPINNER_LIGHT_CONTRAST, RUNNING_SPINNER_DARK_CONTRAST], [2.3, 4.5])
  const roles = runningSpinnerRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const { sidebar, hover, neutral } = surfacesOf(scheme, strength)
    const ink = roles[variant]
    const floor = scheme === 'dark' ? RUNNING_SPINNER_DARK_CONTRAST : RUNNING_SPINNER_LIGHT_CONTRAST
    const resting = contrastRatio(ink, sidebar)
    const hovered = contrastRatio(ink, hover)
    assert.ok(resting >= floor, `${variant}: ring = ${resting.toFixed(2)} < ${floor}`)
    assert.ok(
      resting + RUNNING_SPINNER_NEUTRAL_TOLERANCE >= contrastRatio(neutral, sidebar),
      `${variant}: ring ${resting.toFixed(2)} is weaker than the neutral it replaces (${contrastRatio(neutral, sidebar).toFixed(2)})`
    )
    assert.ok(
      hovered + RUNNING_SPINNER_NEUTRAL_TOLERANCE >= contrastRatio(neutral, hover),
      `${variant}: hovered ring ${hovered.toFixed(2)} is weaker than the neutral it replaces (${contrastRatio(neutral, hover).toFixed(2)})`
    )
  }
  // Dark is a real AA pair; light is the documented palette ceiling (the same
  // 2.35–2.68 range the folder names and the running title already carry).
  for (const variant of VARIANT_NAMES.filter((name) => name.startsWith('dark'))) {
    assert.ok(contrastRatio(roles[variant], surfacesOf(...variant.split('-')).sidebar) >= 4.5, variant)
  }
})

test('the sheet emits one colour-only rule per variant', () => {
  const css = runningSpinnerStyles()
  const rules = styleRules(css)
  assert.equal(RUNNING_SPINNER_RULES_PER_VARIANT, 1)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * RUNNING_SPINNER_RULES_PER_VARIANT)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const selector = `${scopeOf(scheme, strength)} ${RUNNING_SPINNER}`
      const rule = rules.find((entry) => entry.startsWith(`${selector} {`))
      assert.ok(rule, `missing rule for ${variant}`)
      assert.equal(
        rule,
        `${selector} {\n  color: ${runningSpinnerRoles()[variant]};\n}`,
        `${variant}: the rule must be the ink alone`
      )
      // DSH owns the ring geometry: the sheet must not restate stroke, opacity or
      // the dash animation (the circles already paint `stroke: currentColor`).
      for (const property of ['stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'animation', 'transform', 'width', 'height', 'display']) {
        assert.ok(!new RegExp(`(^|[\\s;{])${property}:`, 'm').test(rule), `${variant}: must not set ${property}`)
      }
    }
  }
  assert.ok(!css.includes('!important'))
  assert.ok(!css.includes('wnFoaW'), 'the anchor must not use the hashed CSS-module prefix')
  assert.ok(!css.includes('background'), 'the ring must not repaint a surface')
})

test('the anchor is the running row of the title glare, selected rows excluded', () => {
  assert.equal(RUNNING_SESSION_ROW,
    '[role="treeitem"][data-row-key^="session:"]:has([data-state="ongoing"]):not([aria-selected="true"])')
  assert.equal(RUNNING_SPINNER, `${RUNNING_SESSION_ROW} svg[data-state="ongoing"]`)
  const css = runningSpinnerStyles()
  assert.ok(css.includes(':has([data-state="ongoing"])'))
  assert.ok(css.includes(':not([aria-selected="true"])'), 'the selected row must keep the band ink')
  assert.ok(css.includes('svg[data-state="ongoing"]'), 'the real StateDot markup is the hook')
  // Semantic dots never match: only the `ongoing` state is inked here.
  for (const state of ['warning', 'done', 'error']) {
    assert.ok(!css.includes(`data-state="${state}"`), `the sheet must not touch the ${state} dot`)
  }
})

test('the sheet is always-on and un-gated by the color mode', () => {
  const css = runningSpinnerStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
