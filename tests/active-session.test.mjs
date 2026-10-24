import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS, colorModeRoles } from '../src/color-mode.js'
import { contrastRatio, labLightness, mix } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  ACTIVE_SESSION_INK_CONTRAST,
  ACTIVE_SESSION_ROW,
  ACTIVE_SESSION_SEPARATION,
  activeSessionRoles,
  activeSessionStyles
} from '../src/active-session.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/** Pinned fills of the 2026-10-24 active-session surface. */
const EXPECTED = {
  'light-hard': '#dcece9',
  'light-medium': '#ddeae6',
  'light-soft': '#e6e8db',
  'dark-hard': '#384B55',
  'dark-medium': '#3A515D',
  'dark-soft': '#3f5764'
}

/**
 * The variant's own token/role environment.
 * @param {string} variant - `${scheme}-${strength}`
 */
function environmentOf(variant) {
  const [scheme, strength] = variant.split('-')
  const state = { ...DEFAULT_STATE, [scheme]: strength }
  const tokens = tokensFor(state)
  return {
    scheme,
    strength,
    palette: resolvePalette(state)[scheme],
    ink: tokens['--dsw-alias-label-primary'][scheme],
    sidebar: tokens['--dsw-specific-sidebar-fill'][scheme]
  }
}

/** The selector of one variant's active-row rule. */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/** Split the sheet into its rules. */
const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one active-row fill per variant, pinned to the 2026-10-24 palette values', () => {
  const roles = activeSessionRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].fill.toLowerCase(), EXPECTED[variant].toLowerCase(), variant)
    assert.match(roles[variant].fill, /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the active row keeps label-primary readable (4.5:1 text gate)', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES) {
    const { ink } = environmentOf(variant)
    const ratio = contrastRatio(ink, roles[variant].fill)
    assert.ok(
      ratio >= ACTIVE_SESSION_INK_CONTRAST,
      `${variant}: label-primary on the active row = ${ratio.toFixed(2)} < ${ACTIVE_SESSION_INK_CONTRAST}`
    )
  }
})

test('the fill starts on the palette bg_blue and only moves toward bg0 / the blue accent', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES) {
    const { palette } = environmentOf(variant)
    const fill = roles[variant].fill.toLowerCase()
    const endpoints = [palette.ramp.bgBlue, palette.ramp.bg0, palette.fg.blue].map((hex) => hex.toLowerCase())
    if (fill === endpoints[0]) continue
    // The text guard pulls toward bg0, the visibility push toward fg.blue, so the
    // result has to stay inside the triangle those two moves span.
    const channels = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
    const fillChannels = channels(fill)
    for (let i = 0; i < 3; i += 1) {
      const values = endpoints.map((hex) => channels(hex)[i])
      const low = Math.min(...values) - 1
      const high = Math.max(...values) + 1
      assert.ok(
        fillChannels[i] >= low && fillChannels[i] <= high,
        `${variant}: active fill ${roles[variant].fill} left the bg_blue → bg0 / fg.blue line (channel ${i})`
      )
    }
  }
})

test('the fill is pushed as far toward the accent as the text gate allows', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES) {
    const { ink, sidebar, palette } = environmentOf(variant)
    const fill = roles[variant].fill
    const distance = (color) => Math.abs(labLightness(color) - labLightness(sidebar))
    if (distance(fill) >= ACTIVE_SESSION_SEPARATION) continue
    // Not at the separation target: the very next accent step must break the
    // 4.5:1 ink gate, i.e. the fill already sits on the legibility ceiling.
    const next = mix(fill, palette.fg.blue, 0.01)
    assert.ok(
      contrastRatio(ink, next) < ACTIVE_SESSION_INK_CONTRAST,
      `${variant}: the fill could still move toward the accent without hurting legibility (${contrastRatio(ink, next).toFixed(2)})`
    )
  }
})

test('dark fills keep the blue direction, away from the red / green status rows', () => {
  const roles = activeSessionRoles()
  for (const variant of VARIANT_NAMES.filter((name) => name.startsWith('dark'))) {
    const { r, g, b } = toChannels(roles[variant].fill)
    assert.ok(b - r >= 20, `${variant}: active fill must lean blue (r=${r}, b=${b})`)
    assert.ok(b > g && g > r, `${variant}: active fill channels must be blue > green > red (${roles[variant].fill})`)
  }
})

test('the active fill never collides with the color-mode status fills', () => {
  const roles = activeSessionRoles()
  const statusRoles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const fill = roles[variant].fill.toLowerCase()
    for (const role of ['rowWarn', 'rowWarnHover', 'rowDone', 'rowDoneHover']) {
      assert.notEqual(fill, statusRoles[variant][role].toLowerCase(), `${variant}: active fill must differ from ${role}`)
    }
  }
})

/** Hex → { r, g, b } for the direction assertions. */
function toChannels(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  }
}

test('the stylesheet emits one always-on rule per variant for the stable row anchor', () => {
  const css = activeSessionStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length, 'one rule per scheme × strength')
  assert.equal(ACTIVE_SESSION_ROW, '[role="treeitem"][data-row-key^="session:"][aria-selected="true"]')
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const rule = rules.find((entry) => entry.startsWith(scopeOf(scheme, strength)))
      assert.ok(rule, `missing rule for ${variant}`)
      assert.ok(rule.includes(ACTIVE_SESSION_ROW), `${variant}: rule must target the selected session row`)
      assert.ok(rule.includes(`background-color: ${EXPECTED[variant]}`) || rule.includes(`background-color: ${EXPECTED[variant].toUpperCase()}`), `${variant}: wrong fill`)
    }
  }
})

test('the active-row sheet is independent of the color mode and uses no !important', () => {
  const css = activeSessionStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
