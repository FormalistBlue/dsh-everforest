#!/usr/bin/env node
/**
 * Generate `src/palette.js` from the Everforest palette data in this script.
 *
 * The typed data below is a copy of `docs/reference/palette.md` (the project's
 * single source of truth): `tests/palette.test.mjs` parses that document's tables
 * and compares every value with the generated module, so the document, this copy
 * and the generated file cannot drift silently.
 *
 * Data provenance (see docs/reference/palette.md sections 1, 3 and 4):
 * - 6 background ramps + the two foreground / accent color sets: sainnhe/everforest
 *   `palette.md` @ 85a86eb (2026-06-08);
 * - `header-*` colors: Everforest Enchanted `theme.css` @ bdd7ac7 (2026-10-10);
 * - light `bg_visual`: the reference table records the official values, while the
 *   effective value is Enchanted's visibility fix `#DED8DB` (note in section 3).
 *   This script substitutes it for all three light strengths; the upstream change
 *   only targets light-hard, so light-medium / light-soft are a project extrapolation.
 *
 * Usage:
 *   node scripts/palette.mjs           # (re)generate src/palette.js
 *   node scripts/palette.mjs --check   # verify src/palette.js is up to date (exit 1 if not)
 *
 * Zero dependencies, deterministic output, LF line endings, 2-space indent, single
 * quotes, no semicolons. The generated file is committed to the repository and must
 * never be edited by hand.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = join(ROOT_DIR, 'src', 'palette.js')
const OUTPUT_LABEL = relative(ROOT_DIR, OUTPUT_PATH).split('\\').join('/')

const SCHEMES = ['light', 'dark']
const STRENGTHS = ['hard', 'medium', 'soft']
const DEFAULT_STATE = { light: 'hard', dark: 'soft' }

// Documented order (docs/design.md section 1): the three dark variants first, then light.
const VARIANT_NAMES = ['dark', 'light'].flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/** Property order of a `BackgroundRamp` (docs/design.md section 3.1). */
const RAMP_KEYS = [
  'bgDim',
  'bg0',
  'bg1',
  'bg2',
  'bg3',
  'bg4',
  'bg5',
  'bgVisual',
  'bgRed',
  'bgYellow',
  'bgGreen',
  'bgBlue',
  'bgPurple'
]

/** Property order of a `Foreground` (docs/design.md section 3.1). */
const FOREGROUND_KEYS = [
  'fg',
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'grey0',
  'grey1',
  'grey2',
  'headerRed',
  'headerOrange',
  'headerYellow',
  'headerGreen',
  'headerAqua',
  'headerBlue',
  'headerPurple'
]

/**
 * Official light `bg_visual` values as recorded in the docs/reference/palette.md
 * table. They are kept here only for traceability; the generated module uses the
 * effective value `#DED8DB` instead (see EFFECTIVE_LIGHT_BG_VISUAL).
 */
const OFFICIAL_LIGHT_BG_VISUAL = {
  hard: '#F0F2D4',
  medium: '#EAEDC8',
  soft: '#E1E4BD'
}

/** @type {Record<'light' | 'dark', Record<'hard' | 'medium' | 'soft', Record<string, string>>>} */
const RAMPS = {
  dark: {
    hard: {
      bgDim: '#1E2326',
      bg0: '#272E33',
      bg1: '#2E383C',
      bg2: '#374145',
      bg3: '#414B50',
      bg4: '#495156',
      bg5: '#4F5B58',
      bgVisual: '#4C3743',
      bgRed: '#493B40',
      bgYellow: '#45443C',
      bgGreen: '#3C4841',
      bgBlue: '#384B55',
      bgPurple: '#463F48'
    },
    medium: {
      bgDim: '#232A2E',
      bg0: '#2D353B',
      bg1: '#343F44',
      bg2: '#3D484D',
      bg3: '#475258',
      bg4: '#4F585E',
      bg5: '#56635F',
      bgVisual: '#543A48',
      bgRed: '#514045',
      bgYellow: '#4D4C43',
      bgGreen: '#425047',
      bgBlue: '#3A515D',
      bgPurple: '#4A444E'
    },
    soft: {
      bgDim: '#293136',
      bg0: '#333C43',
      bg1: '#3A464C',
      bg2: '#434F55',
      bg3: '#4D5960',
      bg4: '#555F66',
      bg5: '#5D6B66',
      bgVisual: '#5C3F4F',
      bgRed: '#59464C',
      bgYellow: '#55544A',
      bgGreen: '#48584E',
      bgBlue: '#3F5865',
      bgPurple: '#4E4953'
    }
  },
  light: {
    hard: {
      bgDim: '#F2EFDF',
      bg0: '#FFFBEF',
      bg1: '#F8F5E4',
      bg2: '#F2EFDF',
      bg3: '#EDEADA',
      bg4: '#E8E5D5',
      bg5: '#BEC5B2',
      bgVisual: '#F0F2D4',
      bgRed: '#FFE7DE',
      bgYellow: '#FEF2D5',
      bgGreen: '#F3F5D9',
      bgBlue: '#ECF5ED',
      bgPurple: '#FCECED'
    },
    medium: {
      bgDim: '#EFEBD4',
      bg0: '#FDF6E3',
      bg1: '#F4F0D9',
      bg2: '#EFEBD4',
      bg3: '#E6E2CC',
      bg4: '#E0DCC7',
      bg5: '#BDC3AF',
      bgVisual: '#EAEDC8',
      bgRed: '#FDE3DA',
      bgYellow: '#FAEDCD',
      bgGreen: '#F0F1D2',
      bgBlue: '#E9F0E9',
      bgPurple: '#FAE8E2'
    },
    soft: {
      bgDim: '#E5DFC5',
      bg0: '#F3EAD3',
      bg1: '#EAE4CA',
      bg2: '#E5DFC5',
      bg3: '#DDD8BE',
      bg4: '#D8D3BA',
      bg5: '#B9C0AB',
      bgVisual: '#E1E4BD',
      bgRed: '#FADBD0',
      bgYellow: '#F1E4C5',
      bgGreen: '#E5E6C5',
      bgBlue: '#E1E7DD',
      bgPurple: '#F1DDD4'
    }
  }
}

/**
 * Effective light `bg_visual`: Everforest Enchanted's document-selection visibility
 * fix. Upstream applies it to light-hard only; this project extrapolates it to
 * light-medium and light-soft (docs/reference/palette.md section 3 note).
 */
const EFFECTIVE_LIGHT_BG_VISUAL = '#DED8DB'

for (const strength of STRENGTHS) {
  const ramp = RAMPS.light[strength]
  if (ramp.bgVisual !== OFFICIAL_LIGHT_BG_VISUAL[strength]) {
    throw new Error(
      `internal data error: RAMPS.light.${strength}.bgVisual does not match the official reference value`
    )
  }
  ramp.bgVisual = EFFECTIVE_LIGHT_BG_VISUAL
}

/** @type {Record<'light' | 'dark', Record<string, string>>} */
const FOREGROUNDS = {
  dark: {
    fg: '#D3C6AA',
    red: '#E67E80',
    orange: '#E69875',
    yellow: '#DBBC7F',
    green: '#A7C080',
    aqua: '#83C092',
    blue: '#7FBBB3',
    purple: '#D699B6',
    grey0: '#7A8478',
    grey1: '#859289',
    grey2: '#9DA9A0',
    headerRed: '#DA6362',
    headerOrange: '#D77F48',
    headerYellow: '#BF983D',
    headerGreen: '#899C40',
    headerAqua: '#569D79',
    headerBlue: '#5A93A2',
    headerPurple: '#B87B9D'
  },
  light: {
    fg: '#5C6A72',
    red: '#F85552',
    orange: '#F57D26',
    yellow: '#DFA000',
    green: '#8DA101',
    aqua: '#35A77C',
    blue: '#3A94C5',
    purple: '#DF69BA',
    grey0: '#A6B0A0',
    grey1: '#939F91',
    grey2: '#829181',
    headerRed: '#F85552',
    headerOrange: '#F88F44',
    headerYellow: '#F3B931',
    headerGreen: '#ABD113',
    headerAqua: '#569D79',
    headerBlue: '#5A93A2',
    headerPurple: '#DD2B8D'
  }
}

const HEX_PATTERN = /^#[0-9A-F]{6}$/

/**
 * Fail loudly on internal data mistakes (missing keys, wrong key order is not
 * checked, non-`#RRGGBB` values) before anything is written.
 */
function validatePalette () {
  assertKeys(RAMPS, SCHEMES, 'RAMPS')
  for (const scheme of SCHEMES) {
    assertKeys(RAMPS[scheme], STRENGTHS, `RAMPS.${scheme}`)
    for (const strength of STRENGTHS) {
      validateColors(RAMPS[scheme][strength], RAMP_KEYS, `RAMPS.${scheme}.${strength}`)
    }
  }
  assertKeys(FOREGROUNDS, SCHEMES, 'FOREGROUNDS')
  for (const scheme of SCHEMES) {
    validateColors(FOREGROUNDS[scheme], FOREGROUND_KEYS, `FOREGROUNDS.${scheme}`)
  }
  for (const scheme of SCHEMES) {
    if (!STRENGTHS.includes(DEFAULT_STATE[scheme])) {
      throw new Error(`internal data error: DEFAULT_STATE.${scheme} is not a known strength`)
    }
  }
  if (new Set(VARIANT_NAMES).size !== SCHEMES.length * STRENGTHS.length) {
    throw new Error('internal data error: VARIANT_NAMES must contain six unique names')
  }
}

function assertKeys (object, expectedKeys, label) {
  if (object === null || typeof object !== 'object') {
    throw new Error(`${label} must be an object`)
  }
  const actualKeys = Object.keys(object)
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key))
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key))
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} has the wrong keys (missing: ${missing.join(', ') || 'none'}; unexpected: ${
        unexpected.join(', ') || 'none'
      })`
    )
  }
}

function validateColors (colors, expectedKeys, label) {
  assertKeys(colors, expectedKeys, label)
  for (const key of expectedKeys) {
    if (!HEX_PATTERN.test(colors[key])) {
      throw new Error(`${label}.${key} is not a #RRGGBB color: ${String(colors[key])}`)
    }
  }
}

const TYPEDEFS_SOURCE = `/**
 * One background color ramp (13 \`#RRGGBB\` colors).
 * @typedef {object} BackgroundRamp
 * @property {string} bgDim
 * @property {string} bg0
 * @property {string} bg1
 * @property {string} bg2
 * @property {string} bg3
 * @property {string} bg4
 * @property {string} bg5
 * @property {string} bgVisual
 * @property {string} bgRed
 * @property {string} bgYellow
 * @property {string} bgGreen
 * @property {string} bgBlue
 * @property {string} bgPurple
 */

/**
 * Foreground, accent and header colors (18 \`#RRGGBB\` colors) shared by the three
 * strengths of one scheme.
 * @typedef {object} Foreground
 * @property {string} fg
 * @property {string} red
 * @property {string} orange
 * @property {string} yellow
 * @property {string} green
 * @property {string} aqua
 * @property {string} blue
 * @property {string} purple
 * @property {string} grey0
 * @property {string} grey1
 * @property {string} grey2
 * @property {string} headerRed
 * @property {string} headerOrange
 * @property {string} headerYellow
 * @property {string} headerGreen
 * @property {string} headerAqua
 * @property {string} headerBlue
 * @property {string} headerPurple
 */`

const DATA_HELPER_SOURCE = `/** Recursively freeze the palette data so consumers cannot mutate it. */
function freezePaletteData (value) {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      freezePaletteData(value[key])
    }
    return Object.freeze(value)
  }
  return value
}`

const LOOKUP_HELPERS_SOURCE = `/**
 * Look up the background ramp for a scheme and strength.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {BackgroundRamp}
 */
export function rampFor (scheme, strength) {
  const schemeRamps = RAMPS[scheme]
  if (!schemeRamps) {
    throw new TypeError(\`rampFor: unknown scheme '\${scheme}' (expected \${SCHEMES.join(' | ')})\`)
  }
  const ramp = schemeRamps[strength]
  if (!ramp) {
    throw new TypeError(
      \`rampFor: unknown strength '\${strength}' for scheme '\${scheme}' (expected \${STRENGTHS.join(' | ')})\`
    )
  }
  return ramp
}

/**
 * Look up the foreground / accent / header colors shared by a scheme.
 * @param {'light' | 'dark'} scheme
 * @returns {Foreground}
 */
export function foregroundFor (scheme) {
  const foreground = FOREGROUNDS[scheme]
  if (!foreground) {
    throw new TypeError(\`foregroundFor: unknown scheme '\${scheme}' (expected \${SCHEMES.join(' | ')})\`)
  }
  return foreground
}

/**
 * Resolve the palette for both schemes from a user state.
 * @param {{ light: 'hard' | 'medium' | 'soft', dark: 'hard' | 'medium' | 'soft' }} [state]
 * @returns {{
 *   light: { scheme: 'light', strength: string, ramp: BackgroundRamp, fg: Foreground },
 *   dark: { scheme: 'dark', strength: string, ramp: BackgroundRamp, fg: Foreground }
 * }}
 */
export function resolvePalette (state = DEFAULT_STATE) {
  if (state === null || typeof state !== 'object') {
    throw new TypeError('resolvePalette: state must be an object with light and dark strengths')
  }
  const lightStrength = state.light
  const darkStrength = state.dark
  return {
    light: {
      scheme: 'light',
      strength: lightStrength,
      ramp: rampFor('light', lightStrength),
      fg: foregroundFor('light')
    },
    dark: {
      scheme: 'dark',
      strength: darkStrength,
      ramp: rampFor('dark', darkStrength),
      fg: foregroundFor('dark')
    }
  }
}`

function formatKey (key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `'${key}'`
}

function formatValue (value, depth) {
  if (typeof value === 'string') {
    return `'${value}'`
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatValue(item, depth)).join(', ')}]`
  }
  if (value !== null && typeof value === 'object') {
    const keyPad = '  '.repeat(depth + 1)
    const closePad = '  '.repeat(depth)
    const entries = Object.entries(value).map(
      ([key, item]) => `${keyPad}${formatKey(key)}: ${formatValue(item, depth + 1)}`
    )
    return `{\n${entries.join(',\n')}\n${closePad}}`
  }
  throw new Error(`cannot serialize palette value: ${String(value)}`)
}

function formatArrayEntries (values, indentation) {
  return values.map((value) => `${indentation}${formatValue(value, 0)}`).join(',\n')
}

function generateSource () {
  const lines = [
    '// AUTO-GENERATED by scripts/palette.mjs. Do not edit this file by hand.',
    '//',
    '// Source of truth: docs/reference/palette.md, which records the upstream data:',
    '// - sainnhe/everforest palette.md @ 85a86eb (2026-06-08): the 6 background ramps',
    '//   and the two foreground / accent color sets;',
    '// - Everforest Enchanted theme.css @ bdd7ac7 (2026-10-10): the default pairing,',
    '//   the header-* colors and the light document-selection fix.',
    '//',
    '// Effective-value note (docs/reference/palette.md section 3): the reference table',
    '// keeps the official light bg_visual values, but all three light strengths use',
    '// #DED8DB here (Enchanted visibility fix; medium / soft extrapolated by this project).',
    '//',
    '// Regenerate: node scripts/palette.mjs',
    '// Verify:     node scripts/palette.mjs --check',
    '',
    TYPEDEFS_SOURCE,
    '',
    '/** Scheme names: light / dark are the DSH color schemes. */',
    `export const SCHEMES = ${formatValue(SCHEMES, 0)}`,
    '',
    '/** Contrast strengths, ordered from the strongest (hard) to the softest (soft). */',
    `export const STRENGTHS = ${formatValue(STRENGTHS, 0)}`,
    '',
    '/** Default pairing aligned with Everforest Enchanted: dark = soft, light = hard. */',
    `export const DEFAULT_STATE = Object.freeze(${formatValue(DEFAULT_STATE, 0)})`,
    '',
    '/** All six variants, named `<scheme>-<strength>` (the three dark variants first). */',
    'export const VARIANT_NAMES = [',
    formatArrayEntries(VARIANT_NAMES, '  '),
    ']',
    '',
    DATA_HELPER_SOURCE,
    '',
    '/**',
    ' * Background ramps: `RAMPS[scheme][strength]`, 13 colors each.',
    ' * `bgDim` is the deeper code-block surface, `bg0` the main background,',
    ' * `bg1` / `bg2` / `bg3` the layered surfaces, `bg4` hover, `bg5` border, and',
    ' * `bgVisual` / `bgRed` / `bgYellow` / `bgGreen` / `bgBlue` / `bgPurple` the',
    ' * selection, diff and highlight tints.',
    ' */',
    `export const RAMPS = freezePaletteData(${formatValue(RAMPS, 0)})`,
    '',
    '/** Foreground, accent and header colors shared by the three strengths of a scheme. */',
    `export const FOREGROUNDS = freezePaletteData(${formatValue(FOREGROUNDS, 0)})`,
    '',
    LOOKUP_HELPERS_SOURCE
  ]
  return `${lines.join('\n')}\n`
}

function findFirstDifference (actual, expected) {
  const actualLines = actual.split('\n')
  const expectedLines = expected.split('\n')
  const lineCount = Math.max(actualLines.length, expectedLines.length)
  for (let index = 0; index < lineCount; index += 1) {
    if (actualLines[index] !== expectedLines[index]) {
      return {
        line: index + 1,
        actual: actualLines[index] === undefined ? '<end of file>' : actualLines[index],
        expected: expectedLines[index] === undefined ? '<end of file>' : expectedLines[index]
      }
    }
  }
  return null
}

function checkGeneratedFile (expected) {
  let actual
  try {
    actual = readFileSync(OUTPUT_PATH, 'utf8')
  } catch (error) {
    console.error(`palette: cannot read ${OUTPUT_LABEL} (${error.code ?? error.message})`)
    return false
  }
  if (actual === expected) {
    console.log(`${OUTPUT_LABEL} is up to date`)
    return true
  }
  const difference = findFirstDifference(actual, expected)
  console.error(`${OUTPUT_LABEL} is stale; run "node scripts/palette.mjs" to regenerate it.`)
  if (difference) {
    console.error(`palette: first difference at line ${difference.line}:`)
    console.error(`  expected: ${difference.expected}`)
    console.error(`  actual:   ${difference.actual}`)
  }
  return false
}

function main () {
  const rawArgs = process.argv.slice(2)
  const unknownArgs = rawArgs.filter((arg) => arg !== '--check')
  if (unknownArgs.length > 0) {
    console.error(`palette: unknown argument(s): ${unknownArgs.join(' ')}`)
    console.error('usage: node scripts/palette.mjs [--check]')
    process.exitCode = 1
    return
  }
  const checkOnly = rawArgs.includes('--check')

  validatePalette()
  const source = generateSource()

  if (checkOnly) {
    if (!checkGeneratedFile(source)) {
      process.exitCode = 1
    }
    return
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, source, 'utf8')
  console.log(`generated ${OUTPUT_LABEL} (${source.split('\n').length - 1} lines)`)
}

main()
