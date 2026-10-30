import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  COLOR_MODE_ATTRS,
  colorModeDataset,
  colorModeRoles,
  colorModeStyles
} from '../src/color-mode.js'
import { contrastRatio, hexToRgb, labLightness } from '../src/color.js'
import { DEFAULT_STATE, STRENGTHS, VARIANT_NAMES, resolvePalette } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'
import { declarationsOf, styleRules } from './support/css.mjs'

const HEX = /^#[0-9a-f]{6}$/i

/** All role keys of one variant, in the contract's order. */
const ROLE_KEYS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'emphasis', 'inlineCode', 'linkInternal', 'faint',
  'marker', 'quote', 'hr', 'tableHandle', 'check',
  'band', 'zebra', 'tableHover', 'quoteBg',
  'rowWarn', 'rowWarnHover', 'rowDone', 'rowDoneHover',
  'dotWarn', 'dotDone'
]

/**
 * The approved "中彩" values. h1–h3 / marker / band / zebra / session rows are
 * the 2026-10-23 preview snapshot (`.tmp/color-mode-preview/spec.json`); the
 * rich-text roles added for the Enchanted pass are pinned on purpose too: the
 * formulas are only accepted if they reproduce exactly these colours. The four
 * session-row fills were re-derived by the 2026-10-24 restyle: done comes from
 * Everforest's own palette1 `bg_green`, waiting from `bg_yellow` (deepened
 * toward `fg.yellow` where the light palette value sits too close to the
 * sidebar, design.md §13.9). Hover is one accent step stronger and re-guarded.
 */
const EXPECTED_ROLES = {
  'dark-hard': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#569D79', faint: '#9DA9A0', marker: '#83C092', tableHandle: '#569D79', check: '#7FBBB3', band: '#39423e', zebra: '#2f3738', tableHover: '#343d3b', quoteBg: '#2e3a3b', rowWarn: '#b19a6b', rowWarnHover: '#b89f6e', rowDone: '#3C4841', rowDoneHover: '#4a5749', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-medium': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#5b9f7b', faint: '#9DA9A0', marker: '#83C092', tableHandle: '#569D79', check: '#7FBBB3', band: '#3e4845', zebra: '#343d3f', tableHover: '#394342', quoteBg: '#344042', rowWarn: '#b39c6d', rowWarnHover: '#b9a170', rowDone: '#425047', rowDoneHover: '#49574b', dotWarn: '#E69875', dotDone: '#A7C080' },
  'dark-soft': { h1: '#E67E80', h2: '#E69875', h3: '#DBBC7F', h4: '#A7C080', h5: '#7FBBB3', h6: '#D699B6', emphasis: '#D699B6', inlineCode: '#7FBBB3', linkInternal: '#6ea582', faint: '#9DA9A0', marker: '#83C092', tableHandle: '#569D79', check: '#7FBBB3', band: '#434e4c', zebra: '#3a4447', tableHover: '#3f4949', quoteBg: '#394749', rowWarn: '#b49d6f', rowWarnHover: '#baa272', rowDone: '#48574e', rowDoneHover: '#49574f', dotWarn: '#E69875', dotDone: '#A7C080' },
  'light-hard': { h1: '#F85552', h2: '#d87934', h3: '#b18d28', h4: '#889b0d', h5: '#3d90bd', h6: '#c369ab', emphasis: '#c369ab', inlineCode: '#3A94C5', linkInternal: '#579478', faint: '#829181', marker: '#37a47c', tableHandle: '#569D79', check: '#3f9779', band: '#efeece', zebra: '#f8f6e1', tableHover: '#f4f2d7', quoteBg: '#eff4e6', rowWarn: '#fbeac0', rowWarnHover: '#f9e6b5', rowDone: '#F3F5D9', rowDoneHover: '#e7ebbe', dotWarn: '#d07838', dotDone: '#849715' },
  'light-medium': { h1: '#F85552', h2: '#d07838', h3: '#ac8b2c', h4: '#849715', h5: '#3f8db8', h6: '#bc69a7', emphasis: '#bc69a7', inlineCode: '#3c91c0', linkInternal: '#589077', faint: '#829181', marker: '#39a07b', tableHandle: '#569D79', check: '#419379', band: '#edeac3', zebra: '#f6f1d5', tableHover: '#f2eecc', quoteBg: '#edf0db', rowWarn: '#f8e6bb', rowWarnHover: '#f8e6b9', rowDone: '#F0F1D2', rowDoneHover: '#e9eac1', dotWarn: '#c7773d', dotDone: '#81931d' },
  'light-soft': { h1: '#e45856', h2: '#bc7642', h3: '#9c843a', h4: '#7d8f25', h5: '#408cb6', h6: '#b969a5', emphasis: '#b969a5', inlineCode: '#408cb5', linkInternal: '#588f77', faint: '#829181', marker: '#409579', tableHandle: '#569D79', check: '#429279', band: '#efe7cb', zebra: '#efe7cb', tableHover: '#efe7cb', quoteBg: '#ede8d0', rowWarn: '#f2e6c9', rowWarnHover: '#f2e6c7', rowDone: '#ebe8cb', rowDoneHover: '#eee7ca', dotWarn: '#b67545', dotDone: '#7a8c2c' }
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
  [`${MARKDOWN_SCOPE} input[type="checkbox"]:checked`, 'background-color', '--everforest-color-check'],
  [`${MARKDOWN_SCOPE} input[type="checkbox"]:checked`, 'border-color', '--everforest-color-check'],
  [`${MARKDOWN_SCOPE} li.task-list-item:has(input[type="checkbox"]:checked)`, 'color', '--everforest-color-faint'],
  [`${STYLE_SCOPE} [data-state="warning"]`, 'color', '--everforest-color-dot-warn'],
  [`${STYLE_SCOPE} [data-state="done"]`, 'color', '--everforest-color-dot-done'],
  [`${SESSION_ROW}:has([data-state="warning"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-warn'],
  [`${SESSION_ROW}:has([data-state="warning"]):not([aria-selected="true"]):hover`, 'background-color', '--everforest-color-row-warn-hover'],
  [`${SESSION_ROW}:has([data-state="done"]):not([aria-selected="true"])`, 'background-color', '--everforest-color-row-done'],
  [`${SESSION_ROW}:has([data-state="done"]):not([aria-selected="true"]):hover`, 'background-color', '--everforest-color-row-done-hover']
]

/** The dark waiting row that switches to the deep contrast ink (design §13.8.1). */
const DARK_WARN_ROW = `${STYLE_SCOPE} body[data-ds-dark-theme] [role="treeitem"][data-row-key^="session:"]:has([data-state="warning"]):not([aria-selected="true"])`

/** The horizontal-scroll wrapper around every markdown table. */
const TABLE_FRAME = `${MARKDOWN_SCOPE} [class*="tableScroll"]`

/** The task-list checkbox DSH renders `disabled` (see the source comment). */
const TASK_CHECKBOX = `${MARKDOWN_SCOPE} input[type="checkbox"]`

/** Rules that are not a single role variable (checked verbatim). */
const EXPECTED_LITERAL_RULES = [
  [`${MARKDOWN_SCOPE} :where(h1,h2,h3,h4,h5,h6) :is(strong,em)`, [['color', 'inherit']]],
  [`${MARKDOWN_SCOPE} blockquote`, [['padding-top', '2px'], ['padding-bottom', '2px'], ['padding-right', '12px'], ['border-radius', '0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0']]],
  // A task-list box that is not redrawn would stay the grey native control:
  // DSH marks it `disabled` and Chromium ignores `accent-color` there. The
  // marker is dropped too — DSH keeps both, so every item would show a bullet
  // next to its checkbox (2026-10-30 request: the box should carry colour).
  [`${MARKDOWN_SCOPE} ul.contains-task-list > li.task-list-item`, [['list-style', 'none']]],
  [TASK_CHECKBOX, [
    ['-webkit-appearance', 'none'],
    ['appearance', 'none'],
    ['box-sizing', 'border-box'],
    ['width', '14px'],
    ['height', '14px'],
    ['margin', '0 8px 0 0'],
    ['border', '1px solid color-mix(in srgb, var(--everforest-color-check) 68%, transparent)'],
    ['border-radius', '3px'],
    ['background-color', 'color-mix(in srgb, var(--everforest-color-check) 10%, transparent)'],
    ['vertical-align', '-2px'],
    ['position', 'relative'],
    ['cursor', 'default']
  ]],
  [`${TASK_CHECKBOX}:checked::after`, [
    ['content', '""'],
    ['position', 'absolute'],
    ['left', '3.5px'],
    ['top', '0.5px'],
    ['width', '4px'],
    ['height', '8px'],
    ['border', 'solid var(--dsw-alias-bg-base)'],
    ['border-width', '0 1.5px 1.5px 0'],
    ['transform', 'rotate(42deg)']
  ]],
  [`${TABLE_FRAME}.md-table-wide`, [
    ['width', 'max-content'],
    ['max-width', '100%'],
    ['margin-left', '0'],
    ['padding-left', '0'],
    ['overflow-x', 'auto'],
    ['padding-bottom', '0']
  ]],
  [`${TABLE_FRAME}:not(.md-table-wide)`, [['border', '.5px solid var(--dsw-alias-border-l3)'], ['border-radius', 'var(--dsw-radius-sm)']]],
  [`${TABLE_FRAME}.md-table-wide > table`, [['border', '.5px solid var(--dsw-alias-border-l3)']]],
  [`${TABLE_FRAME} th, ${TABLE_FRAME} td`, [['padding-left', '12px'], ['border-right', '.5px solid var(--dsw-alias-border-l2)']]],
  [`${TABLE_FRAME} th:last-child, ${TABLE_FRAME} td:last-child`, [['border-right', '0']]],
  [`${TABLE_FRAME} tbody tr:last-child > td`, [['border-bottom', '0']]],
  [`${TABLE_FRAME} td:last-child`, [['padding-right', '16px']]],
  [`${TABLE_FRAME} th`, [['font-size', 'var(--dsh-content-font-size, 14px)'], ['font-weight', '700']]],
  [`${TABLE_FRAME}::-webkit-scrollbar`, [['height', '10px']]],
  [`${TABLE_FRAME}::-webkit-scrollbar-thumb`, [
    ['border-top', '0'],
    ['border-bottom', 'var(--everforest-table-scrollbar-inset, 5px) solid transparent'],
    ['background-clip', 'content-box']
  ]],
  [DARK_WARN_ROW, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_time"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [data-state="warning"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_iconButton"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_iconButton"]:hover`, [['color', 'var(--dsw-alias-label-primary-inverted)']]],
  [`${DARK_WARN_ROW} [class*="_pinIndicator"]`, [['color', 'var(--dsw-alias-label-primary-inverted)']]]
]

/**
 * DSH / module tokens a literal rule may read without declaring them on the
 * sheet: the DSH token layer supplies the `--dsw-*` names (the sheet only owns
 * `--everforest-color-*`), `--dsh-content-font-size` rides DSH's Settings font
 * size, and `--everforest-table-scrollbar-inset` is written by
 * `src/table-scrollbar.js` on the wrapper at runtime.
 */
const ALLOWED_EXTERNAL_VARIABLES = new Set([
  '--dsh-content-font-size',
  '--dsw-alias-bg-base',
  '--dsw-alias-border-l2',
  '--dsw-alias-border-l3',
  '--dsw-alias-label-primary-inverted',
  '--dsw-radius-sm',
  '--everforest-table-scrollbar-inset'
])

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
    inverted: pick('--dsw-alias-label-primary-inverted'),
    tertiary: pick('--dsw-alias-label-tertiary'),
    inlineChip: pick('--dsw-alias-markdown-inline-code')
  }
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

test('colorModeRoles paints the column-resize handle with the deeper header aqua', () => {
  // 2026-10-30 request: the accent-aqua guide was too bright on the table header
  // band in both schemes. `header_aqua` is the same hue one palette step deeper,
  // so the handle is that value in every variant and never the brighter accent.
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].tableHandle, '#569D79', `${variant}.tableHandle`)
    assert.notEqual(roles[variant].tableHandle, roles[variant].marker, `${variant}.tableHandle vs marker`)
    const ratio = contrastRatio(roles[variant].tableHandle, roles[variant].band)
    assert.ok(ratio >= 2.5, `${variant}.tableHandle on the header band = ${ratio.toFixed(2)} < 2.5`)
  }
})

test('colorModeRoles keeps decorations and the checkbox accent >= 3:1 on bg-base', () => {
  // `check` is both the checked box's fill and the ink (the canvas colour) of the
  // drawn check mark, so this ratio is what keeps the mark legible on the box.
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { bg } = surfacesOf(variant)
    for (const role of ['marker', 'quote', 'hr', 'check']) {
      const ratio = contrastRatio(roles[variant][role], bg)
      assert.ok(ratio >= 3, `${variant}.${role} on bg-base = ${ratio.toFixed(2)} < 3`)
    }
  }
})

test('colorModeRoles keeps the row text ink >= 4.5:1 on every tinted surface', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const { label, inverted } = surfacesOf(variant)
    // The dark waiting rows carry the deep contrast ink (design §13.8.1); every
    // other tinted surface carries `label-primary`.
    const warnInk = variant.startsWith('dark') ? inverted : label
    for (const [role, ink] of [
      ['band', label], ['zebra', label], ['tableHover', label], ['quoteBg', label],
      ['rowDone', label], ['rowDoneHover', label],
      ['rowWarn', warnInk], ['rowWarnHover', warnInk]
    ]) {
      const ratio = contrastRatio(ink, roles[variant][role])
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

test('session-row fills come from the palette background accents', () => {
  const roles = colorModeRoles()
  // Minimum L* step the light waiting row has to keep from the sidebar (§13.8.1).
  const WARN_SEPARATION = 3.5
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const state = { ...DEFAULT_STATE, [scheme]: strength }
    const palette = resolvePalette(state)[scheme]
    const { label, inverted, sidebar } = surfacesOf(variant)
    // Done: `bg_green` verbatim in hard / medium; dark·soft's green sits at
    // 4.47:1 so it is nudged toward bg0, and light·soft is nudged toward its
    // (lighter) bg0 — both stay on the accent→bg0 line.
    const done = hexToRgb(roles[variant].rowDone)
    const green = hexToRgb(palette.ramp.bgGreen)
    const bg0 = hexToRgb(palette.ramp.bg0)
    assert.ok(contrastRatio(label, roles[variant].rowDone) >= 4.5, `${variant}.rowDone must keep label-primary >= 4.5:1`)
    for (const channel of ['r', 'g', 'b']) {
      const low = Math.min(green[channel], bg0[channel])
      const high = Math.max(green[channel], bg0[channel])
      assert.ok(done[channel] >= low - 1 && done[channel] <= high + 1, `${variant}.rowDone.${channel} is off the bg_green→bg0 line`)
    }
    if (strength !== 'soft') {
      assert.equal(roles[variant].rowDone.toLowerCase(), palette.ramp.bgGreen.toLowerCase(), `${variant}.rowDone`)
    }

    const warn = roles[variant].rowWarn
    const fill = hexToRgb(warn)
    const yellow = hexToRgb(palette.ramp.bgYellow)
    const accent = hexToRgb(palette.fg.yellow)
    if (scheme === 'dark') {
      // Dark waiting rows invert: bright amber (`fg.yellow` pulled toward the
      // deep canvas `bgDim`) carrying the deep contrast ink. They stay on the
      // fg.yellow→bgDim line and must keep that ink >= 4.5:1.
      const bgDim = hexToRgb(palette.ramp.bgDim)
      for (const channel of ['r', 'g', 'b']) {
        const low = Math.min(accent[channel], bgDim[channel])
        const high = Math.max(accent[channel], bgDim[channel])
        assert.ok(
          fill[channel] >= low - 1 && fill[channel] <= high + 1,
          `${variant}.rowWarn.${channel} is off the fg.yellow→bgDim line`
        )
      }
      for (const role of ['rowWarn', 'rowWarnHover']) {
        assert.ok(
          contrastRatio(inverted, roles[variant][role]) >= 4.5,
          `${variant}.${role} must keep the inverted ink >= 4.5:1`
        )
      }
      // The palette dark yellow cannot carry the light ink, which is why the
      // dark variants invert instead of reusing it.
      assert.ok(contrastRatio(label, warn) < 4.5, `${variant}.rowWarn should need the inverted ink`)
      assert.ok(Math.abs(labLightness(warn) - labLightness(sidebar)) >= WARN_SEPARATION, `${variant}.rowWarn should be clearly lighter than the sidebar`)
      continue
    }

    // Light: `bg_yellow` deepened toward `fg.yellow` until the visibility floor
    // is met, stopping where the 4.5:1 `label-primary` gate runs out
    // (light·medium / light·soft stop early, light·soft keeps the hue only).
    assert.ok(contrastRatio(label, warn) >= 4.5, `${variant}.rowWarn must keep label-primary >= 4.5:1`)
    for (const channel of ['r', 'g', 'b']) {
      const values = [yellow[channel], bg0[channel], accent[channel]]
      assert.ok(
        fill[channel] >= Math.min(...values) - 1 && fill[channel] <= Math.max(...values) + 1,
        `${variant}.rowWarn.${channel} is off the bg_yellow→bg0 / fg.yellow line`
      )
    }
    const distance = Math.abs(labLightness(warn) - labLightness(sidebar))
    if (distance < WARN_SEPARATION) {
      // The text gate stopped the deepening: one more 1% step must break it.
      const next = hexToRgb(warn)
      const step = 0.01
      const channels = ['r', 'g', 'b'].map((channel) => Math.round(next[channel] + (accent[channel] - next[channel]) * step))
      const candidate = `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`
      assert.ok(
        contrastRatio(label, candidate) < 4.5,
        `${variant}.rowWarn could still be deepened without hurting legibility (${candidate})`
      )
    }
  }
})

test('session-row fills keep the warm / green direction', () => {
  const roles = colorModeRoles()
  for (const variant of VARIANT_NAMES) {
    const warn = hexToRgb(roles[variant].rowWarn)
    const done = hexToRgb(roles[variant].rowDone)
    // The light `bg_green` fill is a pale yellow-green where red and green are
    // two channels apart; the dark fills are the ones that must clearly lean
    // green rather than neutral (2026-10-24 restyle contract).
    if (variant.startsWith('dark')) {
      assert.ok(done.g - done.r >= 8, `${variant}.rowDone must lean green (${roles[variant].rowDone})`)
      // The dark waiting row is a bright amber: a clear red > green > blue
      // ramp, not the old olive or the red it replaced.
      assert.ok(warn.r > warn.g && warn.g > warn.b, `${variant}.rowWarn must be an amber ramp (${roles[variant].rowWarn})`)
      assert.ok(warn.r - warn.b >= 30, `${variant}.rowWarn must read as yellow (${roles[variant].rowWarn})`)
    }
    // Yellow family: red and green both well above blue.
    assert.ok(Math.min(warn.r, warn.g) - warn.b >= 8, `${variant}.rowWarn must lean yellow (${roles[variant].rowWarn})`)
    assert.ok(warn.g > warn.b, `${variant}.rowWarn must not read as red (${roles[variant].rowWarn})`)
  }
})

test('colorModeDataset maps both strengths and the always-on scope anchor', () => {
  for (const light of STRENGTHS) {
    for (const dark of STRENGTHS) {
      assert.deepEqual(colorModeDataset({ light, dark }), {
        'data-everforest-color-mode': 'on',
        'data-everforest-light': light,
        'data-everforest-dark': dark
      })
    }
  }
  // Color mode is a shipped default with no switch: even a stale state object
  // still carrying the retired flag maps to the same always-on anchor.
  assert.equal(colorModeDataset({ light: 'hard', dark: 'soft', colorMode: false })[COLOR_MODE_ATTRS.mode], 'on')
  assert.equal(colorModeDataset({ light: 'hard', dark: 'soft' })[COLOR_MODE_ATTRS.mode], 'on')
})

test('colorModeStyles defines one complete custom-property block per variant', () => {
  const roles = colorModeRoles()
  const rules = styleRules(colorModeStyles())
  // The variant blocks are the only rules that define the role custom properties
  // (the dark waiting-row ink rules also mention `body`, so key on the variables).
  const blocks = rules.filter((rule) => declarationsOf(rule.body).has('--everforest-color-h1'))
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
  // Each hover fill comes after its base fill, or the base would win.
  const selectors = rules.map((rule) => rule.selector)
  for (const [state, hoverRole] of [['warning', 'warn'], ['done', 'done']]) {
    const base = `${SESSION_ROW}:has([data-state="${state}"]):not([aria-selected="true"])`
    const hover = `${SESSION_ROW}:has([data-state="${state}"]):not([aria-selected="true"]):hover`
    assert.ok(selectors.indexOf(hover) > selectors.indexOf(base), `${state}: hover rule must follow the base rule`)
    assert.ok(hoverRole.length > 0)
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

test('colorModeStyles re-boxes the wide-table scroller into a fixed viewport', () => {
  const rules = styleRules(colorModeStyles())
  const wideRules = rules.filter((rule) => rule.selector.includes('.md-table-wide'))
  const rebox = wideRules.find((rule) => rule.selector === `${TABLE_FRAME}.md-table-wide`)
  assert.ok(rebox, 'expected the wide-table scroll-wrapper rule')
  const declarations = declarationsOf(rebox.body)
  // DSH's bleed wrapper starts at the transcript's left edge and pads the table
  // back to the text column; the wrapper is also the scroll container, so the
  // hover scrollbar used to start left of the table frame (2026-10-27 report).
  // The re-box moves the wrapper onto the table: no margin / padding, the text
  // column as the width bound (2026-10-27 report: the table ran past the text
  // column's right edge), and an `overflow-x: auto` viewport whose scrollbar is
  // always shown when the table is wider (2026-10-28 report: keep the columns at
  // their natural widths and scroll, Element-table style, instead of wrapping).
  assert.equal(declarations.get('width'), 'max-content')
  assert.equal(declarations.get('max-width'), '100%')
  assert.equal(declarations.get('margin-left'), '0')
  assert.equal(declarations.get('padding-left'), '0')
  assert.equal(declarations.get('overflow-x'), 'auto')
  assert.equal(declarations.get('padding-bottom'), '0')
  // No other *wrapper* rule may touch these properties: a width / margin /
  // padding override without the matching re-box shifts the wrapper or clips
  // the table (2026-10-27 misalignment report). The `> table` rule is exempt:
  // it sizes the table, not the wrapper.
  for (const rule of wideRules) {
    if (rule === rebox || rule.selector.endsWith('> table')) continue
    for (const property of ['width', 'max-width', 'margin-left', 'padding-left', 'overflow-x']) {
      assert.equal(declarationsOf(rule.body).has(property), false, `${rule.selector} overrides DSH's ${property}`)
    }
  }
  // Fill tables (< 4 columns, blockquote tables) keep DSH's in-column wrapper.
  for (const rule of rules) {
    if (!rule.selector.includes(':not(.md-table-wide)')) continue
    for (const property of ['width', 'max-width', 'margin-left', 'padding-left', 'overflow-x']) {
      assert.equal(declarationsOf(rule.body).has(property), false, `${rule.selector} moves DSH's fill wrapper`)
    }
  }
  const frame = wideRules.find((rule) => rule.selector.endsWith('.md-table-wide > table'))
  assert.ok(frame, 'wide tables must take the frame on the table itself')
  const frameDeclarations = declarationsOf(frame.body)
  assert.equal(frameDeclarations.get('border'), '.5px solid var(--dsw-alias-border-l3)')
  // The columns keep DSH's natural widths: neither the table nor its cells may
  // be clamped or shrunk, or the wrapper would wrap instead of scroll.
  assert.equal(frameDeclarations.has('max-width'), false, 'the table must keep its max-content width')
  for (const rule of rules) {
    if (!rule.selector.includes('.md-table-wide')) continue
    assert.equal(declarationsOf(rule.body).has('min-width'), false, `${rule.selector} overrides DSH's cell floor`)
  }
})

test('colorModeStyles reserves a 10px table scrollbar track for a 5px inset pill', () => {
  const rules = styleRules(colorModeStyles())
  // 2026-10-29 request: the table's horizontal scrollbar should get thicker on
  // hover so it is easier to grab. The track is a constant 10px (double DSH's
  // 5px), the thumb paints only the top 5px of it at rest — the same pill DSH
  // paints, right under the table — and the inset is a custom property so
  // `src/table-scrollbar.js` can animate the growth to 10px. Chromium never runs
  // CSS transitions on scrollbar pseudo-elements, so no `:hover` rule lives in
  // this stylesheet; the module (and its tests) own the transition.
  const track = findRule(rules, `${TABLE_FRAME}::-webkit-scrollbar`, 'height')
  assert.ok(track, 'expected the table scrollbar track rule')
  assert.equal(declarationsOf(track.body).get('height'), '10px')
  const thumb = findRule(rules, `${TABLE_FRAME}::-webkit-scrollbar-thumb`, 'border-bottom')
  assert.ok(thumb, 'expected the table scrollbar thumb rule')
  assert.equal(
    declarationsOf(thumb.body).get('border-bottom'),
    'var(--everforest-table-scrollbar-inset, 5px) solid transparent',
    'the inset that keeps the pill thin and lets the module animate it'
  )
  assert.equal(declarationsOf(thumb.body).get('border-top'), '0')
  assert.equal(declarationsOf(thumb.body).get('background-clip'), 'content-box', 'the inset is transparent, not painted over')
  // Nothing else may style these scrollbar parts: an unscoped or conflicting
  // `::-webkit-scrollbar` rule would move every scrollbar in the app.
  const scrollbarRules = rules.filter((rule) => rule.selector.includes('::-webkit-scrollbar'))
  assert.deepEqual(
    scrollbarRules.map((rule) => rule.selector).sort(),
    [
      `${TABLE_FRAME}::-webkit-scrollbar`,
      `${TABLE_FRAME}::-webkit-scrollbar-thumb`
    ].sort()
  )
  assert.equal(
    rules.some((rule) => rule.selector.includes('::-webkit-scrollbar') && rule.selector.includes(':hover')),
    false,
    'the hover state is animated from JS, not switched by a CSS :hover rule'
  )
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
      // Every reference counts, including the ones nested in `color-mix()` or a
      // shorthand — otherwise a typo inside a composite value would ship.
      for (const usage of value.matchAll(/var\((--[a-z0-9-]+)/g)) {
        assert.ok(
          declared.has(usage[1]) || ALLOWED_EXTERNAL_VARIABLES.has(usage[1]),
          `undeclared variable ${usage[1]} in ${rule.selector}`
        )
      }
    }
  }
})
