/**
 * Host-half tests: the durable `Config` and the first-paint palette row.
 *
 * The Host half contributes one structured `webserver/index-inject` row (a body
 * script) that repaints DSH's pre-Client boot HTML with the current Everforest
 * palette. These tests pin the row shape and, more importantly, the invariant
 * that the script's embedded values are exactly the Client token layer's values
 * for the same variant — a drift between the two would flash one palette and
 * then switch to another.
 *
 * Since 0.3.0 the row's fallback pair comes from the Host-backed `Config`
 * (`settings.describe()` projects its volatile fields into the form the Client
 * edits), while the browser's `localStorage` payload is the fresher cache and
 * therefore wins. Since 0.4.0 `Config` also carries the volatile
 * `colorMode` flag, but the boot row deliberately ignores it: the first paint
 * is token-only and the color-mode CSS belongs to the Client half. Both
 * directions and the published `window.__EVERFOREST_BOOT__` hint are covered
 * here.
 *
 * The script itself is executed in a `node:vm` sandbox with a minimal fake DOM,
 * the same realm trick tests/integration.test.mjs uses for `client.js`.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'

import { BOOT_TOKENS, Config, ENTRY_ID, apply, createBootScript } from '../index.js'
import { hostState } from '../src/host-config.js'
import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from '../src/state.js'
import { tokensFor } from '../src/tokens.js'

const BOOT_HINT = '__EVERFOREST_BOOT__'

/**
 * Run a generated boot script against a fake document.
 *
 * @param {object} [options]
 * @param {string} [options.text] - pre-generated script text; built from `host` when absent.
 * @param {{ light: string, dark: string }} [options.host] - Host-backed fallback pair.
 * @param {boolean} [options.dark] - `body[data-ds-dark-theme]` (ui-theme resolved the scheme).
 * @param {string | null} [options.source] - `html[data-ds-theme-source]`; `null` means ui-theme's row did not run.
 * @param {string | null} [options.stored] - raw localStorage payload.
 * @param {boolean} [options.osDark] - `matchMedia('(prefers-color-scheme: dark)')`.
 * @param {boolean} [options.storageThrows] - make localStorage.getItem throw (sandboxed storage).
 * @param {boolean} [options.missingBody] - document.body is null (head-only execution).
 * @returns {{ written: Map<string, string>, window: object }} properties written
 *   through `body.style.setProperty`, plus the sandbox `window` (for the hint).
 */
function runBootScript ({ text, host, dark = false, source = null, stored = null, osDark = false, storageThrows = false, missingBody = false } = {}) {
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
  const window = {}
  const sandbox = { document, localStorage, window, matchMedia: () => ({ matches: osDark }) }
  const script = text ?? createBootScript(host)
  vm.runInNewContext(script, sandbox, { filename: 'dsh-everforest-boot.js' })
  return { written, window }
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

/**
 * Fake Host context: records `webserver/index-inject` listeners, the optional
 * `settings` wiring, and effect disposers.
 *
 * @param {object} [options]
 * @param {boolean} [options.settings] - provide the `settings` service to `ctx.inject`.
 * @param {boolean} [options.injectThrows] - make `ctx.inject` itself throw (legacy host).
 * @param {boolean} [options.configureThrows] - make `settings.configure` throw.
 */
function createHostHarness ({ settings = true, injectThrows = false, configureThrows = false } = {}) {
  const recorded = {
    listeners: [],
    injectCalls: [],
    configureCalls: [],
    effects: [],
    settingsWarn: [],
  }
  const ctx = {
    fiber: { entry: { id: ENTRY_ID } },
    on: (event, listener) => {
      assert.equal(event, 'webserver/index-inject')
      recorded.listeners.push(listener)
      return () => {}
    },
    inject: (services, callback) => {
      recorded.injectCalls.push({ services: [...services], callback })
      if (injectThrows) throw new Error('ctx.inject is unavailable on this host')
      if (!settings) return
      const child = {
        settings: {
          configure: (presentation, owner) => {
            recorded.configureCalls.push({ presentation, owner })
            if (configureThrows) throw new Error('configure failed')
            return () => {}
          },
        },
        effect: (factory, label) => {
          const disposer = factory()
          recorded.effects.push({ label, disposer })
          return disposer
        },
      }
      callback(child)
    },
  }
  return { ctx, recorded }
}

/** Emit the index-inject table once and return the row the plugin appended. */
function emitRow (harness) {
  const table = []
  assert.equal(harness.recorded.listeners.length, 1, 'the Host half must subscribe once')
  harness.recorded.listeners[0](table)
  assert.equal(table.length, 1, 'the Host half must add exactly one row')
  return table[0]
}

/** Mutable volatile config references, like the Loader's in-place updates. */
function createLiveConfig (initial = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: false }) {
  const values = { ...initial }
  return {
    config: {
      light: { get: () => values.light },
      dark: { get: () => values.dark },
      colorMode: { get: () => values.colorMode },
    },
    values,
  }
}

test('Config declares two live-editable scheme fields and a live color-mode flag', () => {
  assert.equal(ENTRY_ID, 'everforest')
  const json = Config.toJSON()
  assert.ok(json, 'Config.toJSON() must produce a serializable document')

  // `dsh-settings` projects only fields whose nearest volatile ancestor is live.
  // Marking the leaves (not the whole object) is required: schemastery rejects
  // a volatile field inside a volatile object.
  const fields = Config.dict
  assert.deepEqual(Object.keys(fields).sort(), ['colorMode', 'dark', 'light'])
  assert.equal(fields.light.meta.volatile, true, 'light must be volatile (live-editable)')
  assert.equal(fields.dark.meta.volatile, true, 'dark must be volatile (live-editable)')
  assert.equal(fields.colorMode.meta.volatile, true, 'colorMode must be volatile (live-editable)')
  assert.equal(fields.light.meta.default, DEFAULT_STATE.light)
  assert.equal(fields.dark.meta.default, DEFAULT_STATE.dark)
  assert.equal(fields.colorMode.meta.default, false, 'color mode ships off')

  // The Loader validates hand-edited profile patches with this schema.
  const parsed = Config({})
  assert.equal(parsed.light.get(), DEFAULT_STATE.light)
  assert.equal(parsed.dark.get(), DEFAULT_STATE.dark)
  assert.equal(parsed.colorMode.get(), false)
  assert.equal(Config({ light: 'soft' }).light.get(), 'soft')
  assert.equal(Config({ colorMode: true }).colorMode.get(), true)
  assert.throws(() => Config({ light: 'nope' }), 'an invalid hand-edited strength must be rejected')
  assert.throws(() => Config({ light: 'hard', dark: 'nope' }))
  assert.throws(() => Config({ colorMode: 'on' }), 'a hand-edited colorMode must be a boolean')
})

test('hostState() reads volatile references at call time and validates each side', () => {
  const live = createLiveConfig()
  assert.deepEqual(hostState(live.config), { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark })

  live.values.light = 'soft'
  live.values.dark = 'hard'
  assert.deepEqual(hostState(live.config), { light: 'soft', dark: 'hard' })

  // The color-mode flag is deliberately not part of the boot pair: the first
  // paint only writes token values, and the mode's CSS arrives with the Client.
  live.values.colorMode = true
  assert.deepEqual(hostState(live.config), { light: 'soft', dark: 'hard' })
  assert.equal(Object.prototype.hasOwnProperty.call(hostState(live.config), 'colorMode'), false)

  // Defensive: the boot row embeds strings, so anything outside the enum must
  // fall back instead of reaching the script.
  assert.deepEqual(hostState({ light: { get: () => 'nope' }, dark: { get: () => 42 } }), {
    light: DEFAULT_STATE.light,
    dark: DEFAULT_STATE.dark,
  })
  assert.deepEqual(hostState({ light: { get: () => { throw new Error('throwing reference') } } }), {
    light: DEFAULT_STATE.light,
    dark: DEFAULT_STATE.dark,
  })
  assert.deepEqual(hostState(undefined), { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark })
  assert.deepEqual(hostState(null), { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark })
})

test('apply() contributes exactly one body script row', () => {
  const { ctx, recorded } = createHostHarness()
  apply(ctx)
  const row = emitRow({ recorded })
  assert.equal(row.kind, 'script')
  assert.equal(row.placement, 'body', 'the row must run after <body> exists and before the deferred Client script')
  assert.equal(typeof row.text, 'string')
  assert.ok(row.text.length > 500)

  // Rows cross IPC on Desktop and are rendered into HTML on Web: they must be
  // plain JSON data and must never terminate the surrounding <script> element.
  assert.deepEqual(JSON.parse(JSON.stringify(row)), { kind: 'script', placement: 'body', text: row.text })
  assert.doesNotMatch(row.text, /<\/script/i)
  assert.doesNotMatch(row.text, /<!--|<style|!important/i, 'inline body properties must not be frozen by !important CSS')

  // The settings presentation is optional wiring: the auto-generated duplicate
  // page is disabled because this plugin ships its own Settings section.
  assert.equal(recorded.injectCalls.length, 1)
  assert.deepEqual(recorded.injectCalls[0].services, ['settings'])
  assert.deepEqual(recorded.configureCalls.map((entry) => entry.presentation), [{ auto: false }])
  assert.equal(recorded.configureCalls[0].owner, ctx.fiber)
  assert.equal(recorded.effects.length, 1)
})

test('apply() keeps working when the Host has no settings service', () => {
  const { ctx, recorded } = createHostHarness({ settings: false })
  assert.doesNotThrow(() => apply(ctx))
  emitRow({ recorded })
  assert.equal(recorded.configureCalls.length, 0)

  const legacy = createHostHarness({ injectThrows: true })
  assert.doesNotThrow(() => apply(legacy.ctx))
  emitRow(legacy)
})

test('a throwing settings.configure never fails the Host plugin', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    const { ctx, recorded } = createHostHarness({ configureThrows: true })
    assert.doesNotThrow(() => apply(ctx))
    emitRow({ recorded })
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /Settings page/)
  } finally {
    console.warn = originalWarn
  }
})

test('the row is appended for every index-inject emit (fresh table each time)', () => {
  const { ctx, recorded } = createHostHarness()
  apply(ctx)
  const first = []
  const second = []
  recorded.listeners[0](first)
  recorded.listeners[0](second)
  assert.equal(first.length, 1)
  assert.equal(second.length, 1)
  assert.deepEqual(first[0], second[0])
})

test('every emit reads the current Host value instead of freezing it at apply()', () => {
  const live = createLiveConfig()
  const { ctx, recorded } = createHostHarness()
  apply(ctx, live.config)

  const firstText = emitRow({ recorded }).text
  const first = runBootScript({ text: firstText, source: 'light' })
  const firstExpected = expectedBootValues('light', DEFAULT_STATE.light)
  assert.equal(first.written.get('--dsw-alias-bg-base'), firstExpected['--dsw-alias-bg-base'])

  // The Loader commits volatile updates in place, without remounting; the next
  // emit must pick the new pair up.
  live.values.light = 'soft'
  live.values.dark = 'hard'
  const secondText = emitRow({ recorded }).text
  assert.notEqual(secondText, firstText, 'the row text was frozen at apply time')
  const second = runBootScript({ text: secondText, source: 'dark', dark: true })
  const secondExpected = expectedBootValues('dark', 'hard')
  assert.equal(second.written.get('--dsw-alias-bg-base'), secondExpected['--dsw-alias-bg-base'])

  // The Host pair is also what the boot hint publishes for the Client first frame.
  assert.deepEqual(
    { ...second.window[BOOT_HINT] },
    { version: STATE_VERSION, light: 'soft', dark: 'hard' },
  )
})

test('host fallback paints a fresh browser profile; the localStorage cache still wins', () => {
  const host = { light: 'soft', dark: 'medium' }

  // No cache at all (new browser / random port / cleared site data): paint Host.
  const fresh = runBootScript({ host, source: 'light' })
  assertPalette(fresh.written, 'light', 'soft', 'fresh light')
  const freshDark = runBootScript({ host, source: 'dark', dark: true })
  assertPalette(freshDark.written, 'dark', 'medium', 'fresh dark')
  assert.deepEqual({ ...fresh.window[BOOT_HINT] }, { version: STATE_VERSION, light: 'soft', dark: 'medium' })

  // A valid cache is fresher than a Desktop payload frozen at Host-ready time.
  const cached = JSON.stringify({ version: STATE_VERSION, light: 'hard', dark: 'soft' })
  const fromCache = runBootScript({ host, source: 'light', stored: cached })
  assertPalette(fromCache.written, 'light', 'hard', 'cache wins on light')
  const fromCacheDark = runBootScript({ host, source: 'dark', dark: true, stored: cached })
  assertPalette(fromCacheDark.written, 'dark', 'soft', 'cache wins on dark')
  assert.deepEqual({ ...fromCacheDark.window[BOOT_HINT] }, { version: STATE_VERSION, light: 'hard', dark: 'soft' })

  // Mixed validity: each stored field is validated on its own.
  const partial = JSON.stringify({ version: STATE_VERSION, light: 'nope', dark: 'hard' })
  const partialRun = runBootScript({ host, source: 'dark', dark: true, stored: partial })
  assertPalette(partialRun.written, 'dark', 'hard', 'valid cache field kept')

  // Invalid cache falls back to the Host pair, not to the defaults.
  for (const stored of ['{oops', 'null', JSON.stringify([1, 2, 3]), JSON.stringify({ version: 99, light: 'hard', dark: 'soft' })]) {
    const run = runBootScript({ host, source: 'light', stored })
    assertPalette(run.written, 'light', 'soft', `invalid cache ${stored.slice(0, 12)}`)
  }

  // No Host pair at all: shipped defaults.
  assertPalette(runBootScript({ source: 'light' }).written, 'light', DEFAULT_STATE.light, 'no host fallback')
})

test('boot values equal the Client token layer for all six variants', () => {
  for (const light of STRENGTHS) {
    for (const dark of STRENGTHS) {
      const stored = JSON.stringify({ version: STATE_VERSION, light, dark })
      const lightRun = runBootScript({ source: 'light', dark: false, stored }).written
      const darkRun = runBootScript({ source: 'dark', dark: true, stored }).written
      assertPalette(lightRun, 'light', light, `light-${light}`)
      assertPalette(darkRun, 'dark', dark, `dark-${dark}`)
    }
  }
})

test('the cached color-mode flag never changes the boot paint or the published hint', () => {
  // The first paint is token-only; color mode is Client-injected CSS scoped to
  // the chat/session DOM. A cache payload with the flag on must boot exactly
  // like one with it off, and the hint stays a strength-only pair.
  const off = JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'hard', colorMode: false })
  const on = JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'hard', colorMode: true })
  const offRun = runBootScript({ source: 'light', stored: off })
  const onRun = runBootScript({ source: 'light', stored: on })
  assert.deepEqual([...onRun.written.entries()], [...offRun.written.entries()])
  assert.deepEqual({ ...onRun.window[BOOT_HINT] }, { version: STATE_VERSION, light: 'soft', dark: 'hard' })
})

test('no stored choice and no Host pair paints the default pairing (dark soft / light hard)', () => {
  assertPalette(runBootScript({ source: 'light', dark: false }).written, 'light', DEFAULT_STATE.light, 'default light')
  assertPalette(runBootScript({ source: 'system', dark: true }).written, 'dark', DEFAULT_STATE.dark, 'default dark')
})

test('a fixed Light appearance on a Dark OS still paints Light', () => {
  // ui-theme resolved the preference to light: data-ds-theme-source="light" and
  // no dark attribute. A bare prefers-color-scheme read would paint dark here.
  const written = runBootScript({ source: 'light', dark: false, osDark: true }).written
  assertPalette(written, 'light', DEFAULT_STATE.light, 'fixed light, dark OS')
})

test('a fixed Dark appearance on a Light OS still paints Dark', () => {
  const written = runBootScript({ source: 'dark', dark: true, osDark: false }).written
  assertPalette(written, 'dark', DEFAULT_STATE.dark, 'fixed dark, light OS')
})

test('without ui-theme\'s boot row the OS scheme is the fallback', () => {
  assertPalette(runBootScript({ source: null, osDark: true }).written, 'dark', DEFAULT_STATE.dark, 'no ui-theme, dark OS')
  assertPalette(runBootScript({ source: null, osDark: false }).written, 'light', DEFAULT_STATE.light, 'no ui-theme, light OS')
})

test('blocked or missing storage never breaks the boot paint', () => {
  const blocked = runBootScript({ storageThrows: true, host: { light: 'soft', dark: 'medium' }, source: 'light' })
  assertPalette(blocked.written, 'light', 'soft', 'throwing storage keeps the Host pair')
  const noBody = runBootScript({ missingBody: true, host: { light: 'soft', dark: 'medium' } })
  assert.equal(noBody.written.size, 0, 'no body means no paint and no throw')
  // The hint is published before the body check, so a head-only document still
  // hands the pair to the Client half if it ever mounts.
  assert.deepEqual({ ...noBody.window[BOOT_HINT] }, { version: STATE_VERSION, light: 'soft', dark: 'medium' })
})

test('the script is idempotent', () => {
  const text = createBootScript({ light: 'hard', dark: 'hard' })
  const first = runBootScript({ text, source: 'dark', dark: true, stored: JSON.stringify({ version: STATE_VERSION, light: 'hard', dark: 'hard' }) })
  const second = runBootScript({ text, source: 'dark', dark: true, stored: JSON.stringify({ version: STATE_VERSION, light: 'hard', dark: 'hard' }) })
  assert.deepEqual([...first.written.entries()], [...second.written.entries()])
})

test('every boot token is also a Client-layer token and every value is a CSS value', () => {
  const overlay = tokensFor(DEFAULT_STATE)
  for (const name of BOOT_TOKENS) {
    assert.match(name, /^--(dsw|shiki)-/, `${name} is outside the token layer`)
    assert.ok(overlay[name], `${name} is not emitted by tokensFor()`)
    assert.equal(typeof overlay[name].light, 'string')
    assert.equal(typeof overlay[name].dark, 'string')
  }

  const written = runBootScript().written
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
  const written = runBootScript({ source: 'dark', dark: true }).written
  for (const name of required) {
    assert.ok(BOOT_TOKENS.includes(name), `${name} is not a boot token`)
    assert.equal(typeof written.get(name), 'string')
    assert.ok(written.get(name).trim() !== '', `${name} painted empty`)
  }
})
