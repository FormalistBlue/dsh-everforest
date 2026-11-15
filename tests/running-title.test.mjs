import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio, hexToRgb, labLightness, mix, rgbToHex } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  RUNNING_SESSION_ROW,
  RUNNING_SESSION_TITLE,
  RUNNING_TITLE_CYCLE_MS,
  RUNNING_TITLE_DARK_BAND_CONTRAST,
  RUNNING_TITLE_DARK_LIFT,
  RUNNING_TITLE_DARK_RESTING_CONTRAST,
  RUNNING_TITLE_KEYFRAMES,
  RUNNING_TITLE_LIGHT_BAND_CONTRAST,
  RUNNING_TITLE_LIGHT_DEEPEN,
  RUNNING_TITLE_LIGHT_RESTING_CONTRAST,
  RUNNING_TITLE_RULES_PER_VARIANT,
  RUNNING_TITLE_TILE_PERCENT,
  RUNNING_TITLE_TRAVEL_PERCENT,
  runningTitleRoles,
  runningTitleStyles
} from '../src/running-title.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned effect colours of the 2026-11-15 request: the resting title is the
 * palette text green `green` (dark `#A7C080`, light `#8DA101`) — the same role
 * the workspace folder names already use — and the travelling band moves away
 * from the canvas: light deepens toward black, dark lifts toward white.
 */
const EXPECTED = {
  'light-hard': { rest: '#8da101', band: '#667401' },
  'light-medium': { rest: '#8da101', band: '#667401' },
  'light-soft': { rest: '#8da101', band: '#667401' },
  'dark-hard': { rest: '#a7c080', band: '#d3e0c0' },
  'dark-medium': { rest: '#a7c080', band: '#d3e0c0' },
  'dark-soft': { rest: '#a7c080', band: '#d3e0c0' }
}

/**
 * The resting sidebar fill and the hover overlay of one variant, composited the
 * way the browser and `scripts/check-contrast.mjs` do: the translucent
 * `interactive-bg-hover` token flattened over the sidebar surface.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ sidebar: string, hover: string }}
 */
function surfacesOf (scheme, strength) {
  const tokens = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
  const sidebar = tokens['--dsw-specific-sidebar-fill'][scheme]
  const { r, g, b, a } = hexToRgb(tokens['--dsw-alias-interactive-bg-hover'][scheme])
  return { sidebar, hover: mix(sidebar, rgbToHex({ r, g, b, a: 1 }), a) }
}

/** The scope of one variant's rule. */
function scopeOf (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one colour pair per variant, pinned to the 2026-11-15 values', () => {
  const roles = runningTitleRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].rest.toLowerCase(), EXPECTED[variant].rest, `${variant} rest`)
    assert.equal(roles[variant].band.toLowerCase(), EXPECTED[variant].band, `${variant} band`)
    assert.match(roles[variant].rest, /^#[0-9a-f]{6}$/i, `${variant} rest must be an opaque #RRGGBB`)
    assert.match(roles[variant].band, /^#[0-9a-f]{6}$/i, `${variant} band must be an opaque #RRGGBB`)
  }
})

test('the resting title is the palette text green, untouched', () => {
  const roles = runningTitleRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(
      roles[variant].rest.toLowerCase(),
      palette.fg.green.toLowerCase(),
      `${variant}: the resting title must use the palette text green`
    )
  }
})

test('the band is the documented blend of the resting green', () => {
  const roles = runningTitleRoles()
  assert.equal(RUNNING_TITLE_LIGHT_DEEPEN, 0.28)
  assert.equal(RUNNING_TITLE_DARK_LIFT, 0.5)
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    const expected = scheme === 'light'
      ? mix(palette.fg.green, '#000000', RUNNING_TITLE_LIGHT_DEEPEN)
      : mix(palette.fg.green, '#ffffff', RUNNING_TITLE_DARK_LIFT)
    assert.equal(roles[variant].band.toLowerCase(), expected.toLowerCase(), variant)
  }
})

test('the band always moves away from the canvas, never toward it', () => {
  // Light: the band is darker than the resting green (a shadow pass — the round
  // one white glare left the text at 1.29–1.46:1 and the user rejected it).
  // Dark: the band is lighter than the resting green (a glint).
  const roles = runningTitleRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme] = variant.split('-')
    const { rest, band } = roles[variant]
    if (scheme === 'light') {
      assert.ok(
        labLightness(band) < labLightness(rest) - 8,
        `${variant}: the light band must be a clearly darker shadow (${band} vs ${rest})`
      )
      assert.ok(luminance(band) < luminance(rest), `${variant}: light band must darken`)
    } else {
      assert.ok(
        labLightness(band) > labLightness(rest) + 5,
        `${variant}: the dark band must be a clearly brighter glint (${band} vs ${rest})`
      )
      assert.ok(luminance(band) > luminance(rest), `${variant}: dark band must brighten`)
    }
  }
})

/** WCAG relative luminance proxy (the band contrast direction only needs ordering). */
function luminance (color) {
  const { r, g, b } = hexToRgb(color)
  const linear = (value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

test('the effect only ever raises contrast above the resting title', () => {
  const roles = runningTitleRoles()
  assert.deepEqual(
    [
      RUNNING_TITLE_LIGHT_RESTING_CONTRAST,
      RUNNING_TITLE_LIGHT_BAND_CONTRAST,
      RUNNING_TITLE_DARK_RESTING_CONTRAST,
      RUNNING_TITLE_DARK_BAND_CONTRAST
    ],
    [2.3, 4.1, 4.5, 7.0]
  )
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const { sidebar, hover } = surfacesOf(scheme, strength)
    const { rest, band } = roles[variant]
    const restingFloor = scheme === 'dark'
      ? RUNNING_TITLE_DARK_RESTING_CONTRAST
      : RUNNING_TITLE_LIGHT_RESTING_CONTRAST
    const bandFloor = scheme === 'dark'
      ? RUNNING_TITLE_DARK_BAND_CONTRAST
      : RUNNING_TITLE_LIGHT_BAND_CONTRAST
    const resting = contrastRatio(rest, sidebar)
    const peak = contrastRatio(band, sidebar)
    assert.ok(resting >= restingFloor, `${variant}: resting title = ${resting.toFixed(2)} < ${restingFloor}`)
    assert.ok(peak >= bandFloor, `${variant}: band peak = ${peak.toFixed(2)} < ${bandFloor}`)
    assert.ok(
      peak >= resting,
      `${variant}: the band (${peak.toFixed(2)}) must not drop below the resting title (${resting.toFixed(2)})`
    )
    if (scheme === 'dark') {
      // The resting title is the folder-name green: a real WCAG AA pair.
      assert.ok(resting >= 4.5, `${variant}: dark resting title = ${resting.toFixed(2)} < 4.5`)
    }
    // Hover flattens the 50% `bg4` wash over the sidebar; the band must stay
    // above the resting title there too (the row can be hovered while it runs).
    assert.ok(
      contrastRatio(band, hover) >= Math.min(contrastRatio(band, sidebar) - 0.6, 3.4),
      `${variant}: band on the hover overlay collapses`
    )
  }
})

test('the sheet emits three rules per variant plus one shared keyframes block', () => {
  const css = runningTitleStyles()
  const rules = styleRules(css)
  assert.equal(RUNNING_TITLE_RULES_PER_VARIANT, 3)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * RUNNING_TITLE_RULES_PER_VARIANT + 1)
  assert.equal(rules[rules.length - 1], keyframesBlock())
  assert.equal(RUNNING_SESSION_ROW,
    '[role="treeitem"][data-row-key^="session:"]:has([data-state="ongoing"]):not([aria-selected="true"])')
  assert.equal(RUNNING_SESSION_TITLE, `${RUNNING_SESSION_ROW} > span[class*="title"]`)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const selector = `${scope} ${RUNNING_SESSION_TITLE}`
      const { rest, band } = runningTitleRoles()[variant]
      const fallback = rules.find((entry) => entry.startsWith(`${selector} {`))
      assert.ok(fallback, `missing fallback rule for ${variant}`)
      assert.ok(fallback.includes(`color: ${rest}`), `${variant}: fallback must be the resting green`)
      assert.ok(!fallback.includes('transparent'), `${variant}: the fallback must stay readable`)
      const glare = rules.find((entry) => entry.startsWith('@supports (') && entry.includes(selector))
      assert.ok(glare, `missing glare rule for ${variant}`)
      assert.ok(glare.includes('color: transparent'), `${variant}: the glare paints through the gradient`)
      assert.ok(glare.includes(`background-image: linear-gradient(100deg, ${rest} 0%`),
        `${variant}: gradient must start from the resting green`)
      assert.ok(glare.includes(band), `${variant}: the gradient must contain the band colour`)
      assert.ok(glare.includes(`background-size: ${RUNNING_TITLE_TILE_PERCENT}% 100%`),
        `${variant}: the tile must be wider than the box`)
      assert.ok(glare.includes('-webkit-background-clip: text'), `${variant}: missing the prefixed clip`)
      assert.ok(glare.includes('background-clip: text'), `${variant}: missing the unprefixed clip`)
      assert.ok(glare.includes(`animation: ${RUNNING_TITLE_KEYFRAMES} ${RUNNING_TITLE_CYCLE_MS}ms linear infinite`),
        `${variant}: animation declaration drifted`)
      const still = rules.find((entry) => entry.startsWith('@media (prefers-reduced-motion: reduce)') &&
        entry.includes(selector))
      assert.ok(still, `missing reduced-motion rule for ${variant}`)
      assert.ok(still.includes(`color: ${rest}`), `${variant}: reduced motion must restore the green`)
      assert.ok(still.includes('background-image: none'), `${variant}: reduced motion must drop the gradient`)
      assert.ok(still.includes('animation: none'), `${variant}: reduced motion must stop the animation`)
    }
  }
})

/** The exact keyframes block the sheet must carry. */
function keyframesBlock () {
  return `@keyframes ${RUNNING_TITLE_KEYFRAMES} {
  0% { background-position: 100% 50%; }
  ${RUNNING_TITLE_TRAVEL_PERCENT}% { background-position: 0% 50%; }
  100% { background-position: 0% 50%; }
}`
}

test('the timing is the agreed 2.4s cycle with a 45% sweep and a hold', () => {
  assert.equal(RUNNING_TITLE_CYCLE_MS, 2400)
  assert.equal(RUNNING_TITLE_TRAVEL_PERCENT, 45)
  assert.equal(RUNNING_TITLE_TILE_PERCENT, 260)
  // One sweep spends ~1.08s travelling and ~1.32s parked off-box.
  assert.ok(RUNNING_TITLE_CYCLE_MS * RUNNING_TITLE_TRAVEL_PERCENT / 100 <= 1200)
  const block = styleRules(runningTitleStyles()).at(-1)
  assert.equal((block.match(/background-position: 0% 50%/g) ?? []).length, 2)
})

test('only running, non-selected session rows are targeted — never a layout property', () => {
  const css = runningTitleStyles()
  assert.ok(css.includes(':has([data-state="ongoing"])'))
  assert.ok(css.includes(':not([aria-selected="true"])'))
  assert.ok(!css.includes('wnFoaW'), 'the anchor must not use the hashed CSS-module prefix')
  // The effect must not disturb the row: no box / text metric is touched.
  for (const property of ['font-size', 'font-weight', 'line-height', 'margin', 'padding', 'display', 'width', 'height']) {
    assert.ok(!new RegExp(`(^|[\\s;{])${property}:`, 'm').test(css), `the sheet must not set ${property}`)
  }
  // A text-shadow glow would be clipped by the title's 20px `overflow: hidden`
  // box (2026-11-15 finding), so the glare lives inside the glyphs instead.
  assert.ok(!css.includes('text-shadow'))
  assert.ok(!css.includes('!important'))
})

test('the sheet is always-on and un-gated by the color mode', () => {
  const css = runningTitleStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
