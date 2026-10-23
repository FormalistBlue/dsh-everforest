import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  COLOR_MODE_ATTRS,
  colorModeDataset,
  colorModeRoles,
  colorModeStyles
} from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, STRENGTHS, VARIANT_NAMES } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

const HEX = /^#[0-9a-f]{6}$/i

/** All role keys of one variant, in the contract's order. */
const ROLE_KEYS = [
  'h1', 'h2', 'h3', 'marker', 'quote', 'hr', 'check',
  'band', 'zebra', 'rowWarn', 'rowDone', 'rowWarnHover', 'rowDoneHover',
  'dotWarn', 'dotDone'
]

/**
 * The approved "中彩" values, copied from the 2026-10-23 preview snapshot
 * (`.tmp/color-mode-preview/spec.json`, `values[*].mid`). Pinned on purpose:
 * the formulas are only accepted if they reproduce exactly these colours.
 */
const EXPECTED_ROLES = {
  'dark-hard': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', marker: '#83C092', band: '#39423e', zebra: '#2f3738', rowWarn: '#434241', rowDone: '#3c4742', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-medium': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', marker: '#83C092', band: '#3e4845', zebra: '#343d3f', rowWarn: '#484848', rowDone: '#414d49', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-soft': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', marker: '#83C092', band: '#434e4c', zebra: '#3a4447', rowWarn: '#4e4e4f', rowDone: '#465350', dotWarn: '#E69875', dotDone: '#A7C080' },
  'light-hard': { h1: '#F85552', h2: '#d87934', h3: '#b18d28', marker: '#37a47c', band: '#efeece', zebra: '#f8f6e1', rowWarn: '#f9e7cf', rowDone: '#ececcb', dotWarn: '#d07838', dotDone: '#849715' },
  'light-medium': { h1: '#F85552', h2: '#d07838', h3: '#ac8b2c', marker: '#39a07b', band: '#edeac3', zebra: '#f6f1d5', rowWarn: '#f6e5c9', rowDone: '#ece9c5', dotWarn: '#c7773d', dotDone: '#81931d' },
  'light-soft': { h1: '#e45856', h2: '#bc7642', h3: '#9c843a', marker: '#409579', band: '#efe7cb', zebra: '#efe7cb', rowWarn: '#eee7ce', rowDone: '#eee7ce', dotWarn: '#b67545', dotDone: '#7a8c2c' }
}

/** Every custom property the stylesheet must define. */
const COLOR_VARIABLES = [
  '--everforest-color-h1',
  '--everforest-color-h2',
  '--everforest-color-h3',
  '--everforest-color-marker',
  '--everforest-color-quote',
  '--everforest-color-hr',
  '--everforest-color-check',
  '--everforest-color-band',
  '--everforest-color-zebra',
  '--everforest-color-row-warn',
  '--everforest-color-row-done',
  '--everforest-color-row-warn-hover',
  '--everforest-color-row-done-hover',
  '--everforest-color-dot-warn',
  '--everforest-color-dot-done'
]

/** Role key → custom property name (the selector layer consumes these). */
const ROLE_VARIABLES = {
  h1: '--everforest-color-h1',
  h2: '--everforest-color-h2',
  h3: '--everforest-color-h3',
  marker: '--everforest-color-marker',
  quote: '--everforest-color-quote',
  hr: '--everforest-color-hr',
  check: '--everforest-color-check',
  band: '--everforest-color-band',
  zebra: '--everforest-color-zebra',
  rowWarn: '--everforest-color-row-warn',
  rowDone: '--everforest-color-row-done',
  rowWarnHover: '--everforest-color-row-warn-hover',
  rowDoneHover: '--everforest-color-row-done-hover',
  dotWarn: '--everforest-color-dot-warn',
  dotDone: '--everforest-color-dot-done'
}

const STYLE_SCOPE = `html[${COLOR_MODE_ATTRS.mode}="on"]`
const MARKDOWN_SCOPE = `${STYLE_SCOPE} [class*="markdown"]:not([data-markdown-variant="compact"])`
const SESSION_ROW = `${STYLE_SCOPE} [role="treeitem"][data-row-key^="session:"]`

/** [selector, CSS property, custom property] for the 15 element rules. */
const EXPECTED_RULES = [
  [`${MARKDOWN_SCOPE} h1`, 'color', '--everforest-color-h1'],
  [`${MARKDOWN_SCOPE} h2`, 'color', '--everforest-color-h2'],
  [`${MARKDOWN_SCOPE} h3`, 'color', '--everforest-color-h3'],
  [`${MARKDOWN_SCOPE} li::marker`, 'color', '--everforest-color-marker'],
  [`${MARKDOWN_SCOPE} blockquote`, 'border-left-color', '--everforest-color-quote'],
  [`${MARKDOWN_SCOPE} hr`, 'background-color', '--everforest-color-hr'],
  [`${MARKDOWN_SCOPE} thead th`, 'background-color', '--everforest-color-band'],
  [`${MARKDOWN_SCOPE} tbody tr:nth-child(even) > td`, 'background-color', '--everforest-color-zebra'],
  [`${MARKDOWN_SCOPE} input[type="checkbox"]`, 'accent-color', '--everforest-color-check'],
  [`${STYLE_SCOPE} [data-state="warning"]`, 'color', '--everforest-color-dot-warn'],
  [`${STYLE_SCOPE} [data-state="done"]`, 'color', '--everforest-color-dot-done'],
  [`${SESSION_ROW}:has([data-state="warning"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-warn'],
  [`${SESSION_ROW}:has([data-state="done"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-done'],
  [`${SESSION_ROW}:has([data-state="warning"]):hover:not([aria-selected="true"])`, 'background-color', '--everforest-color-row-warn-hover'],
  [`${SESSION_ROW}:has([data-state="done"]):hover:not([aria-selected="true"])`, 'background-color', '--everforest-color-row-done-hover']
]

/**
 * The token values a variant's roles are derived from.
 * @param {string} variant - `${scheme}-${strength}`.
 * @returns {{ bg: string, sidebar: string, label: string }}
 */
function surfacesOf (variant) {
  const [scheme, strength] = variant.split('-')
  const overlay = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
  const pick = (name) => overlay[name][scheme]
  return {
    bg: pick('--dsw-alias-bg-base'),
    sidebar: pick('--dsw-specific-sidebar-fill'),
    label: pick('--dsw-alias-label-primary')
  }
}

/** Split a stylesheet into `{ selector, body }` rules (the CSS has no nesting). */
function styleRules (css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim(),
    body: match[2].trim()
  }))
}

/** Parse one rule body into a `name → value` map. */
function declarationsOf (body) {
  const declarations = new Map()
  for (const part of body.split(';')) {
    const declaration = part.trim()
    if (declaration === '') continue
    const colon = declaration.indexOf(':')
    declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim())
  }
  return declarations
}

/** The custom-property block selector of one variant. */
function blockSelector (scheme, strength) {
  return scheme === 'light'
    ? `html[${COLOR_MODE_ATTRS.mode}="on"][${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
    : `html[${COLOR_MODE_ATTRS.mode}="on"][${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
}

test('COLOR_MODE_ATTRS pins the three document attributes', () => {
  assert.deepEqual(COLOR_MODE_ATTRS, {
    mode: 'data-everforest-color-mode',
    light: 'data-everforest-light',
    dark: 'data-everforest-dark'
  })
})

test('colorModeRoles covers the six variants with opaque #RRGGBB roles', () => {
  const roles = colorModeRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.deepEqual(Object.keys(roles[variant]).sort(), [...ROLE_KEYS].sort(), `${variant}: role set`)
    for (const role of ROLE_KEYS) {
      assert.match(roles[variant][role], HEX, `${variant}.${role}`)
    }
  }
})

test('colorModeRoles reproduces the approved 中彩 snapshot', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    for (const [role, expected] of Object.entries(EXPECTED_ROLES[variant])) {
      assert.equal(roles[variant][role], expected, `${variant}.${role}`)
    }
  }
})

test('colorModeRoles reuses the aqua guard for marker, quote, hr and check', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const marker = roles[variant].marker
    assert.equal(roles[variant].quote, marker, `${variant}.quote`)
    assert.equal(roles[variant].hr, marker, `${variant}.hr`)
    assert.equal(roles[variant].check, marker, `${variant}.check`)
  }
})

test('colorModeRoles keeps headings and decorations >= 3:1 on bg-base', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg } = surfacesOf(variant)
    for (const role of ['h1', 'h2', 'h3', 'marker', 'quote', 'hr', 'check']) {
      const ratio = contrastRatio(roles[variant][role], bg)
      assert.ok(ratio >= 3, `${variant}.${role} on bg-base = ${ratio.toFixed(2)} < 3`)
    }
  }
})

test('colorModeRoles keeps label-primary >= 4.5:1 on tinted surfaces', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { label } = surfacesOf(variant)
    for (const role of ['band', 'zebra', 'rowWarn', 'rowDone', 'rowWarnHover', 'rowDoneHover']) {
      const ratio = contrastRatio(label, roles[variant][role])
      assert.ok(ratio >= 4.5, `${variant}.${role} text = ${ratio.toFixed(2)} < 4.5`)
    }
  }
})

test('colorModeRoles keeps the status dots >= 3:1 on bg-base and the sidebar', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg, sidebar } = surfacesOf(variant)
    for (const role of ['dotWarn', 'dotDone']) {
      for (const [background, color] of [['bg-base', bg], ['sidebar', sidebar]]) {
        const ratio = contrastRatio(roles[variant][role], color)
        assert.ok(ratio >= 3, `${variant}.${role} on ${background} = ${ratio.toFixed(2)} < 3`)
      }
    }
  }
})

test('colorModeDataset maps the mode toggle and both strengths onto attributes', () => {
  for (const colorMode of [true, false]) {
    for (const light of STRENGTHS) {
      for (const dark of STRENGTHS) {
        assert.deepEqual(colorModeDataset({ colorMode, light, dark }), {
          'data-everforest-color-mode': colorMode ? 'on' : 'off',
          'data-everforest-light': light,
          'data-everforest-dark': dark
        })
      }
    }
  }
  // Missing colorMode means the mode is off.
  assert.equal(colorModeDataset({ light: 'hard', dark: 'soft' })[COLOR_MODE_ATTRS.mode], 'off')
})

test('colorModeStyles defines one complete custom-property block per variant', () => {
  const roles = colorModeRoles()
  const rules = styleRules(colorModeStyles())
  const blocks = rules.filter((rule) => rule.selector.includes(' body'))
  assert.equal(blocks.length, 6, 'expected light/dark × hard/medium/soft blocks')
  for (const scheme of ['light', 'dark']) {
    for (const strength of STRENGTHS) {
      const selector = blockSelector(scheme, strength)
      const block = blocks.find((rule) => rule.selector === selector)
      assert.ok(block, `missing block ${selector}`)
      const declarations = declarationsOf(block.body)
      assert.deepEqual([...declarations.keys()].sort(), [...COLOR_VARIABLES].sort(), `${scheme}-${strength}: variables`)
      for (const [role, variable] of Object.entries(ROLE_VARIABLES)) {
        assert.equal(declarations.get(variable), roles[`${scheme}-${strength}`][role], `${scheme}-${strength}: ${variable}`)
      }
    }
  }
})

test('colorModeStyles scopes every rule to the mode being on', () => {
  const css = colorModeStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, 6 + EXPECTED_RULES.length)
  for (const rule of rules) {
    assert.ok(rule.selector.startsWith(STYLE_SCOPE), `unscoped selector: ${rule.selector}`)
  }
  assert.doesNotMatch(css, /!important/)
  assert.match(css, /\n$/, 'stylesheet should end with a newline')
})

test('colorModeStyles carries every required element rule', () => {
  const rules = styleRules(colorModeStyles())
  for (const [selector, property, variable] of EXPECTED_RULES) {
    const rule = rules.find((candidate) => candidate.selector === selector)
    assert.ok(rule, `missing selector: ${selector}`)
    assert.equal(declarationsOf(rule.body).get(property), `var(${variable})`, `${selector} ${property}`)
  }
  // The hover rules come after their base rules so a hovered row changes colour.
  const selectors = rules.map((rule) => rule.selector)
  for (const state of ['warning', 'done']) {
    const base = `${SESSION_ROW}:has([data-state="${state}"]):not([aria-selected="true"])`
    const hover = `${SESSION_ROW}:has([data-state="${state}"]):hover:not([aria-selected="true"])`
    assert.ok(selectors.indexOf(hover) > selectors.indexOf(base), `${state}: hover rule must follow the base rule`)
  }
})

test('colorModeStyles only contains valid #RRGGBB colours and declared variables', () => {
  const css = colorModeStyles()
  const rules = styleRules(css)
  const declared = new Set()
  for (const rule of rules) {
    for (const name of declarationsOf(rule.body).keys()) {
      if (name.startsWith('--')) declared.add(name)
    }
  }
  for (const variable of COLOR_VARIABLES) assert.ok(declared.has(variable), `missing variable ${variable}`)

  const hexes = css.match(/#[0-9a-zA-Z]+/g) ?? []
  assert.equal(hexes.length, 6 * COLOR_VARIABLES.length)
  for (const hex of hexes) assert.match(hex, HEX, `invalid colour ${hex}`)

  for (const rule of rules) {
    for (const value of declarationsOf(rule.body).values()) {
      const usage = value.match(/^var\((--[a-z0-9-]+)\)$/)
      if (!usage) continue
      assert.ok(declared.has(usage[1]), `undeclared variable ${usage[1]} in ${rule.selector}`)
    }
  }
})
