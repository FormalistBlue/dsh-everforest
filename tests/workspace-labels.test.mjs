import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio, hexToRgb, mix, rgbToHex } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import {
  WORKSPACE_ACTIVE_FOLDER,
  WORKSPACE_LABEL,
  WORKSPACE_LABEL_DARK_HOVER_CONTRAST,
  WORKSPACE_LABEL_DARK_RESTING_CONTRAST,
  WORKSPACE_LABEL_FONT_WEIGHT,
  WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST,
  WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST,
  WORKSPACE_LABEL_RULES_PER_VARIANT,
  WORKSPACE_ROW,
  workspaceLabelRoles,
  workspaceLabelStyles
} from '../src/workspace-labels.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned colors of the 2026-11-08 workspace folder names: the palette **text
 * green** `green` verbatim in every variant (dark `#A7C080`, light `#8DA101`).
 * Upstream keeps two greens apart — `green` is the foreground text colour
 * (Function Names / Strings / Search Highlights) while `statusline1` is the
 * lighter `#93B259` *background* — and the user confirmed the text one is the
 * deeper one; in the dark schemes both are `#A7C080`.
 */
const EXPECTED = {
  'light-hard': '#8DA101',
  'light-medium': '#8DA101',
  'light-soft': '#8DA101',
  'dark-hard': '#A7C080',
  'dark-medium': '#A7C080',
  'dark-soft': '#A7C080'
}

/**
 * The resting sidebar fill and the hover overlay of one variant, composited the
 * same way `scripts/check-contrast.mjs` (and the browser) does: the translucent
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
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one green folder-name colour per variant, pinned to the 2026-11-08 values', () => {
  const roles = workspaceLabelRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].toLowerCase(), EXPECTED[variant].toLowerCase(), variant)
    assert.match(roles[variant], /^#[0-9a-f]{6}$/i, `${variant} must be an opaque #RRGGBB`)
  }
})

test('the colours are the palette text green, untouched', () => {
  const roles = workspaceLabelRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(
      roles[variant].toLowerCase(),
      palette.fg.green.toLowerCase(),
      `${variant}: folder names must use the palette text green`
    )
  }
})

test('the folder name keeps four documented floors: resting and hover, per scheme', () => {
  const roles = workspaceLabelRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const { sidebar, hover } = surfacesOf(scheme, strength)
    const color = roles[variant]
    const restingRatio = contrastRatio(color, sidebar)
    const hoverRatio = contrastRatio(color, hover)
    const restingFloor = scheme === 'dark'
      ? WORKSPACE_LABEL_DARK_RESTING_CONTRAST
      : WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST
    const hoverFloor = scheme === 'dark'
      ? WORKSPACE_LABEL_DARK_HOVER_CONTRAST
      : WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST
    assert.ok(
      restingRatio >= restingFloor,
      `${variant}: folder name on the resting sidebar row = ${restingRatio.toFixed(2)} < ${restingFloor}`
    )
    assert.ok(
      hoverRatio >= hoverFloor,
      `${variant}: folder name on the hover overlay = ${hoverRatio.toFixed(2)} < ${hoverFloor}`
    )
    if (scheme === 'dark') {
      // Resting rows stay a real WCAG AA pair (5.00–6.17:1); only the hover
      // overlay carries the documented 4.0 trade-off.
      assert.ok(restingRatio >= 4.5, `${variant}: dark resting row = ${restingRatio.toFixed(2)} < 4.5`)
    } else {
      // The light palette cannot go higher without turning the accent into the
      // grey ink; the user explicitly asked for the reference light green.
      assert.ok(restingRatio < 4.5, `${variant}: light folder name unexpectedly reached 4.5:1 (update the deviation)`)
    }
  }
})

test('the four documented floors are pinned to literals', () => {
  // Pinned as literals (not just imported) so weakening the constant cannot
  // make both the checker and this suite green at the same time.
  assert.equal(WORKSPACE_LABEL_DARK_RESTING_CONTRAST, 4.5)
  assert.equal(WORKSPACE_LABEL_DARK_HOVER_CONTRAST, 4.0)
  assert.equal(WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST, 2.3)
  assert.equal(WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST, 2.1)
})

test('the sheet emits two rules per variant: the bold name and the active folder glyph', () => {
  const css = workspaceLabelStyles()
  const rules = styleRules(css)
  assert.equal(WORKSPACE_LABEL_RULES_PER_VARIANT, 2)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * WORKSPACE_LABEL_RULES_PER_VARIANT)
  assert.equal(WORKSPACE_ROW, '[role="treeitem"][data-row-key^="workspace:"]')
  assert.equal(WORKSPACE_LABEL, `${WORKSPACE_ROW} [class*="projectText"]`)
  assert.equal(WORKSPACE_ACTIVE_FOLDER, `${WORKSPACE_ROW} [class*="folderActive"]`)
  assert.equal(WORKSPACE_LABEL_FONT_WEIGHT, 600)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const nameRule = rules.find((entry) => entry.startsWith(`${scope} ${WORKSPACE_LABEL} {`))
      assert.ok(nameRule, `missing name rule for ${variant}`)
      assert.ok(nameRule.includes(`color: ${EXPECTED[variant]}`), `${variant}: wrong name colour`)
      assert.ok(nameRule.includes('font-weight: 600'), `${variant}: folder name is not semibold`)
      const folderRule = rules.find((entry) => entry.startsWith(`${scope} ${WORKSPACE_ACTIVE_FOLDER} {`))
      assert.ok(folderRule, `missing active-folder rule for ${variant}`)
      assert.ok(folderRule.includes(`color: ${EXPECTED[variant]}`), `${variant}: active glyph must reuse the text green`)
      assert.ok(!folderRule.includes('font-weight'), `${variant}: the glyph rule must not change weight`)
    }
  }
})

test('the active folder glyph is the same green as the bold name, not the lighter accent', () => {
  // DSH's own `.folderActive` paints `statusline1` (light `#93B259`); the
  // 2026-11-13 request re-inks that glyph with the text green so the whole row
  // reads as one green. In the dark schemes both roles are the same hex.
  const roles = workspaceLabelRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(roles[variant].toLowerCase(), palette.fg.green.toLowerCase(), variant)
    if (scheme === 'light') {
      assert.notEqual(palette.fg.green.toLowerCase(), palette.fg.statusline1.toLowerCase())
    } else {
      assert.equal(palette.fg.green.toLowerCase(), palette.fg.statusline1.toLowerCase())
    }
  }
})

test('the workspace-label sheet is always-on, un-gated and uses no !important', () => {
  const css = workspaceLabelStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
})
