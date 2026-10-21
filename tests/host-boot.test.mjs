/**
 * Host-half tests: the first-paint palette row.
 *
 * The Host half contributes one structured `webserver/index-inject` row (a body
 * script) that repaints DSH's pre-Client boot HTML with the current Everforest
 * palette. These tests pin the row shape and, more importantly, the invariant
 * that the script's embedded values are exactly the Client token layer's values
 * for the same variant — a drift between the two would flash one palette and
 * then switch to another.
 *
 * The script itself is executed in a `node:vm` sandbox with a minimal fake DOM,
 * the same realm trick tests/integration.test.mjs uses for `client.js`.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'

import { BOOT_TOKENS, createBootScript, apply } from '../index.js'
import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from '../src/state.js'
import { tokensFor } from '../src/tokens.js'

/**
 * Run the generated boot script against a fake document.
 *
 * @param {object} [options]
 * @param {boolean} [options.dark] - `body[data-ds-dark-theme]` (ui-theme resolved the scheme).
 * @param {string | null} [options.source] - `html[data-ds-theme-source]`; `null` means ui-theme's row did not run.
 * @param {string | null} [options.stored] - raw localStorage payload.
 * @param {boolean} [options.osDark] - `matchMedia('(prefers-color-scheme: dark)')`.
 * @param {boolean} [options.storageThrows] - make localStorage.getItem throw (sandboxed storage).
 * @param {boolean} [options.missingBody] - document.body is null (head-only execution).
 * @returns {Map<string, string>} properties written through `body.style.setProperty`.
 */
function runBootScript ({ dark = false, source = null, stored = null, osDark = false, storageThrows = false, missingBody = false } = {}) {
  const written = new Map()
  const body = missingBody ? null : {
    hasAttribute: (name) => name === 'data-ds-dark-theme' ? dark : false,
    style: {
      setProperty: (name, value) => {
        written.set(name, value)
      },
    },
  }
  const document = {
    body,
    documentElement: {
      getAttribute: (name) => name === 'data-ds-theme-source' ? source : null,
    },
  }
  const localStorage = {
    getItem: (key) => {
      assert.equal(key, STORAGE_KEY, 'boot script reads the versioned storage key')
      if (storageThrows) throw new Error('storage is blocked')
      return stored
    },
  }
  const sandbox = { document, localStorage, matchMedia: () => ({ matches: osDark }) }
  vm.runInNewContext(createBootScript(), sandbox, { filename: 'dsh-everforest-boot.js' })
  return written
}

/** Expected boot values for one variant, straight from the Client token layer. */
function expectedBootValues (scheme, strength) {
  const overlay = tokensFor({ light: strength, dark: strength })
  return Object.fromEntries(BOOT_TOKENS.map((name) => [name, overlay[name][scheme]]))
}

/** Assert a run wrote exactly the expected boot subset for one variant. */
function assertPalette (written, scheme, strength, label) {
  const expected = expectedBootValues(scheme, strength)
  assert.deepEqual([...written.keys()], [...BOOT_TOKENS], `${label}: unexpected token set`)
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(written.get(name), value, `${label}: ${name} does not match the Client layer`)
  }
}

test('apply() contributes exactly one body script row', () => {
  const listeners = []
  const ctx = {
    on: (event, listener) => {
      assert.equal(event, 'webserver/index-inject')
      listeners.push(listener)
      return () => {}
    },
  }
  apply(ctx)
  assert.equal(listeners.length, 1, 'the Host half must subscribe once')

  const table = []
  listeners[0](table)
  assert.equal(table.length, 1, 'the Host half must add exactly one row')
  const [row] = table
  assert.equal(row.kind, 'script')
  assert.equal(row.placement, 'body', 'the row must run after <body> exists and before the deferred Client script')
  assert.equal(typeof row.text, 'string')
  assert.ok(row.text.length > 500)

  // Rows cross IPC on Desktop and are rendered into HTML on Web: they must be
  // plain JSON data and must never terminate the surrounding <script> element.
  assert.deepEqual(JSON.parse(JSON.stringify(row)), { kind: 'script', placement: 'body', text: row.text })
  assert.doesNotMatch(row.text, /<\/script/i)
  assert.doesNotMatch(row.text, /<!--|<style|!important/i, 'inline body properties must not be frozen by !important CSS')
})

test('the row is appended for every index-inject emit (fresh table each time)', () => {
  const listeners = []
  apply({ on: (_event, listener) => listeners.push(listener) })
  const first = []
  const second = []
  listeners[0](first)
  listeners[0](second)
  assert.equal(first.length, 1)
  assert.equal(second.length, 1)
  assert.deepEqual(first[0], second[0])
})

test('boot values equal the Client token layer for all six variants', () => {
  for (const light of STRENGTHS) {
    for (const dark of STRENGTHS) {
      const stored = JSON.stringify({ version: STATE_VERSION, light, dark })
      const lightRun = runBootScript({ source: 'light', dark: false, stored })
      const darkRun = runBootScript({ source: 'dark', dark: true, stored })
      assertPalette(lightRun, 'light', light, `light-${light}`)
      assertPalette(darkRun, 'dark', dark, `dark-${dark}`)
    }
  }
})

test('no stored choice paints the default pairing (dark soft / light hard)', () => {
  assertPalette(runBootScript({ source: 'light', dark: false }), 'light', DEFAULT_STATE.light, 'default light')
  assertPalette(runBootScript({ source: 'system', dark: true }), 'dark', DEFAULT_STATE.dark, 'default dark')
})

test('a fixed Light appearance on a Dark OS still paints Light', () => {
  // ui-theme resolved the preference to light: data-ds-theme-source="light" and
  // no dark attribute. A bare prefers-color-scheme read would paint dark here.
  const written = runBootScript({ source: 'light', dark: false, osDark: true })
  assertPalette(written, 'light', DEFAULT_STATE.light, 'fixed light, dark OS')
})

test('a fixed Dark appearance on a Light OS still paints Dark', () => {
  const written = runBootScript({ source: 'dark', dark: true, osDark: false })
  assertPalette(written, 'dark', DEFAULT_STATE.dark, 'fixed dark, light OS')
})

test('without ui-theme\'s boot row the OS scheme is the fallback', () => {
  assertPalette(runBootScript({ source: null, osDark: true }), 'dark', DEFAULT_STATE.dark, 'no ui-theme, dark OS')
  assertPalette(runBootScript({ source: null, osDark: false }), 'light', DEFAULT_STATE.light, 'no ui-theme, light OS')
})

test('malformed, unknown-version and invalid payloads fall back to the defaults', () => {
  const cases = [
    ['{oops', 'malformed JSON'],
    [JSON.stringify([1, 2, 3]), 'array payload'],
    [JSON.stringify({ version: 99, light: 'soft', dark: 'hard' }), 'unknown version'],
    [JSON.stringify({ version: STATE_VERSION, light: 'nope', dark: 'hard' }), 'invalid light strength'],
    ['null', 'JSON null'],
  ]
  for (const [stored, label] of cases) {
    assertPalette(runBootScript({ source: 'light', stored }), 'light', DEFAULT_STATE.light, label)
  }

  // One valid field survives while the other falls back: a bad dark strength
  // must not discard the valid light choice (the Client normalizer behaves the
  // same way), so this run keeps light-soft instead of the default light-hard.
  const partial = runBootScript({ source: 'light', stored: JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'nope' }) })
  assertPalette(partial, 'light', 'soft', 'valid light field kept')
  const darkPartial = runBootScript({ source: 'dark', dark: true, stored: JSON.stringify({ version: STATE_VERSION, light: 'nope', dark: 'hard' }) })
  assertPalette(darkPartial, 'dark', 'hard', 'valid dark field kept')
})

test('blocked or missing storage never breaks the boot paint', () => {
  assertPalette(runBootScript({ storageThrows: true }), 'light', DEFAULT_STATE.light, 'throwing storage')
  const written = runBootScript({ missingBody: true })
  assert.equal(written.size, 0, 'no body means no paint and no throw')
})

test('the script is idempotent', () => {
  const first = runBootScript({ source: 'dark', dark: true, stored: JSON.stringify({ version: STATE_VERSION, light: 'hard', dark: 'hard' }) })
  const second = runBootScript({ source: 'dark', dark: true, stored: JSON.stringify({ version: STATE_VERSION, light: 'hard', dark: 'hard' }) })
  assert.deepEqual([...first.entries()], [...second.entries()])
})

test('every boot token is also a Client-layer token and every value is a CSS value', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  for (const name of BOOT_TOKENS) {
    assert.match(name, /^--(dsw|shiki)-/, `${name} is outside the token layer`)
    assert.ok(overlay[name], `${name} is not emitted by tokensFor()`)
    assert.equal(typeof overlay[name].light, 'string')
    assert.equal(typeof overlay[name].dark, 'string')
  }

  const written = runBootScript()
  for (const value of written.values()) {
    assert.equal(typeof value, 'string')
    assert.ok(value.trim() !== '', 'empty boot value')
    assert.doesNotMatch(value, /var\(--/, 'boot values must be resolved colours, not token references')
  }
})

test('the boot subset covers the loading spinner ring and progress arc', () => {
  // Installed dsh-web-frontend 0.2.1-rc.2 paints the boot spinner as
  //   ring: border: 2px solid var(--dsw-alias-border-l2, …)
  //   arc:  conic-gradient(var(--dsw-alias-brand-primary, …) …)
  // The fallbacks are literals, so these two alias tokens are what carry the
  // first-paint spinner colour; they must stay in the boot subset.
  const required = ['--dsw-alias-border-l2', '--dsw-alias-brand-primary']
  const written = runBootScript({ source: 'dark', dark: true })
  for (const name of required) {
    assert.ok(BOOT_TOKENS.includes(name), `${name} is not a boot token`)
    assert.equal(typeof written.get(name), 'string')
    assert.ok(written.get(name).trim() !== '', `${name} painted empty`)
  }
})
