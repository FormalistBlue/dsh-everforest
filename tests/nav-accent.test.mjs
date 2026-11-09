import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio, hexToRgb, mix } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import {
  NAV_ACCENT_RULES_PER_VARIANT,
  NAV_ROWS,
  SETTINGS_NAV_ROW,
  SETTINGS_PANEL_ANCHOR,
  SIDEBAR_PANEL_ROW,
  navAccentRoles,
  navAccentStyles
} from '../src/nav-accent.js'
import { tokensFor } from '../src/tokens.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned surfaces of the selected navigation rows: the palette interaction
 * accent `statusline1` as the fill (dark `#A7C080`, light `#93B259`) and the
 * scheme canvas `bg0` as the ink — the same pairing the selected session row,
 * the selected dropdown option and the send button use.
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
 * Measured contrast of the accent band against what DSH painted before: the
 * settings panel fill / nav-active token (which currently equal each other) and
 * the sidebar's neutral hover wash (which the panel row's `panelActive` rule
 * reuses). The band must read as a selection instead of a hover.
 */
const EXPECTED_WASH_CONTRAST = {
  'light-hard': 2.04,
  'light-medium': 1.92,
  'light-soft': 1.76,
  'dark-hard': 4.98,
  'dark-medium': 4.47,
  'dark-soft': 4.01
}
const WASH_CONTRAST_FLOOR = { light: 1.7, dark: 4.0 }

/** The variant's own palette. */
function paletteOf(variant) {
  const [scheme, strength] = variant.split('-')
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
}

/** The token layer of one variant. */
function tokensOf(variant) {
  const [scheme, strength] = variant.split('-')
  return tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
}

/** The scope of one variant's rules. */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** Split the sheet into its rules. */
const styleRules = (css) => css.split('\n\n').filter(Boolean)

/** Parse one rule into `{ selectors, body }`. */
function parseRule(rule) {
  const index = rule.indexOf('{')
  return {
    selectors: rule.slice(0, index).trim().split(',').map((entry) => entry.trim()),
    body: rule.slice(index + 1, rule.lastIndexOf('}')).trim()
  }
}

/** Flatten a translucent colour over an opaque surface (CSS alpha compositing). */
function flatten(overlay, underlay) {
  const { r, g, b, a } = hexToRgb(overlay)
  const opaque = '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')
  return mix(underlay, opaque, a)
}

test('one solid accent band per variant: fill + canvas ink', () => {
  const roles = navAccentRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].fill.toLowerCase(), EXPECTED[variant].fill, `${variant}.fill`)
    assert.equal(roles[variant].ink.toLowerCase(), EXPECTED[variant].ink, `${variant}.ink`)
    assert.match(roles[variant].fill, /^#[0-9a-f]{6}$/i, `${variant}.fill must be an opaque #RRGGBB`)
    assert.match(roles[variant].ink, /^#[0-9a-f]{6}$/i, `${variant}.ink must be an opaque #RRGGBB`)
  }
})

test('the surfaces are palette values verbatim, not a derived tint', () => {
  const roles = navAccentRoles()
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
  const roles = navAccentRoles()
  for (const variant of VARIANT_NAMES) {
    const ratio = contrastRatio(roles[variant].ink, roles[variant].fill)
    assert.equal(Number(ratio.toFixed(2)), EXPECTED_INK_CONTRAST[variant], `${variant}: ink contrast drifted`)
    if (variant.startsWith('dark')) {
      assert.ok(ratio >= 4.5, `${variant}: canvas ink on the accent fill = ${ratio.toFixed(2)} < 4.5`)
    } else {
      // The reference tab itself pairs cream ink with `statusline1`: 2.00–2.32:1
      // is the palette's ceiling (no light ink is lighter). The deviation is the
      // same one recorded for the selected session row in contrast.md §2g.
      assert.ok(ratio >= 1.95, `${variant}: accent ink pair fell below the documented 1.95 floor`)
      assert.ok(ratio < 4.5, `${variant}: light pair unexpectedly reached 4.5:1 (update the documented deviation)`)
    }
  }
})

test('the settings band is visibly distinct from the panel and the nav-active token', () => {
  const roles = navAccentRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme] = variant.split('-')
    const tokens = tokensOf(variant)
    const panel = tokens['--dsw-alias-bg-layer-2'][scheme]
    const navToken = tokens['--dsw-specific-sidebar-nav-item-active'][scheme]
    // Root cause, pinned: the nav-active token resolves to the panel fill, so
    // DSH's own rule paints the active settings cell the panel colour. This
    // sheet overrides that rule; the token itself is left alone.
    assert.equal(navToken.toLowerCase(), panel.toLowerCase(), `${variant}: nav-active token no longer equals the panel fill — revisit the workaround`)
    for (const [label, under] of [['panel', panel], ['nav-active token', navToken]]) {
      const ratio = contrastRatio(roles[variant].fill, under)
      assert.ok(ratio >= 1.9, `${variant}: accent band vs ${label} = ${ratio.toFixed(2)} < 1.9`)
    }
  }
})

test('the sidebar band replaces the neutral hover wash, not blends into it', () => {
  const roles = navAccentRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme] = variant.split('-')
    const tokens = tokensOf(variant)
    const sidebar = tokens['--dsw-specific-sidebar-fill'][scheme]
    // ui-sidebar's `.panelRow.panelActive` is `interactive-bg-hover`, i.e. the
    // selected row currently looks exactly like a hovered one.
    const wash = flatten(tokens['--dsw-alias-interactive-bg-hover'][scheme], sidebar)
    const ratio = contrastRatio(roles[variant].fill, wash)
    assert.equal(Number(ratio.toFixed(2)), EXPECTED_WASH_CONTRAST[variant], `${variant}: band-vs-wash contrast drifted`)
    assert.ok(
      ratio >= WASH_CONTRAST_FLOOR[scheme],
      `${variant}: accent band vs the neutral wash = ${ratio.toFixed(2)} < ${WASH_CONTRAST_FLOOR[scheme]}`
    )
    const sidebarRatio = contrastRatio(roles[variant].fill, sidebar)
    assert.ok(sidebarRatio >= 1.9, `${variant}: accent band vs the sidebar = ${sidebarRatio.toFixed(2)} < 1.9`)
  }
})

test('the row anchors are DSH contracts, not CSS-module hashes', () => {
  assert.equal(SETTINGS_PANEL_ANCHOR, '[data-shortcut-modal="settings"]')
  assert.equal(SETTINGS_NAV_ROW, '[data-shortcut-modal="settings"] nav button[aria-current="true"]')
  assert.equal(SIDEBAR_PANEL_ROW, '[data-slot="sidebar"] nav button[aria-current="page"]')
  assert.deepEqual(NAV_ROWS, [SETTINGS_NAV_ROW, SIDEBAR_PANEL_ROW])
  for (const row of NAV_ROWS) {
    assert.ok(!row.includes('.'), `${row}: the row anchor must not depend on a class name`)
    assert.ok(!/AnXs9G|wtg9ga/.test(row), `${row}: the CSS-module class must not be used as an anchor`)
  }
  // The two `aria-current` values are DSH's own: "true" on the settings cell,
  // "page" on the sidebar panel row. They must stay apart.
  assert.ok(SETTINGS_NAV_ROW.includes('aria-current="true"'))
  assert.ok(SIDEBAR_PANEL_ROW.includes('aria-current="page"'))
})

test('every variant emits the band rule and the focus-ring rule for both rows', () => {
  const rules = styleRules(navAccentStyles())
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * NAV_ACCENT_RULES_PER_VARIANT)
  assert.equal(NAV_ACCENT_RULES_PER_VARIANT, 2)
  const roles = navAccentRoles()
  const css = navAccentStyles()
  assert.ok(!css.includes('!important'), 'the sheet must not use !important')
  assert.ok(!css.includes('label-primary'), 'the ink must be written explicitly, not inherited from label-primary')
  assert.ok(!/AnXs9G|wtg9ga/.test(css), 'the sheet must not depend on CSS-module hashes')
  assert.ok(!css.includes(':hover'), 'the selected row keeps the accent band while hovered')
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const expectedRows = NAV_ROWS.map((row) => `${scope} ${row}`)
      const expectedFocus = NAV_ROWS.map((row) => `${scope} ${row}:focus-visible`)
      const [bandRule, focusRule] = rules.filter((rule) => rule.includes(`${scope} `))
      assert.ok(bandRule && focusRule, `${variant}: expected exactly the band and focus rules for this scope`)

      const band = parseRule(bandRule)
      assert.deepEqual(band.selectors, expectedRows, `${variant}: the band must cover exactly the two selected rows`)
      assert.ok(band.body.includes(`background-color: ${roles[variant].fill};`), `${variant}: the rule must paint the accent fill`)
      assert.ok(band.body.includes(`color: ${roles[variant].ink};`), `${variant}: the rule must paint the canvas ink`)

      const focus = parseRule(focusRule)
      assert.deepEqual(focus.selectors, expectedFocus, `${variant}: the focus rule must cover exactly the two selected rows`)
      assert.ok(focus.body.includes(`outline-color: ${roles[variant].ink};`), `${variant}: the focus ring must get the ink`)
    }
  }
})

test('the sheet only targets the two selected navigation rows', () => {
  const css = navAccentStyles()
  for (const row of NAV_ROWS) {
    // One band rule + one focus rule per variant = two occurrences.
    assert.equal(css.split(row).length - 1, 2 * SCHEMES.length * STRENGTHS.length, `${row}: occurrence count drifted`)
  }
  assert.ok(!css.includes(':hover'), 'the sheet must not restyle hover')
  assert.ok(!css.includes('[aria-expanded'), 'the More launcher is not a selected row')
})
