import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { DEFAULT_STATE, FOREGROUNDS, RAMPS, STRENGTHS } from '../src/palette.js'
import { alpha, contrastRatio, isHex, relativeLuminance } from '../src/color.js'
import { SELF_CHECK_TOKENS, TOKEN_COVERAGE, tokensFor, AUXILIARY_TOKEN_NAMES } from '../src/tokens.js'

const inventory = JSON.parse(
  readFileSync(new URL('../docs/reference/token-inventory.json', import.meta.url), 'utf8')
)
const inventoryNames = inventory.tokens.map((token) => token.name).sort()
const inventoryCategories = inventory.tokens.reduce((counts, token) => {
  counts[token.category] = (counts[token.category] ?? 0) + 1
  return counts
}, {})

/** A legal core colour: hex, rgb() or the explicit color-mix form we emit. */
function isLegalColor (value) {
  return (
    isHex(value) ||
    /^rgba?\(\s*\d/i.test(value) ||
    /^color-mix\(in srgb, #[0-9a-f]{3,8} \d+(\.\d+)?%, transparent\)$/i.test(value)
  )
}

test('token inventory on disk matches the docs/design.md §4 counting convention', () => {
  assert.deepEqual(inventory.counts, { static: 77, alias: 107, specific: 11, shiki: 11, total: 206 })
  assert.equal(inventory.tokens.length, 206)
  assert.equal(inventory.generatedBy, 'scripts/extract-theme-tokens.mjs')
  assert.equal(inventory.sheets.length, 8)
  assert.equal(inventoryNames.length, 206)
  assert.equal(new Set(inventoryNames).size, 206)
  for (const category of Object.keys(inventoryCategories)) {
    assert.ok(['static', 'alias', 'specific', 'shiki'].includes(category), category)
  }
  for (const token of inventory.tokens) {
    assert.match(token.name, /^--(?:dsw|shiki)-/)
    assert.ok(typeof token.light === 'string' && token.light.length > 0, token.name)
    if (token.dark !== null) assert.ok(typeof token.dark === 'string' && token.dark.length > 0, token.name)
  }
})

test('tokensFor emits every inventory colour token with light and dark values', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  for (const name of inventoryNames) {
    const pair = overlay[name]
    assert.ok(pair, `missing token ${name}`)
    assert.equal(typeof pair.light, 'string', name)
    assert.equal(typeof pair.dark, 'string', name)
    assert.ok(pair.light.length > 0 && pair.dark.length > 0, name)
    assert.ok(isLegalColor(pair.light), `${name} light: ${pair.light}`)
    assert.ok(isLegalColor(pair.dark), `${name} dark: ${pair.dark}`)
    // Explicit mapping: no colour token relies on var() indirection at runtime.
    assert.ok(!pair.light.includes('var('), `${name} light must be explicit`)
    assert.ok(!pair.dark.includes('var('), `${name} dark must be explicit`)
  }
  assert.ok(Object.keys(overlay).length >= 206)
})

test('TOKEN_COVERAGE is consistent with tokensFor', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.deepEqual([...TOKEN_COVERAGE.covered].sort(), Object.keys(overlay).sort())
  assert.equal(TOKEN_COVERAGE.covered.length, 212) // 206 colour + 6 auxiliary
  const covered = new Set(TOKEN_COVERAGE.covered)
  for (const name of inventoryNames) assert.ok(covered.has(name), name)
  // Auxiliary tokens required by design §4 but outside the 206 inventory.
  assert.deepEqual([...AUXILIARY_TOKEN_NAMES], [
    '--dsw-gradient-onboarding-blue-stops',
    '--dsw-gradient-onboarding-cyan-stops',
    '--dsw-gradient-onboarding-violet-stops',
    '--dsw-linear-gradient-think',
    '--dsw-linear-think-select',
    '--dsw-menu-surface-fill'
  ])
  for (const name of AUXILIARY_TOKEN_NAMES) assert.ok(covered.has(name), name)
  assert.ok(TOKEN_COVERAGE.uncovered.length > 0)
})

test('token name sets are identical across all palette states', () => {
  const reference = Object.keys(tokensFor(DEFAULT_STATE)).sort()
  for (const light of STRENGTHS) {
    for (const dark of STRENGTHS) {
      assert.deepEqual(Object.keys(tokensFor({ light, dark })).sort(), reference)
    }
  }
  // Invalid / missing state falls back to the default pairing without throwing.
  assert.deepEqual(tokensFor(), tokensFor(DEFAULT_STATE))
  assert.deepEqual(tokensFor({ light: 'nope', dark: null }), tokensFor(DEFAULT_STATE))
  assert.deepEqual(tokensFor({ light: 'soft' }), tokensFor({ light: 'soft', dark: DEFAULT_STATE.dark }))
})

test('default pairing exposes the Enchanted backgrounds (light #FFFBEF / dark #333C43)', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.equal(overlay['--dsw-alias-bg-base'].light, '#FFFBEF')
  assert.equal(overlay['--dsw-alias-bg-base'].dark, '#333C43')
  assert.equal(overlay['--dsw-alias-bg-base'].light, RAMPS.light.hard.bg0)
  assert.equal(overlay['--dsw-alias-bg-base'].dark, RAMPS.dark.soft.bg0)
  assert.equal(overlay['--dsw-alias-label-primary'].light, FOREGROUNDS.light.fg)
  assert.equal(overlay['--dsw-alias-label-primary'].dark, FOREGROUNDS.dark.fg)
})

test('shiki tokens are explicit and use the code palette', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  const light = overlay['--dsw-alias-markdown-code-block'].light
  const dark = overlay['--dsw-alias-markdown-code-block'].dark
  assert.equal(overlay['--shiki-background'].light, light)
  assert.equal(overlay['--shiki-background'].dark, dark)
  assert.equal(dark, RAMPS.dark.soft.bgDim)
  assert.equal(overlay['--shiki-foreground'].light, FOREGROUNDS.light.fg)
  assert.equal(overlay['--shiki-foreground'].dark, FOREGROUNDS.dark.fg)
  assert.equal(overlay['--shiki-token-comment'].light, FOREGROUNDS.light.grey1)
  assert.equal(overlay['--shiki-token-keyword'].light, FOREGROUNDS.light.blue)
  assert.equal(overlay['--shiki-token-function'].light, FOREGROUNDS.light.green)
  assert.equal(overlay['--shiki-token-parameter'].light, FOREGROUNDS.light.orange)
  assert.equal(overlay['--shiki-token-string'].light, FOREGROUNDS.light.yellow)
  assert.equal(overlay['--shiki-token-string-expression'].light, FOREGROUNDS.light.yellow)
  assert.equal(overlay['--shiki-token-constant'].light, FOREGROUNDS.light.purple)
  assert.equal(overlay['--shiki-token-punctuation'].light, FOREGROUNDS.light.grey1)
  assert.equal(overlay['--shiki-token-link'].light, FOREGROUNDS.light.headerBlue)
  assert.equal(
    Object.keys(overlay).filter((name) => name.startsWith('--shiki-')).length,
    11
  )
})

test('document selection keeps the 40% transparency semantics', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  const pair = overlay['--dsw-alias-bg-document-selection']
  for (const value of [pair.light, pair.dark]) {
    assert.match(value, /^color-mix\(in srgb, #[0-9a-f]{3,8} 40%, transparent\)$/i)
    assert.ok(value.includes('transparent'))
    assert.ok(value.includes('40%'))
  }
  assert.ok(pair.light.includes(RAMPS.light.hard.bgVisual))
  assert.ok(pair.dark.includes(RAMPS.dark.soft.bgVisual))
})

test('static ramps are interpolated, not mapped step by step', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  const neutralBars = [
    '--dsw-static-neutral-bluish-00',
    '--dsw-static-neutral-bluish-50',
    '--dsw-static-neutral-bluish-100',
    '--dsw-static-neutral-bluish-300',
    '--dsw-static-neutral-bluish-500',
    '--dsw-static-neutral-bluish-700',
    '--dsw-static-neutral-bluish-850',
    '--dsw-static-neutral-bluish-1000'
  ]
  const lightValues = neutralBars.map((name) => overlay[name].light)
  const luminances = lightValues.map((value) => relativeLuminance(value))
  for (let i = 1; i < luminances.length; i++) {
    assert.ok(luminances[i] < luminances[i - 1], `static ramp must get darker: ${neutralBars[i]}`)
  }
  // More distinct steps than the six Everforest backgrounds: not a direct step mapping.
  assert.ok(new Set(lightValues).size >= 8)
  // The blue family maps onto Everforest blue hues, not onto neutral grey.
  const blue500 = overlay['--dsw-static-blue-500'].light
  const channels = [blue500.slice(1, 3), blue500.slice(3, 5), blue500.slice(5, 7)].map((hex) =>
    parseInt(hex, 16)
  )
  assert.ok(Math.max(...channels) - Math.min(...channels) > 30, `blue-500 must stay blue: ${blue500}`)
})

test('translucent static tokens keep their alpha ratios (8-digit hex)', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  const pairs = [
    ['--dsw-static-green-500-a08', alpha(FOREGROUNDS.light.green, 0.08), alpha(FOREGROUNDS.dark.green, 0.08)],
    ['--dsw-static-green-500-a12', alpha(FOREGROUNDS.light.green, 0.12), alpha(FOREGROUNDS.dark.green, 0.12)],
    ['--dsw-static-red-400-a12', alpha(FOREGROUNDS.light.red, 0.12), alpha(FOREGROUNDS.dark.red, 0.12)],
    ['--dsw-static-red-600-a08', alpha(FOREGROUNDS.light.red, 0.08), alpha(FOREGROUNDS.dark.red, 0.08)]
  ]
  for (const [name, light, dark] of pairs) {
    assert.equal(overlay[name].light, light)
    assert.equal(overlay[name].dark, dark)
    assert.equal(overlay[name].light.length, 9) // #rrggbbaa
    assert.equal(overlay[name].dark.length, 9)
  }
})

test('brand mapping: header-aqua with bg0 foreground, header-blue link', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.equal(overlay['--dsw-alias-brand-primary'].light, FOREGROUNDS.light.headerAqua)
  assert.equal(overlay['--dsw-alias-brand-primary'].dark, FOREGROUNDS.dark.headerAqua)
  assert.equal(overlay['--dsw-alias-brand-primary-new-colorprimary-new-color'].light, FOREGROUNDS.light.headerAqua)
  // Brand / primary-button foreground is bg0, never white.
  for (const name of ['--dsw-alias-label-primary-foreground', '--dsw-alias-brand-text']) {
    assert.equal(overlay[name].light, RAMPS.light.hard.bg0)
    assert.equal(overlay[name].dark, RAMPS.dark.soft.bg0)
  }
  assert.equal(overlay['--dsw-alias-link'].light, FOREGROUNDS.light.headerBlue)
  assert.equal(overlay['--dsw-alias-link'].dark, FOREGROUNDS.dark.headerBlue)
})

test('inline code is a background chip, not a foreground accent', () => {
  // DSH applies --dsw-alias-markdown-inline-code as `background-color` on inline
  // code and lets the chip text inherit label-primary. Mapping it to fg.blue made a
  // loud blue block with 1.65:1 (light) / 1.29:1 (dark) text contrast.
  const overlay = tokensFor(DEFAULT_STATE)
  const chip = overlay['--dsw-alias-markdown-inline-code']
  assert.ok(isLegalColor(chip.light) && isLegalColor(chip.dark))
  for (const scheme of ['light', 'dark']) {
    assert.notEqual(chip[scheme], FOREGROUNDS[scheme].blue, `${scheme}: chip must not be the blue accent`)
    assert.notEqual(chip[scheme], RAMPS[scheme][DEFAULT_STATE[scheme]].bg0, `${scheme}: chip must differ from bg0`)
    // Inherited label-primary text on the chip must reach WCAG AA.
    const ratio = contrastRatio(FOREGROUNDS[scheme].fg, chip[scheme])
    assert.ok(ratio >= 4.5, `${scheme}: label-primary on inline code = ${ratio.toFixed(2)} < 4.5`)
    // The chip is a light surface: darker than bg0 in light, lighter than bg0 in dark.
    const chipLuminance = relativeLuminance(chip[scheme])
    const bgLuminance = relativeLuminance(RAMPS[scheme][DEFAULT_STATE[scheme]].bg0)
    assert.equal(chipLuminance < bgLuminance, scheme === 'light', `${scheme}: chip luminance direction`)
  }
})

test('sidebar surface is one ramp step off bg-base so the column edge stays visible', () => {
  // DSH paints the sidebar column / Windows titlebar / content-card frame with
  // --dsw-specific-sidebar-fill and the content card itself with bg-base; mapping
  // both to bg0 erased the boundary (2026-10-18 visual report).
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const overlay = tokensFor({ light: strength, dark: strength })
      const sidebar = overlay['--dsw-specific-sidebar-fill'][scheme]
      const base = overlay['--dsw-alias-bg-base'][scheme]
      const ramp = RAMPS[scheme][strength]
      assert.ok(isHex(sidebar), `${scheme}-${strength}: sidebar must be a solid colour`)
      assert.notEqual(sidebar, base, `${scheme}-${strength}: sidebar must not equal bg-base`)
      // Perceptible boundary (the flat-bg0 regression must fail this).
      const boundary = contrastRatio(sidebar, base)
      assert.ok(boundary >= 1.02, `${scheme}-${strength}: sidebar/bg-base boundary = ${boundary.toFixed(3)}`)
      // One step off bg0 in the native direction, never a full bg1 jump.
      const sidebarLuminance = relativeLuminance(sidebar)
      const baseLuminance = relativeLuminance(base)
      const bg1Luminance = relativeLuminance(ramp.bg1)
      assert.equal(sidebarLuminance < baseLuminance, scheme === 'light', `${scheme}: sidebar luminance direction`)
      assert.ok(
        scheme === 'light' ? sidebarLuminance > bg1Luminance : sidebarLuminance < bg1Luminance,
        `${scheme}-${strength}: sidebar must stay between bg0 and bg1`
      )
      // The whole column renders label-primary text on this surface.
      const textRatio = contrastRatio(overlay['--dsw-alias-label-primary'][scheme], sidebar)
      assert.ok(textRatio >= 4.5, `${scheme}-${strength}: label-primary on the sidebar = ${textRatio.toFixed(2)}`)
    }
  }
})

test('borders use bg5 alpha, not literal grey', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.equal(overlay['--dsw-alias-border-l1'].light, alpha(RAMPS.light.hard.bg5, 0.45))
  assert.equal(overlay['--dsw-alias-border-l2'].light, alpha(RAMPS.light.hard.bg5, 0.6))
  assert.equal(overlay['--dsw-alias-border-l3'].light, alpha(RAMPS.light.hard.bg5, 0.75))
  assert.equal(overlay['--dsw-alias-border-l4'].light, alpha(RAMPS.light.hard.bg5, 0.9))
  assert.equal(overlay['--dsw-alias-border-l2'].dark, alpha(RAMPS.dark.soft.bg5, 0.6))
})

test('semantic state mapping follows Enchanted', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.equal(overlay['--dsw-alias-state-success-primary'].light, FOREGROUNDS.light.green)
  assert.equal(overlay['--dsw-alias-state-warn-primary'].light, FOREGROUNDS.light.yellow)
  assert.equal(overlay['--dsw-alias-state-error-primary'].light, FOREGROUNDS.light.red)
  assert.equal(overlay['--dsw-alias-state-business-primary'].light, FOREGROUNDS.light.blue)
  assert.equal(overlay['--dsw-alias-state-idle-primary'].light, FOREGROUNDS.light.grey2)
  assert.equal(overlay['--dsw-alias-label-secondary'].light, FOREGROUNDS.light.grey1)
  assert.equal(overlay['--dsw-alias-label-tertiary'].light, FOREGROUNDS.light.grey2)
})

test('diff uses bg_green / bg_red surfaces with green / red markers', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  assert.equal(overlay['--dsw-alias-file-diff-added-marker'].light, FOREGROUNDS.light.green)
  assert.equal(overlay['--dsw-alias-file-diff-deleted-marker'].light, FOREGROUNDS.light.red)
  assert.ok(overlay['--dsw-alias-file-diff-added-bg'].light.length === 7)
  assert.ok(overlay['--dsw-alias-file-diff-deleted-bg'].light.length === 7)
  assert.equal(overlay['--dsw-alias-code-diff-added'].light, alpha(FOREGROUNDS.light.green, 0.1))
  assert.equal(overlay['--dsw-alias-code-diff-deleted'].light, alpha(FOREGROUNDS.light.red, 0.1))
})

test('focus ring / font / shadow tokens stay uncovered and are self-check probes', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  for (const name of [
    '--dsw-focus-ring-color',
    '--dsw-focus-ring-width',
    '--dsw-menu-backdrop-filter',
    '--dsw-mask-blur',
    '--dsw-shadow-lv1'
  ]) {
    assert.ok(!(name in overlay), `${name} must not be overridden`)
    assert.ok(TOKEN_COVERAGE.uncovered.includes(name), `${name} must be listed as uncovered`)
  }
  assert.ok(SELF_CHECK_TOKENS.length >= 5 && SELF_CHECK_TOKENS.length <= 8)
  for (const name of SELF_CHECK_TOKENS) {
    assert.match(name, /^--dsw-/)
    assert.ok(!(name in overlay), `${name} must be uncovered (computed value probe)`)
    assert.ok(TOKEN_COVERAGE.uncovered.includes(name), name)
  }
})

test('primary label passes WCAG AA on base and light layers for all six variants', () => {
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const overlay = tokensFor({ light: strength, dark: strength })
      const value = (name) => overlay[name][scheme]
      const primary = value('--dsw-alias-label-primary')
      for (const surface of [
        '--dsw-alias-bg-base',
        '--dsw-alias-bg-layer-1',
        '--dsw-alias-bg-layer-2'
      ]) {
        assert.ok(
          contrastRatio(primary, value(surface)) >= 4.5,
          `${scheme}-${strength}: ${primary} on ${surface}`
        )
      }
      assert.ok(contrastRatio(value('--shiki-foreground'), value('--shiki-background')) >= 4.5)
    }
  }
})

test('brand foreground on brand stays above the accepted 2.5 trade-off', () => {
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const overlay = tokensFor({ light: strength, dark: strength })
      const value = (name) => overlay[name][scheme]
      assert.ok(
        contrastRatio(value('--dsw-alias-label-primary-foreground'), value('--dsw-alias-brand-primary')) >= 2.5
      )
    }
  }
})
