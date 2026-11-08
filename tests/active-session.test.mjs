import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS, colorModeRoles } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import {
  ACTIVE_SESSION_RULES_PER_VARIANT,
  ACTIVE_SESSION_ROW,
  activeSessionRoles,
  activeSessionStyles
} from '../src/active-session.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned surfaces of the 2026-11-08 third-pass solid selection band: the palette
 * interaction accent `statusline1` as the fill (dark `#A7C080` = `green`, light
 * `#93B259`), the scheme canvas `bg0` as the ink.
 */
const EXPECTED = {
  'light-hard': { fill: '#93b259', ink: '#fffbef' },
  'light-medium': { fill: '#93b259', ink: '#fdf6e3' },
  'light-soft': { fill: '#93b259', ink: '#f3ead3' },
  'dark-hard': { fill: '#a7c080', ink: '#272e33' },
  'dark-medium': { fill: '#a7c080', ink: '#2d353b' },
  'dark-soft': { fill: '#a7c080', ink: '#333c43' }
}

/** Measured ink contrast of the accent + canvas pair (recorded in contrast.md §2g). */
const EXPECTED_INK_CONTRAST = {
  'light-hard': 2.32,
  'light-medium': 2.22,
  'light-soft': 2.0,
  'dark-hard': 6.88,
  'dark-medium': 6.23,
  'dark-soft': 5.62
}

/**
 * The variant's own palette.
 * @param {string} variant - `${scheme}-${strength}`
 */
function paletteOf(variant) {
  const [scheme, strength] = variant.split('-')
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
}

/** The scope of one variant's rules. */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** Split the sheet into its rules. */
const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one solid surface per variant: accent fill + canvas ink', () => {
  const roles = activeSessionRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].fill.toLowerCase(), EXPECTED[variant].fill, `${variant}.fill`)
    assert.equal(roles[variant].ink.toLowerCase(), EXPECTED[variant].ink, `${variant}.ink`)
    assert.match(roles[variant].fill, /^#[0-9a-f]{6}$/i, `${variant}.fill must be an opaque #RRGGBB`)
    assert.match(roles[variant].ink, /^#[0-9a-f]{6}$/i, `${variant}.ink must be an opaque #RRGGBB`)
  }
})

test('the surface is the palette values verbatim, not a derived tint', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES) {
    const palette = paletteOf(variant)
    assert.equal(
      roles[variant].fill.toLowerCase(),
      palette.fg.statusline1.toLowerCase(),
      `${variant}: the fill must be the palette interaction accent (statusline1)`
    )
    assert.equal(
      roles[variant].ink.toLowerCase(),
      palette.ramp.bg0.toLowerCase(),
      `${variant}: the ink must be the scheme canvas bg0`
    )
  }
})

test('dark schemes keep the canvas ink >= 4.5:1; light keeps the documented accent pair', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES) {
    const ratio = contrastRatio(roles[variant].ink, roles[variant].fill)
    assert.equal(Number(ratio.toFixed(2)), EXPECTED_INK_CONTRAST[variant], `${variant}: ink contrast drifted`)
    if (variant.startsWith('dark')) {
      assert.ok(ratio >= 4.5, `${variant}: canvas ink on the accent fill = ${ratio.toFixed(2)} < 4.5`)
    } else {
      // The reference tab itself pairs cream ink with `statusline1`: 2.00–2.32:1
      // is the palette's ceiling (no light ink is lighter). The floor pins the
      // measured pair; the deviation is recorded in contrast.md §2g.
      assert.ok(ratio >= 1.95, `${variant}: accent ink pair fell below the documented 1.95 floor`)
      assert.ok(ratio < 4.5, `${variant}: light pair unexpectedly reached 4.5:1 (update the documented deviation)`)
    }
  }
})

test('the row is selected by the green band alone: no marker bar, no tint', () => {
  const css = activeSessionStyles()
  assert.ok(!css.includes('box-shadow'), 'the 3px marker bar was removed on 2026-11-08')
  assert.ok(!css.includes('color-mix'), 'the fill must be solid, not a mix')
  assert.ok(!css.includes('opacity'), 'the fill must be opaque')
  assert.ok(!css.includes('!important'))
})

test('the selected green band stays clear of the color-mode status rows', () => {
  const roles = activeSessionRoles()
  const statusRoles = colorModeRoles()
  const channels = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  })
  for (const variant of VARIANT_NAMES) {
    const fill = channels(roles[variant].fill)
    assert.ok(fill.g > fill.b, `${variant}: the selection band must stay green`)
    // "Finished, not read" is blue again (§22), the waiting row is amber: neither
    // can be mistaken for the green selection band.
    const done = channels(statusRoles[variant].rowDone)
    const warn = channels(statusRoles[variant].rowWarn)
    // Blue / pale-cyan rows cannot be mistaken for the solid green band: the
    // fills differ by a wide margin on at least one channel.
    const gap = Math.max(Math.abs(done.r - fill.r), Math.abs(done.g - fill.g), Math.abs(done.b - fill.b))
    assert.ok(gap >= 24, `${variant}: rowDone (${statusRoles[variant].rowDone}) is too close to the selection band`)
    assert.ok(warn.r > warn.b, `${variant}: rowWarn must stay amber (${statusRoles[variant].rowWarn})`)
  }
})

test('every variant emits the band rule, the child-ink rule and the button hover wash', () => {
  const css = activeSessionStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * ACTIVE_SESSION_RULES_PER_VARIANT)
  assert.equal(ACTIVE_SESSION_RULES_PER_VARIANT, 3)
  assert.equal(ACTIVE_SESSION_ROW, '[role="treeitem"][data-row-key^="session:"][aria-selected="true"]')
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const row = `${scope} ${ACTIVE_SESSION_ROW}`
      const band = rules.find((rule) => rule.startsWith(`${row} {`))
      assert.ok(band, `${variant}: missing the selection band rule`)
      assert.ok(
        band.includes(`background-color: ${EXPECTED[variant].fill}`) ||
          band.includes(`background-color: ${EXPECTED[variant].fill.toUpperCase()}`),
        `${variant}: wrong fill`
      )
      assert.ok(
        band.includes(`color: ${EXPECTED[variant].ink}`) ||
          band.includes(`color: ${EXPECTED[variant].ink.toUpperCase()}`),
        `${variant}: wrong ink`
      )
      // DSH's own row children (status slot, time, pin, action buttons) carry
      // label-tertiary / label-caption greys that would vanish on the solid
      // band, and the nested cells sit inside wrappers that restate those greys,
      // so the ink is written out explicitly (an `inherit` chain stops at
      // `rowResting`). The trailing time is a nested span inside DSH's
      // `rowResting` cell (0.2.2-rc.1), so it needs its own class hook.
      const inkRule = rules.find((rule) =>
        rule.includes('> span') && rule.toLowerCase().includes(`color: ${EXPECTED[variant].ink}`))
      assert.ok(inkRule, `${variant}: missing the child-ink rule`)
      assert.ok(!inkRule.includes('color: inherit'), `${variant}: the ink must be explicit, not inherited`)
      for (const hook of ['> span', '[class*="time"]', '[class*="pinIndicator"]', '[class*="iconButton"]', 'button', 'svg:not([data-state])', '[data-state="ongoing"]']) {
        assert.ok(inkRule.includes(`${row} ${hook}`), `${variant}: the ${hook} cell must get the ink`)
      }
      // Regression (2026-11-08): the selector list used to re-prefix every entry
      // (`row row [class*="time"]`), which matched nothing — only `> span` was
      // live, so the time / pin / action cells stayed grey on the band.
      const selectors = inkRule.split('{')[0].split(',').map((line) => line.trim()).filter(Boolean)
      assert.equal(selectors.length, 7, `${variant}: unexpected selector count`)
      for (const selector of selectors) {
        assert.ok(selector.startsWith(row), `${variant}: selector lost its scope: ${selector}`)
        assert.ok(!selector.includes(`${scope} ${scope}`), `${variant}: doubled scope in ${selector}`)
        assert.equal(selector.split(ACTIVE_SESSION_ROW).length - 1, 1, `${variant}: row anchor appears twice in ${selector}`)
      }
      // Row action buttons: DSH / third-party ghost buttons use a SOLID surface
      // token on hover (`bg2`), which turns into an opaque slate square on the
      // band and swallows the ink glyph (2026-11-08 user report about the bell
      // action). The wash must be the band ink at 16% with the focus ring on the
      // ink as well.
      const hoverRule = rules.find((rule) => rule.includes('button:hover') && rule.includes(row))
      assert.ok(hoverRule, `${variant}: missing the button hover rule`)
      for (const selector of [`${row} button:hover`, `${row} button:focus-visible`]) {
        assert.ok(hoverRule.includes(selector), `${variant}: ${selector} must be covered`)
      }
      assert.ok(!hoverRule.includes('button-ghost-active-fill'), `${variant}: the solid surface fill must be replaced`)
      const wash = hoverRule.match(/background-color: (#[0-9a-f]{8})/i)
      assert.ok(wash, `${variant}: the hover wash must be a translucent ink colour`)
      assert.equal(wash[1].slice(0, 7).toLowerCase(), EXPECTED[variant].ink, `${variant}: the wash must be derived from the band ink`)
      assert.equal(parseInt(wash[1].slice(7, 9), 16), 41, `${variant}: the wash alpha must stay at 16%`)
      assert.ok(
        hoverRule.toLowerCase().includes(`outline-color: ${EXPECTED[variant].ink}`),
        `${variant}: the focus ring must use the band ink`
      )
    }
  }
})

test('the neutral loading spinner is inked; the semantic state dots keep their hue', () => {
  const css = activeSessionStyles()
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const row = `${scopeOf(scheme, strength)} ${ACTIVE_SESSION_ROW}`
      // ui-primitives' `StateDot(state="ongoing")` is `<svg data-state="ongoing">`
      // painted `label-tertiary` — a grey, so it vanished on the band (2026-11-08
      // user report). It must be in the ink selector list with the band ink.
      assert.ok(css.includes(`${row} [data-state="ongoing"]`), `${scheme}-${strength}: the spinner must get the band ink`)
      // The semantic dots are the state carriers, not chrome: the sheet must not
      // recolour them (color-mode owns their hues).
      for (const state of ['done', 'warning', 'error', 'idle']) {
        assert.ok(!css.includes(`[data-state="${state}"]`), `${scheme}-${strength}: the ${state} dot must keep its semantic hue`)
      }
      assert.ok(!css.includes(`${row} [data-state]`), `${scheme}-${strength}: the ink must not target bare [data-state]`)
    }
  }
})

test('the active-row sheet is independent of the color mode', () => {
  const css = activeSessionStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
