/**
 * End-to-end checks for the dsh-everforest package that do not need a browser:
 * manifest/patch/locale/icon shape, generated-artifact freshness, the real
 * `client.js` bundle evaluated in a VM with a fake module loader, and the full
 * `apply()` lifecycle against a fake Client context.
 *
 * Visual verification of the rendered page still needs the running Harness.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGE_ID = 'dsh-everforest'
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')
const readJson = (relative) => JSON.parse(read(relative))
const EXPECTED_TOKEN_COUNT = 206 // 77 static + 107 alias + 11 specific + 11 shiki

function runNode(scriptArgs, options = {}) {
  const result = spawnSync(process.execPath, scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    ...options,
  })
  assert.equal(result.status, 0, `${scriptArgs.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result
}

/** Minimal React stand-in: enough for the settings component factory and store. */
const mockReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
}

/**
 * Fake Client context: records theme.overrideTokens layers, slot registrations,
 * and effect disposers so the test can exercise plugin unload. With
 * `deferUiServices`, `ctx.get('slots'/'locale')` returns undefined and
 * `ctx.inject` stores the callback, simulating a profile whose UI services
 * activate after this plugin.
 */
function createHarness({ deferUiServices = false } = {}) {
  const recorded = {
    tokenLayers: [],
    tokenLayerDisposers: [],
    themeListeners: [],
    slotRegistrations: [],
    localeRegistrations: [],
    effects: [],
    setThemeCalls: [],
    injectCalls: [],
  }
  let servicesReady = !deferUiServices
  const themeSnapshot = {
    preference: 'system',
    fontSizes: { text: 14, code: 11, terminal: 13 },
    fontFamilies: { text: '', code: '', terminal: '' },
    active: { id: 'dark', colorScheme: 'dark', tokens: {} },
    themes: [],
    revision: 1,
  }
  const theme = {
    getTheme: () => themeSnapshot,
    setTheme: (id) => {
      recorded.setThemeCalls.push(id)
      themeSnapshot.preference = id
      themeSnapshot.active = { ...themeSnapshot.active, id, colorScheme: id === 'light' ? 'light' : 'dark' }
      for (const listener of [...recorded.themeListeners]) listener()
    },
    overrideTokens: (source, tokens) => {
      const layer = { source, tokens }
      recorded.tokenLayers.push(layer)
      const disposer = () => {
        recorded.tokenLayerDisposers.push(layer)
      }
      return disposer
    },
  }
  const locale = {
    register: (ns, dictionaries) => {
      recorded.localeRegistrations.push({ ns, dictionaries })
      return () => {}
    },
    bind: () => (key) => key,
  }
  const slots = {
    inject: (key, callback) => {
      assert.equal(key, 'settings.section')
      const disposer = callback()
      return () => disposer?.()
    },
    register: (options, component) => {
      recorded.slotRegistrations.push({ options, component })
      return () => {}
    },
  }
  const ctx = {
    theme,
    slots,
    locale,
    effect: (callback, label) => {
      const disposer = callback()
      recorded.effects.push({ label, disposer })
      return disposer
    },
    on: (event, listener) => {
      assert.equal(event, 'theme/change')
      recorded.themeListeners.push(listener)
      return () => {
        const index = recorded.themeListeners.indexOf(listener)
        if (index >= 0) recorded.themeListeners.splice(index, 1)
      }
    },
    // The real Cordis context calls the callback once every named service is
    // available; the harness either provides them synchronously or defers the
    // callback to `releaseUiServices()`.
    inject: (services, callback) => {
      recorded.injectCalls.push({ services, callback })
      if (servicesReady) {
        for (const service of services) assert.ok(ctx[service], `missing injected service ${service}`)
        callback(ctx)
      }
    },
    get: (name) => {
      if (!servicesReady) return undefined
      if (name === 'slots') return slots
      if (name === 'locale') return locale
      return undefined
    },
  }
  return {
    ctx,
    recorded,
    themeSnapshot,
    releaseUiServices: () => {
      servicesReady = true
      for (const { services, callback } of recorded.injectCalls) {
        for (const service of services) assert.ok(ctx[service], `missing injected service ${service}`)
        callback(ctx)
      }
    },
    disposeAll: () => {
      for (const { disposer } of [...recorded.effects].reverse()) disposer?.()
    },
  }
}

/** Evaluate the built bundle exactly the way the Client module loader does. */
function loadBundle() {
  let definition = null
  const styleTags = []
  const document = {
    head: {
      appendChild: (tag) => {
        styleTags.push(tag)
        tag.remove = () => {
          const index = styleTags.indexOf(tag)
          if (index >= 0) styleTags.splice(index, 1)
        }
      },
    },
    createElement: () => ({ dataset: {}, textContent: '' }),
    body: undefined,
  }
  const sandbox = {
    window: { __ModuleLoader__: { load: (value) => { definition = value } } },
    // The bundle only needs timers for its deferred token self-check.
    setTimeout,
    clearTimeout,
    // Enough of the DOM for the plugin's `<style data-plugin>` lifecycle.
    document,
  }
  vm.runInNewContext(read('client.js'), sandbox, { filename: 'client.js' })
  assert.ok(definition, 'client.js did not call window.__ModuleLoader__.load()')
  const module = definition.factory((request) => {
    assert.equal(request, 'react')
    return mockReact
  })
  return { definition, module, styleTags }
}

test('manifest declares the dsh bundle and client half correctly', () => {
  const manifest = readJson('package.json')
  assert.equal(manifest.name, PACKAGE_ID)
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.engines.dsh, '>=0.2.1-rc.2 <0.3.0-0')
  assert.equal(manifest.engines.node, '>=20')
  assert.deepEqual(manifest.exports['.'], './index.js')
  assert.deepEqual(manifest.exports['./client'], './client.js')
  assert.equal(manifest.exports['./icon'], './icon.svg')
  assert.ok(manifest.exports['./locale/*.json'])
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-theme'))
  for (const required of ['index.js', 'client.js', 'cordis.patch.yml', 'locale/*.json', 'icon.svg']) {
    assert.ok(manifest.files.includes(required), `files whitelist must include ${required}`)
  }
  for (const relative of ['.', './client', './icon', './package.json']) {
    if (!relative.includes('*')) assert.ok(existsSync(join(ROOT, manifest.exports[relative])), `missing ${manifest.exports[relative]}`)
  }
})

test('bundle patch inserts exactly one Everforest row', () => {
  const patch = read('cordis.patch.yml')
  assert.match(patch, /- insert:/)
  assert.match(patch, /id: everforest/)
  assert.match(patch, /name: 'dsh-everforest'/)
  assert.equal((patch.match(/- insert:/g) ?? []).length, 1)
})

test('host half stays empty and exports apply', async () => {
  const host = await import('../index.js')
  assert.equal(typeof host.apply, 'function')
  assert.equal(host.apply.length, 0)
})

test('plugin display metadata exists in both locales', () => {
  for (const localeId of ['en', 'zh']) {
    const metadata = readJson(`locale/${localeId}.json`)
    assert.equal(typeof metadata.meta.title, 'string')
    assert.equal(typeof metadata.meta.description, 'string')
    assert.ok(metadata.meta.title.trim().length > 2, `${localeId} meta.title is too short`)
    assert.ok(metadata.meta.description.trim().length > 10, `${localeId} meta.description is too short`)
  }
})

test('icon is a small, self-contained SVG', () => {
  assert.ok(existsSync(join(ROOT, 'icon.svg')))
  const size = statSync(join(ROOT, 'icon.svg')).size
  assert.ok(size > 100 && size <= 256 * 1024, `icon.svg is ${size} bytes`)
  const icon = read('icon.svg').trim()
  assert.ok(icon.startsWith('<svg') || icon.startsWith('<?xml'), 'icon.svg does not look like SVG')
  assert.match(icon, /<svg[\s>]/)
  assert.doesNotMatch(icon, /<script|xlink:href="https?:|href="https?:/i)
})

test('generated sources and bundle are fresh', () => {
  runNode(['scripts/palette.mjs', '--check'])
  runNode(['scripts/build.mjs', '--check'])
  runNode(['--check', 'client.js'])
})

test('bundle registers under the package id with the Client entry shape', () => {
  const { definition, module } = loadBundle()
  assert.equal(definition.id, PACKAGE_ID)
  assert.equal(typeof definition.factory, 'function')
  assert.equal(module.name, PACKAGE_ID)
  // Cross-realm array from the VM: compare values, not the prototype.
  assert.deepEqual(Array.from(module.inject), ['theme'])
  assert.equal(typeof module.apply, 'function')
})

test('src half imports no Harness Client package', () => {
  for (const relative of ['palette.js', 'color.js', 'tokens.js', 'state.js', 'locale.js', 'settings-page.js', 'index.js']) {
    const source = read(`src/${relative}`)
    assert.doesNotMatch(source, /from ['"]@deepseek-ai\//, `${relative} imports a Harness package`)
    assert.doesNotMatch(source, /require\(['"]@deepseek-ai\//, `${relative} requires a Harness package`)
  }
})

test('apply() mounts the token layer, settings page, and locale, and cleans up', async () => {
  const { module, styleTags } = loadBundle()
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness

  // Token layer: one layer, both schemes, default palette.
  assert.equal(recorded.tokenLayers.length, 1)
  const layer = recorded.tokenLayers[0]
  assert.equal(layer.source, PACKAGE_ID)
  const tokenCount = Object.keys(layer.tokens).length
  assert.ok(tokenCount >= EXPECTED_TOKEN_COUNT, `override layer has only ${tokenCount} tokens`)
  const bgBase = layer.tokens['--dsw-alias-bg-base']
  // Values come from the VM realm, so compare primitives (not object identity).
  assert.equal(bgBase.light, '#FFFBEF')
  assert.equal(bgBase.dark, '#333C43')
  for (const [name, value] of Object.entries(layer.tokens)) {
    assert.match(name, /^--(dsw|shiki)-/, `unexpected token ${name}`)
    assert.equal(typeof value?.light, 'string', `${name} lacks a light value`)
    assert.equal(typeof value?.dark, 'string', `${name} lacks a dark value`)
    assert.ok(value.light.trim() !== '' && value.dark.trim() !== '', `${name} has an empty value`)
  }

  // Locale dictionaries, page stylesheet, Settings page registration.
  assert.equal(recorded.localeRegistrations.length, 1)
  assert.equal(recorded.localeRegistrations[0].ns, 'settings.everforest')
  assert.ok(recorded.localeRegistrations[0].dictionaries.en)
  assert.ok(recorded.localeRegistrations[0].dictionaries.zh)
  assert.equal(styleTags.length, 1, 'settings stylesheet was not injected')
  assert.equal(styleTags[0].dataset.plugin, PACKAGE_ID)
  assert.equal(recorded.slotRegistrations.length, 1)
  const { options, component } = recorded.slotRegistrations[0]
  assert.equal(options.name, 'settings.section')
  assert.equal(options.id, 'everforest')
  assert.equal(options.order, 25)
  assert.equal(typeof options.label, 'function')
  assert.equal(typeof component, 'function')
  const injection = options.inject()
  assert.equal(typeof injection.t, 'function')
  const store = injection.store
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'hard', dark: 'soft' })
  assert.equal(typeof store.select, 'function')
  assert.equal(typeof store.reset, 'function')
  assert.equal(typeof store.setPreference, 'function')
  assert.equal(typeof store.setPreference('auto'), 'undefined')
  assert.deepEqual(recorded.setThemeCalls, [])

  // Selecting a strength replaces the layer; selecting another scheme also
  // switches DSH's Appearance preference.
  store.select('light', 'soft')
  assert.equal(recorded.tokenLayers.length, 2)
  assert.equal(store.getSnapshot().state.light, 'soft')
  assert.deepEqual(recorded.setThemeCalls, ['light'])

  store.select('dark', 'hard')
  assert.equal(store.getSnapshot().state.dark, 'hard')
  assert.equal(recorded.tokenLayers.length, 3)
  assert.deepEqual(recorded.setThemeCalls, ['light', 'dark'])

  // Reset restores the Enchanted default pairing without touching Appearance.
  store.reset()
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'hard', dark: 'soft' })
  assert.deepEqual(recorded.setThemeCalls, ['light', 'dark'])

  // The appearance control writes the same global preference DSH owns; the
  // store only accepts DSH's three values (no plugin-local appearance state).
  store.setPreference('system')
  assert.deepEqual(recorded.setThemeCalls, ['light', 'dark', 'system'])
  assert.equal(store.getSnapshot().theme.preference, 'system')
  assert.equal(store.getSnapshot().theme.active.colorScheme, 'dark')
  store.setPreference('light')
  assert.deepEqual(recorded.setThemeCalls, ['light', 'dark', 'system', 'light'])
  assert.equal(store.getSnapshot().theme.active.colorScheme, 'light')

  // Plugin unload releases the override layer (not automatic in ThemeRuntime).
  harness.disposeAll()
  const disposedSources = recorded.tokenLayerDisposers.map((entry) => entry.source)
  assert.ok(disposedSources.includes(PACKAGE_ID), 'token layer was not disposed on unload')
  assert.equal(styleTags.length, 0, 'settings stylesheet was not removed on unload')
})

test('settings UI mounts when slots/locale arrive after apply()', async () => {
  const { module, styleTags } = loadBundle()
  const harness = createHarness({ deferUiServices: true })
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness

  // The theme layer is unconditional; the Settings page waits for its services.
  assert.equal(recorded.tokenLayers.length, 1)
  assert.equal(recorded.slotRegistrations.length, 0)
  assert.equal(recorded.localeRegistrations.length, 0)
  assert.equal(styleTags.length, 0)
  assert.equal(recorded.injectCalls.length, 1)
  assert.deepEqual(Array.from(recorded.injectCalls[0].services), ['slots', 'locale'])

  harness.releaseUiServices()
  assert.equal(recorded.slotRegistrations.length, 1)
  assert.equal(recorded.slotRegistrations[0].options.id, 'everforest')
  assert.equal(recorded.localeRegistrations.length, 1)
  assert.equal(recorded.localeRegistrations[0].ns, 'settings.everforest')
  assert.equal(styleTags.length, 1)

  // Releasing again must not double-register (the router is idempotent).
  harness.releaseUiServices()
  assert.equal(recorded.slotRegistrations.length, 1)

  harness.disposeAll()
  assert.ok(
    recorded.tokenLayerDisposers.some((entry) => entry.source === PACKAGE_ID),
    'token layer was not disposed on unload',
  )
  assert.equal(styleTags.length, 0, 'delayed settings stylesheet was not removed on unload')
})

test('token map covers the whole DSH color inventory', async () => {
  const inventory = readJson('docs/reference/token-inventory.json')
  const { AUXILIARY_TOKEN_NAMES, TOKEN_COVERAGE, tokensFor } = await import('../src/tokens.js')
  const { DEFAULT_STATE } = await import('../src/palette.js')
  const tokens = tokensFor(DEFAULT_STATE)
  const names = Object.keys(tokens).sort()
  const auxiliary = new Set(AUXILIARY_TOKEN_NAMES)
  const colorNames = names.filter((name) => !auxiliary.has(name))
  const inventoryNames = inventory.tokens
    .filter((token) => ['static', 'alias', 'specific', 'shiki'].includes(token.category))
    .map((token) => token.name)
    .sort()
  assert.equal(inventory.counts.total, EXPECTED_TOKEN_COUNT)
  assert.equal(inventoryNames.length, EXPECTED_TOKEN_COUNT)
  assert.equal(auxiliary.size, 6)
  assert.equal(colorNames.length, EXPECTED_TOKEN_COUNT)
  assert.deepEqual(colorNames, inventoryNames)
  assert.equal(names.length, EXPECTED_TOKEN_COUNT + auxiliary.size)
  assert.deepEqual([...TOKEN_COVERAGE.covered].sort(), names)
  assert.ok(TOKEN_COVERAGE.uncovered.length > 0)

  // The override layer must not touch non-color surfaces.
  for (const name of colorNames) {
    assert.doesNotMatch(name, /^--dsw-(focus-ring|font-|radius-|shadow-|menu-backdrop-filter|corner-shape|elevation-)/)
  }

  // Every scheme/strength combination yields the same token names, with the
  // scheme's own palette applied.
  const variants = [
    ['hard', 'soft'],
    ['medium', 'medium'],
    ['soft', 'hard'],
  ]
  for (const [light, dark] of variants) {
    const variantTokens = tokensFor({ light, dark })
    assert.deepEqual(Object.keys(variantTokens).sort(), names)
    assert.notEqual(variantTokens['--dsw-alias-bg-base'].light, tokens['--dsw-alias-bg-base'].dark)
  }
})

test('token values follow the design decisions', async () => {
  const { tokensFor } = await import('../src/tokens.js')
  const { DEFAULT_STATE } = await import('../src/palette.js')
  const tokens = tokensFor(DEFAULT_STATE)
  const layer = (name) => tokens[name]
  assert.deepEqual(layer('--dsw-alias-bg-base'), { light: '#FFFBEF', dark: '#333C43' })
  // Sidebar is one ramp step off bg-base so the DSH column edge stays visible.
  assert.equal(layer('--dsw-specific-sidebar-fill').light, '#f9f6e6')
  assert.equal(layer('--dsw-specific-sidebar-fill').dark, '#39444a')
  assert.equal(layer('--dsw-alias-label-primary').light, '#5C6A72')
  assert.equal(layer('--dsw-alias-label-primary').dark, '#D3C6AA')
  assert.equal(layer('--dsw-alias-brand-primary').light, '#569D79')
  assert.equal(layer('--dsw-alias-brand-primary').dark, '#569D79')
  assert.match(layer('--dsw-alias-bg-document-selection').light, /transparent/)
  assert.match(layer('--dsw-alias-bg-document-selection').light, /40%/)
  // The code block and the shiki canvas share the same design role (bg_dim);
  // the light scheme lightens it toward bg0 to keep primary text at 4.5:1.
  assert.equal(layer('--shiki-background').light, layer('--dsw-alias-markdown-code-block').light)
  assert.equal(layer('--shiki-background').dark, layer('--dsw-alias-markdown-code-block').dark)
  assert.equal(layer('--shiki-foreground').light, '#5C6A72')
  assert.equal(layer('--shiki-foreground').dark, '#D3C6AA')
  for (const shikiToken of ['--shiki-token-constant', '--shiki-token-string', '--shiki-token-comment', '--shiki-token-keyword', '--shiki-token-parameter', '--shiki-token-function', '--shiki-token-string-expression', '--shiki-token-punctuation', '--shiki-token-link']) {
    assert.ok(layer(shikiToken), `missing ${shikiToken}`)
  }
})

test('contrast gate script passes for all six palettes', () => {
  // --check: the committed report must match a fresh run (no silent rewrite).
  runNode(['scripts/check-contrast.mjs', '--check'])
  assert.ok(existsSync(join(ROOT, 'docs/reference/contrast.md')))
})

test('README documents the implemented state', () => {
  const readme = read('README.md')
  assert.match(readme, /dsh-everforest/)
  assert.doesNotMatch(readme, /插件代码尚未落地/)
  assert.match(readme, /node scripts\/build\.mjs/)
  assert.match(readme, /node --test/)
})
