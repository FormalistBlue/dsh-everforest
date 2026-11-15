import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  TURN_RAIL_BAR_HEIGHT,
  TURN_RAIL_BAR_RADIUS,
  TURN_RAIL_BAR_WIDTH,
  TURN_RAIL_BUSY_EASE,
  TURN_RAIL_BUSY_KEYFRAMES,
  TURN_RAIL_BUSY_MS,
  TURN_RAIL_BUSY_OPACITY,
  TURN_RAIL_EASE,
  TURN_RAIL_HOVER_SCALE,
  TURN_RAIL_MARK,
  TURN_RAIL_MARK_ACTIVE,
  TURN_RAIL_MARK_BUSY,
  TURN_RAIL_MARK_FOCUS,
  TURN_RAIL_MARK_HOVER,
  TURN_RAIL_MARK_UNLOADED,
  TURN_RAIL_REDUCED_MOTION_PER_VARIANT,
  TURN_RAIL_REST_SCALE,
  TURN_RAIL_ROOT,
  TURN_RAIL_RULES_PER_VARIANT,
  TURN_RAIL_TRANSITION_MS,
  TURN_RAIL_UNLOADED_OPACITY,
  TURN_RAIL_UNLOADED_SCALE,
  turnRailRoles,
  turnRailStyles
} from '../src/turn-rail.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned greens of the 2026-11-15 scheme-D request: the current turn uses the
 * palette **text** green `green` (light `#8DA101`, dark `#A7C080`), while hover
 * lifts a resting dash to the lighter background green `statusline1`
 * (light `#93B259`; dark is the same `#A7C080`, so the split only shows in the
 * light schemes).
 */
const EXPECTED = {
  'light-hard': { active: '#8DA101', hover: '#93B259' },
  'light-medium': { active: '#8DA101', hover: '#93B259' },
  'light-soft': { active: '#8DA101', hover: '#93B259' },
  'dark-hard': { active: '#A7C080', hover: '#A7C080' },
  'dark-medium': { active: '#A7C080', hover: '#A7C080' },
  'dark-soft': { active: '#A7C080', hover: '#A7C080' }
}

/** The lowest contrast the current-turn step keeps on the canvas (light·soft). */
const TURN_RAIL_MIN_ACTIVE_CONTRAST = 2.4

/** The scope of one variant's rule. */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one green pair per variant, pinned to the 2026-11-15 scheme-D values', () => {
  const roles = turnRailRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].active.toLowerCase(), EXPECTED[variant].active.toLowerCase(), `${variant} active`)
    assert.equal(roles[variant].hover.toLowerCase(), EXPECTED[variant].hover.toLowerCase(), `${variant} hover`)
    assert.match(roles[variant].active, /^#[0-9a-f]{6}$/i, `${variant}: active must be an opaque #RRGGBB`)
    assert.match(roles[variant].hover, /^#[0-9a-f]{6}$/i, `${variant}: hover must be an opaque #RRGGBB`)
  }
})

test('the current turn uses the palette text green and hover the lighter accent', () => {
  const roles = turnRailRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(roles[variant].active.toLowerCase(), palette.fg.green.toLowerCase(), variant)
    assert.equal(roles[variant].hover.toLowerCase(), palette.fg.statusline1.toLowerCase(), variant)
    if (scheme === 'light') {
      assert.notEqual(palette.fg.green.toLowerCase(), palette.fg.statusline1.toLowerCase())
    }
  }
})

test('the bar geometry is the demo\'s 3 × 22px pill', () => {
  assert.equal(TURN_RAIL_BAR_HEIGHT, 3)
  assert.equal(TURN_RAIL_BAR_WIDTH, 22)
  assert.equal(TURN_RAIL_BAR_RADIUS, 999)
  assert.equal(TURN_RAIL_REST_SCALE, 0.64)
  assert.equal(TURN_RAIL_HOVER_SCALE, 0.86)
  assert.equal(TURN_RAIL_UNLOADED_SCALE, 0.44)
  assert.equal(TURN_RAIL_UNLOADED_OPACITY, 0.6)
  assert.equal(TURN_RAIL_TRANSITION_MS, 240)
  assert.equal(TURN_RAIL_EASE, 'cubic-bezier(.22, 1, .36, 1)')
  assert.equal(TURN_RAIL_BUSY_MS, 1700)
  assert.equal(TURN_RAIL_BUSY_OPACITY, 0.5)
  assert.equal(TURN_RAIL_BUSY_EASE, 'cubic-bezier(.37, 0, .63, 1)')
})

test('the anchors are DSH contracts, not CSS-module hashes', () => {
  assert.equal(TURN_RAIL_ROOT, '[data-conversation-scroll] nav')
  assert.equal(TURN_RAIL_MARK, '[data-conversation-scroll] nav button[data-index]')
  assert.equal(TURN_RAIL_MARK_ACTIVE, `${TURN_RAIL_MARK}[aria-current="true"]`)
  assert.equal(TURN_RAIL_MARK_HOVER, `${TURN_RAIL_MARK}:hover`)
  assert.equal(TURN_RAIL_MARK_FOCUS, `${TURN_RAIL_MARK}:focus-visible`)
  assert.equal(TURN_RAIL_MARK_BUSY, `${TURN_RAIL_MARK}[class*="markBusy"]`)
  assert.equal(TURN_RAIL_MARK_UNLOADED, `${TURN_RAIL_MARK}[class*="markUnloaded"]`)
  assert.ok(!TURN_RAIL_ROOT.includes('SNx2jG'), 'must not depend on the hashed module prefix')
})

test('the sheet emits six rules per variant, then the keyframes and one reduce block each', () => {
  const rules = styleRules(turnRailStyles())
  assert.equal(TURN_RAIL_RULES_PER_VARIANT, 6)
  assert.equal(TURN_RAIL_REDUCED_MOTION_PER_VARIANT, 1)
  assert.equal(
    rules.length,
    SCHEMES.length * STRENGTHS.length * (TURN_RAIL_RULES_PER_VARIANT + TURN_RAIL_REDUCED_MOTION_PER_VARIANT) + 1,
    'six rules + one reduce block per variant, plus the keyframes'
  )
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const base = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK}::before {`))
      assert.ok(base, `missing base rule for ${variant}`)
      assert.ok(base.includes('width: 22px;'), `${variant}: width`)
      assert.ok(base.includes('height: 3px;'), `${variant}: height`)
      assert.ok(base.includes('border-radius: 999px;'), `${variant}: radius`)
      assert.ok(base.includes('scaleX(0.64)'), `${variant}: resting scale`)
      assert.ok(base.includes('transition: transform 240ms cubic-bezier(.22, 1, .36, 1)'), `${variant}: transition`)

      const unloaded = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_UNLOADED}::before {`))
      assert.ok(unloaded, `missing unloaded rule for ${variant}`)
      assert.ok(unloaded.includes('opacity: 0.6;'), `${variant}: unloaded opacity`)
      assert.ok(unloaded.includes('scaleX(0.44)'), `${variant}: unloaded scale`)

      const hover = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_HOVER}::before {`))
      assert.ok(hover, `missing hover rule for ${variant}`)
      assert.ok(hover.includes(`background: ${EXPECTED[variant].hover};`), `${variant}: hover colour`)
      assert.ok(hover.includes('scaleX(0.86)'), `${variant}: hover scale`)

      const focus = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_FOCUS}::before {`))
      assert.ok(focus, `missing focus rule for ${variant}`)
      assert.ok(focus.includes('scaleX(1)'), `${variant}: focus must restore the full bar`)

      const active = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_ACTIVE}::before {`))
      assert.ok(active, `missing active rule for ${variant}`)
      assert.ok(active.includes(`background: ${EXPECTED[variant].active};`), `${variant}: active colour`)
      assert.ok(active.includes('scaleX(1)'), `${variant}: active full length`)

      const busy = rules.find((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_BUSY}::before {`))
      assert.ok(busy, `missing busy rule for ${variant}`)
      assert.ok(busy.includes(`animation: ${TURN_RAIL_BUSY_KEYFRAMES} 1700ms`), `${variant}: busy animation`)
    }
  }
})

test('the current-turn rule follows the hover rule so a hovered current turn stays green', () => {
  const rules = styleRules(turnRailStyles())
  const scope = scopeOf('light', 'medium')
  const hoverIndex = rules.findIndex((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_HOVER}::before {`))
  const focusIndex = rules.findIndex((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_FOCUS}::before {`))
  const activeIndex = rules.findIndex((rule) => rule.startsWith(`${scope} ${TURN_RAIL_MARK_ACTIVE}::before {`))
  assert.ok(hoverIndex < focusIndex && focusIndex < activeIndex, 'cascade order must be hover → focus → active')
})

test('the breathing keyframes are emitted once, and every variant cancels its own motion', () => {
  const css = turnRailStyles()
  assert.ok(css.includes(`@keyframes ${TURN_RAIL_BUSY_KEYFRAMES} {`), 'missing the breathing keyframes')
  assert.ok(css.includes('50% { opacity: 0.5; }'), 'the breath must fade to 0.5, not blink off')
  assert.equal(css.split('@keyframes').length - 1, 1, 'exactly one @keyframes block')

  // The cancel rules have to repeat the variant scope: DSH's own block
  // (`.SNx2jG_mark:before`) and an unscoped `[data-conversation-scroll] …`
  // selector are both LESS specific than the scoped rules they must override, so
  // a global block sits in the sheet without ever winning (2026-11-15 review:
  // the 1.7s breath kept running under `prefers-reduced-motion: reduce`).
  const rules = styleRules(css)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const block = rules.find((rule) => rule.startsWith('@media (prefers-reduced-motion: reduce) {') && rule.includes(scope))
      assert.ok(block, `${variant}: missing a reduce block scoped like the rules it cancels`)
      assert.ok(block.includes(`${scope} ${TURN_RAIL_MARK}::before { transition: none; }`), `${variant}: must cancel the transition`)
      assert.ok(block.includes(`${scope} ${TURN_RAIL_MARK_BUSY}::before { animation: none; }`), `${variant}: must cancel the breath`)
    }
  }
  assert.ok(
    !/@media \(prefers-reduced-motion: reduce\) \{\n {2}\[data-conversation-scroll\]/.test(css),
    'a reduce block without the variant scope can never win the cascade'
  )
})

test('the current turn keeps a visible step on the canvas in every variant', () => {
  const roles = turnRailRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const tokens = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
    const canvas = tokens['--dsw-alias-bg-base'][scheme]
    const ratio = contrastRatio(roles[variant].active, canvas)
    assert.ok(
      ratio >= TURN_RAIL_MIN_ACTIVE_CONTRAST,
      `${variant}: current-turn bar ${ratio.toFixed(2)}:1 < ${TURN_RAIL_MIN_ACTIVE_CONTRAST}`
    )
    if (scheme === 'dark') {
      assert.ok(ratio >= 5, `${variant}: dark current turn must stay well above 5:1`)
    }
  }
})

test('the turn-rail sheet is always-on, un-gated and uses no !important', () => {
  const css = turnRailStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
  assert.ok(css.includes('[data-conversation-scroll]'))
})
