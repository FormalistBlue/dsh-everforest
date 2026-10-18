// Expected palette values are pinned here independently of src/palette.js:
// they are transcribed from docs/reference/palette.md (the single source of truth),
// so any accidental manual edit of the generated module is caught.
//
// The light ramps below use the *effective* bgVisual #DED8DB, not the official
// values kept in the reference table (see the section 3 note in palette.md).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_STATE,
  FOREGROUNDS,
  RAMPS,
  SCHEMES,
  STRENGTHS,
  VARIANT_NAMES,
  foregroundFor,
  rampFor,
  resolvePalette
} from '../src/palette.js'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = join(ROOT_DIR, 'scripts', 'palette.mjs')
const OUTPUT_PATH = join(ROOT_DIR, 'src', 'palette.js')

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

/** Background ramps from docs/reference/palette.md section 3 (light bgVisual = effective value). */
const EXPECTED_RAMPS = {
  dark: {
    hard: ['#1E2326', '#272E33', '#2E383C', '#374145', '#414B50', '#495156', '#4F5B58', '#4C3743', '#493B40', '#45443C', '#3C4841', '#384B55', '#463F48'],
    medium: ['#232A2E', '#2D353B', '#343F44', '#3D484D', '#475258', '#4F585E', '#56635F', '#543A48', '#514045', '#4D4C43', '#425047', '#3A515D', '#4A444E'],
    soft: ['#293136', '#333C43', '#3A464C', '#434F55', '#4D5960', '#555F66', '#5D6B66', '#5C3F4F', '#59464C', '#55544A', '#48584E', '#3F5865', '#4E4953']
  },
  light: {
    hard: ['#F2EFDF', '#FFFBEF', '#F8F5E4', '#F2EFDF', '#EDEADA', '#E8E5D5', '#BEC5B2', '#DED8DB', '#FFE7DE', '#FEF2D5', '#F3F5D9', '#ECF5ED', '#FCECED'],
    medium: ['#EFEBD4', '#FDF6E3', '#F4F0D9', '#EFEBD4', '#E6E2CC', '#E0DCC7', '#BDC3AF', '#DED8DB', '#FDE3DA', '#FAEDCD', '#F0F1D2', '#E9F0E9', '#FAE8E2'],
    soft: ['#E5DFC5', '#F3EAD3', '#EAE4CA', '#E5DFC5', '#DDD8BE', '#D8D3BA', '#B9C0AB', '#DED8DB', '#FADBD0', '#F1E4C5', '#E5E6C5', '#E1E7DD', '#F1DDD4']
  }
}

/** Foreground / accent / header colors from docs/reference/palette.md section 4. */
const EXPECTED_FOREGROUNDS = {
  dark: ['#D3C6AA', '#E67E80', '#E69875', '#DBBC7F', '#A7C080', '#83C092', '#7FBBB3', '#D699B6', '#7A8478', '#859289', '#9DA9A0', '#DA6362', '#D77F48', '#BF983D', '#899C40', '#569D79', '#5A93A2', '#B87B9D'],
  light: ['#5C6A72', '#F85552', '#F57D26', '#DFA000', '#8DA101', '#35A77C', '#3A94C5', '#DF69BA', '#A6B0A0', '#939F91', '#829181', '#F85552', '#F88F44', '#F3B931', '#ABD113', '#569D79', '#5A93A2', '#DD2B8D']
}

const HEX_PATTERN = /^#[0-9A-F]{6}$/

function toColorObject (keys, values, label) {
  assert.equal(values.length, keys.length, `${label}: expected ${keys.length} colors`)
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]))
}

test('exports the documented constants and default pairing', () => {
  assert.deepEqual(STRENGTHS, ['hard', 'medium', 'soft'])
  assert.deepEqual(SCHEMES, ['light', 'dark'])
  assert.deepEqual(VARIANT_NAMES, [
    'dark-hard',
    'dark-medium',
    'dark-soft',
    'light-hard',
    'light-medium',
    'light-soft'
  ])
  assert.deepEqual(DEFAULT_STATE, { light: 'hard', dark: 'soft' })
  assert.ok(Object.isFrozen(DEFAULT_STATE), 'DEFAULT_STATE must be frozen')
})

test('RAMPS matches all 6 background ramps of docs/reference/palette.md', () => {
  assert.deepEqual(Object.keys(RAMPS).sort(), [...SCHEMES].sort())
  for (const scheme of SCHEMES) {
    assert.deepEqual(Object.keys(RAMPS[scheme]).sort(), [...STRENGTHS].sort())
    for (const strength of STRENGTHS) {
      const label = `${scheme}-${strength}`
      const expected = toColorObject(RAMP_KEYS, EXPECTED_RAMPS[scheme][strength], label)
      const actual = RAMPS[scheme][strength]
      for (const [key, value] of Object.entries(actual)) {
        assert.match(value, HEX_PATTERN, `${label}.${key} must be #RRGGBB`)
      }
      assert.deepEqual(actual, expected, `${label} background ramp mismatch`)
    }
  }
})

test('light ramps use the effective bgVisual #DED8DB from the reference note', () => {
  // Official values are kept in the palette.md table only; effective value replaces them.
  const officialLightBgVisual = { hard: '#F0F2D4', medium: '#EAEDC8', soft: '#E1E4BD' }
  for (const strength of STRENGTHS) {
    assert.equal(RAMPS.light[strength].bgVisual, '#DED8DB', `light-${strength}.bgVisual`)
    assert.notEqual(RAMPS.light[strength].bgVisual, officialLightBgVisual[strength])
  }
  assert.deepEqual(
    [RAMPS.dark.hard.bgVisual, RAMPS.dark.medium.bgVisual, RAMPS.dark.soft.bgVisual],
    ['#4C3743', '#543A48', '#5C3F4F'],
    'dark bgVisual values stay on the official palette'
  )
})

test('FOREGROUNDS matches both schemes of docs/reference/palette.md', () => {
  assert.deepEqual(Object.keys(FOREGROUNDS).sort(), [...SCHEMES].sort())
  for (const scheme of SCHEMES) {
    const label = `FOREGROUNDS.${scheme}`
    const actual = FOREGROUNDS[scheme]
    for (const [key, value] of Object.entries(actual)) {
      assert.match(value, HEX_PATTERN, `${label}.${key} must be #RRGGBB`)
    }
    assert.deepEqual(actual, toColorObject(FOREGROUND_KEYS, EXPECTED_FOREGROUNDS[scheme], label), label)
  }
})

test('palette data is deeply frozen', () => {
  assert.ok(Object.isFrozen(RAMPS))
  assert.ok(Object.isFrozen(FOREGROUNDS))
  for (const scheme of SCHEMES) {
    assert.ok(Object.isFrozen(FOREGROUNDS[scheme]), `FOREGROUNDS.${scheme}`)
    for (const strength of STRENGTHS) {
      assert.ok(Object.isFrozen(RAMPS[scheme][strength]), `RAMPS.${scheme}.${strength}`)
    }
  }
})

test('rampFor returns the shared ramp and rejects unknown inputs', () => {
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      assert.equal(rampFor(scheme, strength), RAMPS[scheme][strength])
    }
  }
  assert.throws(() => rampFor('system', 'hard'), { name: 'TypeError' })
  assert.throws(() => rampFor('dark', 'ultra'), { name: 'TypeError' })
})

test('foregroundFor returns the shared colors and rejects unknown schemes', () => {
  assert.equal(foregroundFor('light'), FOREGROUNDS.light)
  assert.equal(foregroundFor('dark'), FOREGROUNDS.dark)
  assert.throws(() => foregroundFor('system'), { name: 'TypeError' })
})

test('resolvePalette resolves both schemes from the selected strengths', () => {
  const palette = resolvePalette({ light: 'soft', dark: 'medium' })
  assert.deepEqual(Object.keys(palette).sort(), ['dark', 'light'])

  assert.equal(palette.light.scheme, 'light')
  assert.equal(palette.light.strength, 'soft')
  assert.equal(palette.light.ramp, RAMPS.light.soft)
  assert.equal(palette.light.fg, FOREGROUNDS.light)

  assert.equal(palette.dark.scheme, 'dark')
  assert.equal(palette.dark.strength, 'medium')
  assert.equal(palette.dark.ramp, RAMPS.dark.medium)
  assert.equal(palette.dark.fg, FOREGROUNDS.dark)

  const defaults = resolvePalette()
  assert.equal(defaults.light.strength, 'hard')
  assert.equal(defaults.light.ramp, RAMPS.light.hard)
  assert.equal(defaults.dark.strength, 'soft')
  assert.equal(defaults.dark.ramp, RAMPS.dark.soft)

  assert.throws(() => resolvePalette(null), { name: 'TypeError' })
  assert.throws(() => resolvePalette({ light: 'hard', dark: 'nope' }), { name: 'TypeError' })
})

test('src/palette.js is the generated file, not a hand-edited one', () => {
  const source = readFileSync(OUTPUT_PATH, 'utf8')
  assert.match(source, /^\/\/ AUTO-GENERATED by scripts\/palette\.mjs\. Do not edit this file by hand\./)
  assert.ok(!source.includes('\r'), 'generated file must use LF line endings')
  assert.ok(source.endsWith('\n'), 'generated file must end with a newline')
})

test('generator reproduces src/palette.js byte for byte and --check passes', () => {  const check = spawnSync(process.execPath, [SCRIPT_PATH, '--check'], { cwd: ROOT_DIR, encoding: 'utf8' })
  assert.equal(check.status, 0, `--check failed:\n${check.stdout}\n${check.stderr}`)

  const tempRoot = mkdtempSync(join(tmpdir(), 'everforest-palette-'))
  try {
    mkdirSync(join(tempRoot, 'scripts'), { recursive: true })
    cpSync(SCRIPT_PATH, join(tempRoot, 'scripts', 'palette.mjs'))
    const generate = spawnSync(process.execPath, [join(tempRoot, 'scripts', 'palette.mjs')], {
      encoding: 'utf8'
    })
    assert.equal(generate.status, 0, `generation failed:\n${generate.stdout}\n${generate.stderr}`)
    const fresh = readFileSync(join(tempRoot, 'src', 'palette.js'), 'utf8')
    assert.equal(fresh, readFileSync(OUTPUT_PATH, 'utf8'), 'checked-in file must equal freshly generated output')
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('--check exits non-zero when src/palette.js is missing or stale', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'everforest-palette-check-'))
  try {
    mkdirSync(join(tempRoot, 'scripts'), { recursive: true })
    cpSync(SCRIPT_PATH, join(tempRoot, 'scripts', 'palette.mjs'))
    const script = join(tempRoot, 'scripts', 'palette.mjs')
    const output = join(tempRoot, 'src', 'palette.js')

    const missing = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' })
    assert.equal(missing.status, 1, '--check must fail when the generated file is missing')
    assert.match(missing.stderr, /cannot read/)

    mkdirSync(join(tempRoot, 'src'), { recursive: true })
    writeFileSync(output, '// hand-edited file\n', 'utf8')
    const stale = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' })
    assert.equal(stale.status, 1, '--check must fail when the generated file is stale')
    assert.match(stale.stderr, /is stale/)
    assert.equal(readFileSync(output, 'utf8'), '// hand-edited file\n', '--check must not write the file')
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

// docs/reference/palette.md claims to be the single source of truth, while
// scripts/palette.mjs carries the typed copy it generates from. This test parses
// the document's markdown tables and compares every value with the generated
// module, so a doc edit cannot silently diverge from the implementation.
test('docs/reference/palette.md tables match the generated palette', () => {
  const docPath = join(ROOT_DIR, 'docs', 'reference', 'palette.md')
  const doc = readFileSync(docPath, 'utf8')
  const foregroundRoles = ['fg', 'red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'grey0', 'grey1', 'grey2']
  const headerRoles = ['header-red', 'header-orange', 'header-yellow', 'header-green', 'header-aqua', 'header-blue', 'header-purple']
  const cellsOf = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim())
  const plain = (cell) => cell.replace(/`/g, '').trim()

  const docRamps = {}
  const docForegrounds = { light: {}, dark: {} }
  const docHeaders = { light: {}, dark: {} }
  let section = ''
  for (const line of doc.split(/\r?\n/)) {
    if (/^#{2,3}\s/.test(line)) {
      section = line
      continue
    }
    if (!line.trim().startsWith('|')) continue
    const cells = cellsOf(line)
    if (cells.length < 2 || cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue

    if (/^##\s*3\.\s*背景色阶/.test(section)) {
      if (cells.length !== 14 || !cells[0].includes('·')) continue
      const variant = cells[0].replace(/\*\*/g, '').replace(/（默认）/g, '').trim()
      const [scheme, strength] = variant.split('·').map((part) => part.trim())
      assert.ok(SCHEMES.includes(scheme), `unknown scheme in palette.md: ${variant}`)
      assert.ok(STRENGTHS.includes(strength), `unknown strength in palette.md: ${variant}`)
      const values = cells.slice(1).map(plain)
      assert.equal(values.length, RAMP_KEYS.length, `unexpected ramp column count for ${variant}`)
      docRamps[`${scheme}-${strength}`] = Object.fromEntries(RAMP_KEYS.map((key, index) => [key, values[index]]))
      continue
    }

    if (/^##\s*4\.\s*前景/.test(section)) {
      if (cells.length !== 3 || !foregroundRoles.includes(cells[0])) continue
      docForegrounds.dark[cells[0]] = plain(cells[1])
      docForegrounds.light[cells[0]] = plain(cells[2])
      continue
    }

    if (/^###\s*Enchanted/.test(section)) {
      if (cells.length !== 3 || !headerRoles.includes(cells[0])) continue
      const key = cells[0].replace(/^header-([a-z]+)$/, (_, name) => `header${name[0].toUpperCase()}${name.slice(1)}`)
      docHeaders.dark[key] = plain(cells[1])
      docHeaders.light[key] = plain(cells[2])
    }
  }

  // The effective-value note (light bg_visual = #DED8DB) must stay in the doc.
  assert.match(doc, /#DED8DB/)

  // palette.md §3 keeps the official bg_visual values in the table (the
  // documented note turns #DED8DB into the effective value for all light
  // strengths), so the document's official cells must be checked too.
  const OFFICIAL_LIGHT_BG_VISUAL = { hard: '#F0F2D4', medium: '#EAEDC8', soft: '#E1E4BD' }

  assert.deepEqual(Object.keys(docRamps).sort(), [...VARIANT_NAMES].sort(), 'palette.md ramp coverage')
  for (const variant of VARIANT_NAMES) {
    const [scheme, strength] = variant.split('-')
    const expected = { ...docRamps[variant] }
    if (scheme === 'light') {
      assert.equal(
        expected.bgVisual,
        OFFICIAL_LIGHT_BG_VISUAL[strength],
        `palette.md official light bg_visual drifted: ${variant}`,
      )
      // Effective value per the section-3 note; the generated module uses it.
      expected.bgVisual = '#DED8DB'
    }
    assert.deepEqual(RAMPS[scheme][variant.split('-')[1]], expected, `palette.md ramp drift: ${variant}`)
  }

  assert.equal(Object.keys(docForegrounds.light).length, foregroundRoles.length, 'palette.md foreground coverage')
  for (const role of foregroundRoles) {
    assert.equal(FOREGROUNDS.light[role], docForegrounds.light[role], `light foreground drift: ${role}`)
    assert.equal(FOREGROUNDS.dark[role], docForegrounds.dark[role], `dark foreground drift: ${role}`)
  }

  const headerKeys = headerRoles
    .map((role) => role.replace(/^header-([a-z]+)$/, (_, name) => `header${name[0].toUpperCase()}${name.slice(1)}`))
    .sort()
  assert.deepEqual(Object.keys(docHeaders.light).sort(), headerKeys, 'palette.md header coverage')
  for (const key of headerKeys) {
    assert.equal(FOREGROUNDS.light[key], docHeaders.light[key], `light header drift: ${key}`)
    assert.equal(FOREGROUNDS.dark[key], docHeaders.dark[key], `dark header drift: ${key}`)
  }
})
