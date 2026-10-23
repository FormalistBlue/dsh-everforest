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
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'emphasis', 'inlineCode', 'linkInternal', 'faint',
  'marker', 'quote', 'hr', 'check',
  'band', 'zebra', 'tableHover', 'quoteBg',
  'rowWarn', 'rowDone', 'rowWarnHover', 'rowDoneHover',
  'dotWarn', 'dotDone'
]

/**
 * The approved "中彩" values. h1–h3 / marker / band / zebra / session rows are
 * the 2026-10-23 preview snapshot (`.tmp/color-mode-preview/spec.json`); the
 * rich-text roles added for the Enchanted pass are pinned on purpose too: the
 * formulas are only accepted if they reproduce exactly these colours.
 */
const EXPECTED_ROLES = {
  'dark-hard': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#569D79', faint: '#9DA9A0', marker: '#83C092', check: '#7FBBB3', band: '#39423e', zebra: '#2f3738', tableHover: '#343d3b', quoteBg: '#2e3a3b', rowWarn: '#434241', rowDone: '#3c4742', rowWarnHover: '#4e4845', rowDoneHover: '#434f47', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-medium': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#5b9f7b', faint: '#9DA9A0', marker: '#83C092', check: '#7FBBB3', band: '#3e4845', zebra: '#343d3f', tableHover: '#394342', quoteBg: '#344042', rowWarn: '#484848', rowDone: '#414d49', rowWarnHover: '#534d4b', rowDoneHover: '#48554d', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-soft': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#6ea582', faint: '#9DA9A0', marker: '#83C092', check: '#7FBBB3', band: '#434e4c', zebra: '#3a4447', tableHover: '#3f4949', quoteBg: '#394749', rowWarn: '#4e4e4f', rowDone: '#465350', rowWarnHover: '#565251', rowDoneHover: '#485552', dotWarn: '#E69875', dotDone: '#A7C080' },
  'light-hard': { h1: '#F85552', h2: '#d87934', h3: '#b18d28', h4: '#889b0d', h5: '#3d90bd', h6: '#c369ab', emphasis: '#c369ab', inlineCode: '#3A94C5', linkInternal: '#579478', faint: '#829181', marker: '#37a47c', check: '#3d90bd', band: '#efeece', zebra: '#f8f6e1', tableHover: '#f4f2d7', quoteBg: '#eff4e6', rowWarn: '#f9e7cf', rowDone: '#ececcb', rowWarnHover: '#f8e4c9', rowDoneHover: '#eaeac6', dotWarn: '#d07838', dotDone: '#849715' },
  'light-medium': { h1: '#F85552', h2: '#d07838', h3: '#ac8b2c', h4: '#849715', h5: '#3f8db8', h6: '#bc69a7', emphasis: '#bc69a7', inlineCode: '#3c91c0', linkInternal: '#589077', faint: '#829181', marker: '#39a07b', check: '#3f8db8', band: '#edeac3', zebra: '#f6f1d5', tableHover: '#f2eecc', quoteBg: '#edf0db', rowWarn: '#f6e5c9', rowDone: '#ece9c5', rowWarnHover: '#f6e5c9', rowDoneHover: '#ece9c5', dotWarn: '#c7773d', dotDone: '#81931d' },
  'light-soft': { h1: '#e45856', h2: '#bc7642', h3: '#9c843a', h4: '#7d8f25', h5: '#408cb6', h6: '#b969a5', emphasis: '#b969a5', inlineCode: '#408cb5', linkInternal: '#588f77', faint: '#829181', marker: '#409579', check: '#408cb6', band: '#efe7cb', zebra: '#efe7cb', tableHover: '#efe7cb', quoteBg: '#ede8d0', rowWarn: '#eee7ce', rowDone: '#eee7ce', rowWarnHover: '#eee7ce', rowDoneHover: '#eee7ce', dotWarn: '#b67545', dotDone: '#7a8c2c' }
}

/** Role key → CSS custom property name (camelCase → kebab-case). */
const ROLE_VARIABLES = Object.fromEntries(ROLE_KEYS.map((role) => [
  role,
  `--everforest-color-${role.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`
]))

/** Every custom property the stylesheet must define. */
const COLOR_VARIABLES = Object.values(ROLE_VARIABLES)

const STYLE_SCOPE = `html[${COLOR_MODE_ATTRS.mode}="on"]`
const MARKDOWN_SCOPE = `${STYLE_SCOPE} [class*="markdown"]:not([data-markdown-variant="compact"])`
const SESSION_ROW = `${STYLE_SCOPE} [role="treeitem"][data-row-key^="session:"]`

/** [selector, CSS property, custom property] for every variable-driven rule. */
const EXPECTED_RULES = [
  [`${MARKDOWN_SCOPE} h1`, 'color', '--everforest-color-h1'],
  [`${MARKDOWN_SCOPE} h2`, 'color', '--everforest-color-h2'],
  [`${MARKDOWN_SCOPE} h3`, 'color', '--everforest-color-h3'],
  [`${MARKDOWN_SCOPE} h4`, 'color', '--everforest-color-h4'],
  [`${MARKDOWN_SCOPE} h5`, 'color', '--everforest-color-h5'],
  [`${MARKDOWN_SCOPE} h6`, 'color', '--everforest-color-h6'],
  [`${MARKDOWN_SCOPE} strong`, 'color', '--everforest-color-emphasis'],
  [`${MARKDOWN_SCOPE} em`, 'color', '--everforest-color-emphasis'],
  [`${MARKDOWN_SCOPE} del`, 'color', '--everforest-color-faint'],
  [`${MARKDOWN_SCOPE} :not(pre) > code`, 'color', '--everforest-color-inline-code'],
  [`${MARKDOWN_SCOPE} [class*="fileLink"]`, 'color', '--everforest-color-link-internal'],
  [`${MARKDOWN_SCOPE} li::marker`, 'color', '--everforest-color-marker'],
  [`${MARKDOWN_SCOPE} blockquote`, 'border-left-color', '--everforest-color-quote'],
  [`${MARKDOWN_SCOPE} blockquote`, 'background-color', '--everforest-color-quote-bg'],
  [`${MARKDOWN_SCOPE} hr`, 'background-color', '--everforest-color-hr'],
  [`${MARKDOWN_SCOPE} thead th`, 'background-color', '--everforest-color-band'],
  [`${MARKDOWN_SCOPE} tbody tr:nth-child(even) > td`, 'background-color', '--everforest-color-zebra'],
  [`${MARKDOWN_SCOPE} tbody tr:hover > td`, 'background-color', '--everforest-color-table-hover'],
  [`${MARKDOWN_SCOPE} input[type="checkbox"]`, 'accent-color', '--everforest-color-check'],
  [`${MARKDOWN_SCOPE} li.task-list-item:has(input[type="checkbox"]:checked)`, 'color', '--everforest-color-faint'],
  [`${STYLE_SCOPE} [data-state="warning"]`, 'color', '--everforest-color-dot-warn'],
  [`${STYLE_SCOPE} [data-state="done"]`, 'color', '--everforest-color-dot-done'],
  [`${SESSION_ROW}:has([data-state="warning"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-warn'],
  [`${SESSION_ROW}:has([data-state="done"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-done'],
  [`${SESSION_ROW}:has([data-state="warning"]):hover:not([aria-selected="true"])`, 'background-color', '--everforest-color-row-warn-hover'],
  [`${SESSION_ROW}:has([data-state="done"]):hover:not([aria-selected="true"])`, 'background-color', '--everforest-color-row-done-hover']
]

/** Rules that are not a single role variable (checked verbatim). */
const EXPECTED_LITERAL_RULES = [
  [`${MARKDOWN_SCOPE} :where(h1,h2,h3,h4,h5,h6) :is(strong,em)`, [['color', 'inherit']]],
  [`${MARKDOWN_SCOPE} blockquote`, [['padding-right', '12px'], ['border-radius', '0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0']]]
]

/**
 * The token values a variant's roles are derived from.
 * @param {string} variant - `${scheme}-${strength}`.
 * @returns {{ bg: string, sidebar: string, label: string, tertiary: string, inlineChip: string }}
 */
function surfacesOf (variant) {
  const [scheme, strength] = variant.split('-')
  const overlay = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
  const pick = (name) => overlay[name][scheme]
  return {
    bg: pick('--dsw-alias-bg-base'),
    sidebar: pick('--dsw-specific-sidebar-fill'),
    label: pick('--dsw-alias-label-primary'),
    tertiary: pick('--dsw-alias-label-tertiary'),
    inlineChip: pick('--dsw-alias-markdown-inline-code')
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

/** Find the rule for `selector` that declares `property`. */
function findRule (rules, selector, property) {
  return rules.find((rule) => rule.selector === selector && declarationsOf(rule.body).has(property))
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

test('colorModeRoles reuses the aqua guard for marker, quote and hr', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const marker = roles[variant].marker
    assert.equal(roles[variant].quote, marker, `${variant}.quote`)
    assert.equal(roles[variant].hr, marker, `${variant}.hr`)
  }
})

test('colorModeRoles keeps the Enchanted mapping: h6 and emphasis are the same purple', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].h6, roles[variant].emphasis, `${variant}.h6/emphasis`)
  }
})

test('colorModeRoles maps faint onto the variant label-tertiary token', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].faint, surfacesOf(variant).tertiary, `${variant}.faint`)
  }
})

test('colorModeRoles keeps large headings h1-h4 >= 3:1 on bg-base', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg } = surfacesOf(variant)
    for (const role of ['h1', 'h2', 'h3', 'h4']) {
      const ratio = contrastRatio(roles[variant][role], bg)
      assert.ok(ratio >= 3, `${variant}.${role} on bg-base = ${ratio.toFixed(2)} < 3`)
    }
  }
})

test('colorModeRoles keeps accent text >= 3:1 on every markdown surface', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg, inlineChip } = surfacesOf(variant)
    const variantRoles = roles[variant]
    const surfaces = [bg, variantRoles.band, variantRoles.zebra, variantRoles.tableHover, variantRoles.quoteBg]
    for (const role of ['h5', 'h6', 'emphasis', 'linkInternal']) {
      for (const surface of surfaces) {
        const ratio = contrastRatio(variantRoles[role], surface)
        assert.ok(ratio >= 3, `${variant}.${role} on ${surface} = ${ratio.toFixed(2)} < 3`)
      }
    }
    const inlineRatio = contrastRatio(variantRoles.inlineCode, inlineChip)
    assert.ok(inlineRatio >= 3, `${variant}.inlineCode on the inline-code chip = ${inlineRatio.toFixed(2)} < 3`)
  }
})

test('colorModeRoles keeps decorations and the checkbox accent >= 3:1 on bg-base', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg } = surfacesOf(variant)
    for (const role of ['marker', 'quote', 'hr', 'check']) {
      const ratio = contrastRatio(roles[variant][role], bg)
      assert.ok(ratio >= 3, `${variant}.${role} on bg-base = ${ratio.toFixed(2)} < 3`)
    }
  }
})

test('colorModeRoles keeps label-primary >= 4.5:1 on every tinted surface', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { label } = surfacesOf(variant)
    for (const role of ['band', 'zebra', 'tableHover', 'quoteBg', 'rowWarn', 'rowDone', 'rowWarnHover', 'rowDoneHover']) {
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
  assert.equal(rules.length, 6 + EXPECTED_RULES.length + EXPECTED_LITERAL_RULES.length)
  for (const rule of rules) {
    assert.ok(rule.selector.startsWith(STYLE_SCOPE), `unscoped selector: ${rule.selector}`)
  }
  assert.doesNotMatch(css, /!important/)
  assert.match(css, /\n$/, 'stylesheet should end with a newline')
})

test('colorModeStyles carries every required element rule', () => {
  const rules = styleRules(colorModeStyles())
  for (const [selector, property, variable] of EXPECTED_RULES) {
    const rule = findRule(rules, selector, property)
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
  // The table-row hover fill must come after the zebra rule, or it would lose.
  assert.ok(
    selectors.indexOf(`${MARKDOWN_SCOPE} tbody tr:hover > td`) > selectors.indexOf(`${MARKDOWN_SCOPE} tbody tr:nth-child(even) > td`),
    'table hover rule must follow the zebra rule'
  )
})

test('colorModeStyles carries the literal rules (heading emphasis, quote fill shape)', () => {
  const rules = styleRules(colorModeStyles())
  for (const [selector, declarations] of EXPECTED_LITERAL_RULES) {
    for (const [property, value] of declarations) {
      const rule = findRule(rules, selector, property)
      assert.ok(rule, `missing rule: ${selector}`)
      assert.equal(declarationsOf(rule.body).get(property), value, `${selector} ${property}`)
    }
  }
  // `color: inherit` must win over the `strong` / `em` colour rule.
  const selectors = rules.map((rule) => rule.selector)
  const inheritAt = selectors.indexOf(`${MARKDOWN_SCOPE} :where(h1,h2,h3,h4,h5,h6) :is(strong,em)`)
  assert.ok(inheritAt > selectors.indexOf(`${MARKDOWN_SCOPE} strong`), 'heading emphasis rule must follow the strong rule')
  assert.ok(inheritAt > selectors.indexOf(`${MARKDOWN_SCOPE} em`), 'heading emphasis rule must follow the em rule')
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
