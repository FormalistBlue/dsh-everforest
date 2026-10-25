/**
 * End-to-end checks for the dsh-everforest package that do not need a browser:
 * manifest/patch/locale/icon shape, generated-artifact freshness, the real
 * `client.js` bundle evaluated in a VM with a fake module loader (including the
 * color-mode `<html>` attributes and the injected color-mode stylesheet), and
 * the full `apply()` lifecycle against a fake Client context — including the
 * theme spotlight wrappers for `setTheme` and the `system`-follow OS flip
 * (`publish`) and their teardown.
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

import { BuildError, composeBundle, parseModule } from '../scripts/build.mjs'
import { DEFAULT_STATE } from '../src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from '../src/state.js'
import { tokensFor } from '../src/tokens.js'

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
 * Fake `ctx.configForms.get('everforest')` controller mirroring
 * `dsh-client-ui-settings`' `ConfigFormController` contract:
 * `{ status, value, base, user, revision, writable }` snapshots, a subscribe
 * notification on every change, and atomic `mutate(ops, expectedRevision)`
 * writes that return whether the Host accepted them.
 *
 * `refuse: true` simulates a rejected write (revision conflict / locked
 * profile): the mutation is recorded but the snapshot does not move, exactly
 * like the real controller after it re-reads the document.
 *
 * `deferMutate: true` makes writes asynchronous like the real service: nothing
 * is folded into the snapshot until the test drains the queue with `settle()`.
 * That is the only way to exercise the window in which a second user action
 * arrives while the first write is still in flight.
 *
 * @param {object} [options]
 * @param {'loading' | 'ready' | 'unavailable'} [options.status]
 * @param {{ light?: string, dark?: string }} [options.value] - effective section.
 * @param {{ light?: string, dark?: string }} [options.user] - profile override.
 * @param {number} [options.revision]
 * @param {boolean} [options.writable]
 * @param {boolean} [options.refuse] - every mutate() returns false.
 * @param {boolean} [options.deferMutate] - hold writes until `settle()`.
 */
function createConfigForm(options = {}) {
  const shipped = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
  const formState = {
    status: options.status ?? 'loading',
    value: options.value === undefined ? undefined : { ...shipped, ...options.value },
    base: { ...shipped, ...(options.base ?? {}) },
    user: { ...(options.user ?? {}) },
    revision: options.revision ?? 1,
    writable: options.writable ?? true,
  }
  const listeners = new Set()
  const pending = []
  const record = { mutations: [], subscribeCount: 0, listenerCount: () => listeners.size }
  const notify = () => {
    for (const listener of [...listeners]) listener()
  }
  /** Fold one mutation into the snapshot, like a resolved Host write. */
  const applyMutation = (ops) => {
    for (const op of ops) {
      const field = op.path[0]
      if (op.op === 'set') {
        formState.value = { ...formState.value, [field]: op.value }
        formState.user = { ...formState.user, [field]: op.value }
      } else {
        const user = { ...formState.user }
        delete user[field]
        formState.user = user
        formState.value = { ...formState.value, [field]: formState.base[field] }
      }
    }
    formState.revision += 1
    notify()
    return true
  }
  return {
    record,
    state: formState,
    getSnapshot: () => ({ ...formState }),
    subscribe: (listener) => {
      record.subscribeCount += 1
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    mutate: (ops, expectedRevision) => {
      record.mutations.push({ ops: JSON.parse(JSON.stringify(ops)), expectedRevision })
      if (options.deferMutate) {
        return new Promise((resolve) => {
          pending.push({ ops, resolve })
        })
      }
      if (formState.writable === false) return Promise.resolve(false)
      if (options.refuse) return Promise.resolve(false)
      return Promise.resolve(applyMutation(ops))
    },
    /** Resolve every queued write, in order (no-op without `deferMutate`). */
    settle: async () => {
      while (pending.length > 0) {
        const next = pending.shift()
        next.resolve(formState.writable === false ? false : applyMutation(next.ops))
      }
    },
    /** Resolve just the oldest queued write. */
    settleNext: async () => {
      const next = pending.shift()
      if (next === undefined) return
      next.resolve(formState.writable === false ? false : applyMutation(next.ops))
    },
    /** Simulate a change made by another browser (host broadcast). */
    emit: (next) => {
      Object.assign(formState, next)
      notify()
    },
  }
}

/**
 * Fake Client context: records theme.overrideTokens layers, slot registrations,
 * effect disposers, and the optional-service `ctx.inject` callbacks so the test
 * can exercise plugin unload. With `deferUiServices`, `ctx.get('slots'/'locale')`
 * returns undefined and the callback is stored, simulating a profile whose UI
 * services activate after this plugin. `configForms` is an independent service:
 * `configForms: false` omits it (pre-0.3.0 host), `deferConfigForms: true`
 * delivers it later (settings plugin activates after this one).
 *
 * @param {object} [options]
 * @param {boolean} [options.deferUiServices]
 * @param {boolean} [options.configForms] - provide the `configForms` service.
 * @param {boolean} [options.deferConfigForms] - deliver the service only after
 *   `receiveConfigForms()`.
 * @param {ReturnType<typeof createConfigForm>} [options.form] - the form the
 *   service returns; defaults to a still-loading form.
 */
function createHarness({ deferUiServices = false, configForms = true, deferConfigForms = false, form = null, media = { matches: true } } = {}) {
  const recorded = {
    tokenLayers: [],
    tokenLayerDisposers: [],
    themeListeners: [],
    themeListenerOptions: [],
    slotRegistrations: [],
    slotInjectKeys: [],
    localeRegistrations: [],
    localeDisposals: [],
    effects: [],
    injectDisposers: [],
    setThemeCalls: [],
    injectCalls: [],
  }
  let servicesReady = !deferUiServices
  let configFormsReady = configForms && !deferConfigForms
  const themeSnapshot = {
    preference: 'system',
    fontSizes: { text: 14, code: 11, terminal: 13 },
    fontFamilies: { text: '', code: '', terminal: '' },
    active: { id: 'dark', colorScheme: 'dark', tokens: {} },
    themes: [],
    revision: 1,
  }
  // `prefers-color-scheme` double for the OS-flip path. The real ThemeRuntime
  // owns the media query, exposes a writable `preference` field, and calls
  // `this.publish()` from its own media listener (which then rebuilds the
  // snapshot). The fake mirrors that split: the field changes first, the
  // snapshot only moves inside `publish()`, exactly like the real runtime.
  const theme = {
    media,
    preference: themeSnapshot.preference,
    getTheme: () => themeSnapshot,
    setTheme: (id) => {
      // Same early return as ThemeRuntime.setTheme: same preference, no event.
      if (theme.preference === id) return
      recorded.setThemeCalls.push(id)
      theme.preference = id
      theme.publish()
    },
    publish: () => {
      const resolved = theme.preference === 'system'
        ? (media.matches ? 'dark' : 'light')
        : theme.preference
      themeSnapshot.preference = theme.preference
      themeSnapshot.active = { ...themeSnapshot.active, id: resolved, colorScheme: resolved }
      themeSnapshot.revision += 1
      for (const listener of [...recorded.themeListeners]) listener(themeSnapshot)
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
      return () => {
        recorded.localeDisposals.push(ns)
      }
    },
    bind: () => (key) => key,
  }
  const slots = {
    inject: (key, callback) => {
      // The production bundle only registers the Settings page; the dev bundle
      // additionally mounts its debug panel into the frame-wide overlay layer.
      assert.ok(key === 'settings.section' || key === 'shell.overlay', `unexpected slot: ${key}`)
      recorded.slotInjectKeys.push(key)
      const disposer = callback()
      return () => disposer?.()
    },
    register: (options, component) => {
      recorded.slotRegistrations.push({ options, component })
      return () => {}
    },
  }
  const formController = configForms ? (form ?? createConfigForm()) : null
  const configFormsService = configForms
    ? {
        get: (entryId) => {
          assert.equal(entryId, 'everforest', 'the form must be addressed by the profile entry id')
          return formController
        },
      }
    : undefined
  const serviceAvailable = (service) => {
    if (service === 'slots' || service === 'locale') return servicesReady
    if (service === 'configForms') return configFormsReady
    return Boolean(ctx[service])
  }
  const ctx = {
    theme,
    slots,
    locale,
    ...(configFormsService ? { configForms: configFormsService } : {}),
    effect: (callback, label) => {
      const disposer = callback()
      recorded.effects.push({ label, disposer })
      return disposer
    },
    on: (event, listener, options) => {
      assert.equal(event, 'theme/change')
      recorded.themeListenerOptions.push(options ?? {})
      recorded.themeListeners.push(listener)
      return () => {
        const index = recorded.themeListeners.indexOf(listener)
        if (index >= 0) recorded.themeListeners.splice(index, 1)
      }
    },
    // The real Cordis context calls the callback once every named service is
    // available; the harness delivers synchronously when it can, otherwise on
    // `releaseUiServices()` / `receiveConfigForms()`. Each callback is
    // delivered at most once, and its returned disposer is kept for unload.
    inject: (services, callback) => {
      const entry = { services: [...services], callback, delivered: false }
      recorded.injectCalls.push(entry)
      const deliver = () => {
        if (entry.delivered) return
        if (!entry.services.every(serviceAvailable)) return
        entry.delivered = true
        const disposer = callback(ctx)
        if (typeof disposer === 'function') recorded.injectDisposers.push(disposer)
      }
      entry.deliver = deliver
      deliver()
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
    form: formController,
    media,
    themeSnapshot,
    releaseUiServices: () => {
      servicesReady = true
      for (const { deliver } of recorded.injectCalls) deliver()
    },
    receiveConfigForms: () => {
      configFormsReady = true
      for (const { deliver } of recorded.injectCalls) deliver()
    },
    disposeAll: () => {
      for (const { disposer } of [...recorded.effects].reverse()) disposer?.()
      for (const disposer of [...recorded.injectDisposers].reverse()) disposer?.()
    },
  }
}

/**
 * In-memory `Storage` double for the bundle's `readState()`/`writeState()`.
 * @param {Record<string, string>} [entries]
 */
function createMemoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return {
    get length() {
      return values.size
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      values.set(key, String(value))
    },
    removeItem: (key) => {
      values.delete(key)
    },
    clear: () => {
      values.clear()
    },
  }
}

/**
 * Evaluate the built bundle exactly the way the Client module loader does.
 * `body` / `getComputedStyle` / `console` let a test drive the deferred token
 * self-check; by default `document.body` is undefined, which makes runSelfCheck a
 * no-op for the lifecycle tests. `storage` seeds the window's localStorage, and
 * the returned `window` stub can dispatch the DOM events the plugin listens to.
 * `document.documentElement` records the color-mode data attributes the bundle
 * writes; the returned `htmlAttributes` map exposes them to assertions.
 */
function loadBundle({ body, getComputedStyle, console: consoleStub, storage, bootHint, viewTransition = false, matchMedia, source, filename } = {}) {
  let definition = null
  const styleTags = []
  const htmlAttributes = new Map()
  const transitions = []
  const animations = []
  const listeners = new Map()
  const windowStub = {
    __ModuleLoader__: { load: (value) => { definition = value } },
    addEventListener: (type, listener) => {
      const set = listeners.get(type) ?? new Set()
      listeners.set(type, set)
      set.add(listener)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    dispatchEvent: (event) => {
      for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event)
      return true
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  }
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
    transitions,
    animations,
    documentElement: {
      getAttribute: (name) => (htmlAttributes.has(name) ? htmlAttributes.get(name) : null),
      setAttribute: (name, value) => {
        htmlAttributes.set(name, String(value))
      },
      removeAttribute: (name) => {
        htmlAttributes.delete(name)
      },
      ...(viewTransition
        ? {
            animate: (keyframes, options) => {
              animations.push({ keyframes, options })
              return { cancel() {}, finished: Promise.resolve() }
            },
          }
        : {}),
    },
    ...(viewTransition
      ? {
          defaultView: { innerWidth: 1280, innerHeight: 800 },
          startViewTransition: (callback) => {
            const transition = {
              callback,
              ready: null,
              finished: null,
              resolveReady: null,
              resolveFinished: null,
            }
            transition.ready = new Promise((resolve) => {
              transition.resolveReady = resolve
            })
            transition.finished = new Promise((resolve) => {
              transition.resolveFinished = resolve
            })
            transitions.push(transition)
            return transition
          },
        }
      : {}),
    body,
  }
  const sandbox = {
    window: windowStub,
    // The bundle only needs timers for its deferred token self-check.
    setTimeout,
    clearTimeout,
    // Enough of the DOM for the plugin's `<style data-plugin>` lifecycle.
    document,
    ...(matchMedia ? { matchMedia } : {}),
    ...(getComputedStyle ? { getComputedStyle } : {}),
    ...(consoleStub ? { console: consoleStub } : {}),
    ...(storage ? { localStorage: storage } : {}),
  }
  if (bootHint !== undefined) windowStub.__EVERFOREST_BOOT__ = bootHint
  const bundleSource = source ?? read('client.js')
  vm.runInNewContext(bundleSource, sandbox, { filename: filename ?? 'client.js' })
  assert.ok(definition, 'the bundle did not call window.__ModuleLoader__.load()')
  const module = definition.factory((request) => {
    assert.equal(request, 'react')
    return mockReact
  })
  return { definition, module, styleTags, window: windowStub, htmlAttributes, document, transitions, animations }
}

/** Stylesheet tags by their `data-plugin-css` owner (Client bundles share `<style>`). */
const tagsOwnedBy = (styleTags, owner) => styleTags.filter(
  (tag) => tag.dataset && tag.dataset.pluginCss === owner,
)
const COLOR_MODE_CSS_OWNER = `${PACKAGE_ID}/color-mode`

/** The default local state the Client starts from (the Enchanted strength pair). */
const DEFAULT_LOCAL_STATE = Object.freeze({
  light: DEFAULT_STATE.light,
  dark: DEFAULT_STATE.dark,
})

/** Let queued Host-write promises settle (the client never blocks apply). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mount the bundle against a fresh harness and drain the initial async work.
 * @param {object} [options]
 * @param {object} [options.harnessOptions] - `createHarness` options.
 * @param {object} [options.loadOptions] - `loadBundle` options.
 */
async function mount(options = {}) {
  const harness = createHarness(options.harnessOptions ?? {})
  const loaded = loadBundle(options.loadOptions ?? {})
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    loaded.module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  await flush()
  return { ...loaded, harness }
}

/** The Settings store the page receives. */
function storeOf(harness) {
  return harness.recorded.slotRegistrations[0].options.inject().store
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

test('host half contributes the first-paint boot row and the durable Config', async () => {
  const host = await import('../index.js')
  assert.equal(typeof host.apply, 'function')
  assert.equal(host.apply.length, 2, 'apply() receives the Host context and the parsed config')
  assert.ok(Array.isArray(host.BOOT_TOKENS) || ArrayBuffer.isView(host.BOOT_TOKENS))
  assert.ok(host.BOOT_TOKENS.length > 0)
  assert.equal(typeof host.createBootScript, 'function')
  // The settings service projects `Config` by the profile entry id; the Loader
  // validates the profile patch against the same schema. (A schemastery schema
  // is a callable object, so `typeof` is 'function'.)
  assert.equal(typeof host.Config, 'function')
  assert.equal(typeof host.Config.toJSON, 'function')
  assert.equal(host.ENTRY_ID, 'everforest')
})

test('the published file list covers every runtime import of the Host and Client halves', async () => {
  const manifest = readJson('package.json')

  // The Host half and the src modules it imports run straight from the package
  // directory (they are not bundled), so `files` must ship each of them.
  const seen = new Set()
  const queue = ['index.js']
  while (queue.length > 0) {
    const relative = queue.shift()
    if (seen.has(relative)) continue
    seen.add(relative)
    const source = read(relative)
    for (const match of source.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) {
      queue.push(match[1].startsWith('src/') ? match[1] : `src/${match[1]}`)
    }
  }
  assert.deepEqual([...seen].sort(), ['index.js', 'src/color.js', 'src/host-config.js', 'src/palette.js', 'src/state.js', 'src/tokens.js'])
  for (const relative of seen) {
    assert.ok(manifest.files.includes(relative), `files whitelist must include ${relative}`)
  }
  assert.ok(manifest.files.includes('client.js'))
})

test('host half imports only the Host-provided schemastery package', () => {
  const source = read('index.js')
  assert.doesNotMatch(source, /from ['"]@deepseek-ai\//, 'index.js must go through src/host-config.js for schemastery')
  assert.doesNotMatch(source, /require\(['"]@deepseek-ai\//, 'index.js requires a Harness package')

  // The one bare import is schemastery, resolved by the DSH Host at runtime
  // from its own installation (never installed a second time by this package).
  const hostConfig = read('src/host-config.js')
  const bareImports = [...hostConfig.matchAll(/from\s+['"](@[^'"]+)['"]/g)].map((match) => match[1])
  assert.deepEqual(bareImports, ['@deepseek-ai/schemastery'])
  assert.doesNotMatch(hostConfig, /require\(/)
})

test('ENTRY_ID is one contract across the patch row, the Host Config and the Client', async () => {
  const patch = read('cordis.patch.yml')
  const patchId = patch.match(/- insert:\s*\n\s*- id: ([A-Za-z0-9_-]+)/)?.[1]
  assert.equal(patchId, 'everforest', 'the bundle patch must keep its insert id')
  const durable = await import('../src/durable.js')
  const hostConfig = await import('../src/host-config.js')
  assert.equal(hostConfig.ENTRY_ID, patchId)
  assert.equal(durable.ENTRY_ID, patchId)
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
  for (const relative of ['palette.js', 'color.js', 'color-mode.js', 'tokens.js', 'state.js', 'durable.js', 'locale.js', 'settings-page.js', 'client-entry.js']) {
    const source = read(`src/${relative}`)
    assert.doesNotMatch(source, /from ['"]@deepseek-ai\//, `${relative} imports a Harness package`)
    assert.doesNotMatch(source, /require\(['"]@deepseek-ai\//, `${relative} requires a Harness package`)
  }
})

test('apply() mounts the token layer, settings page, and locale, and cleans up', async () => {
  const { module, styleTags, window, htmlAttributes } = loadBundle()
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness

  // The cross-window sync listener is registered when the module mounts.
  assert.equal(window.listenerCount('storage'), 1, 'the storage listener was not registered')

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

  // Color-mode attributes on <html> and the mode stylesheet are mounted with the
  // token layer, independently of the Settings UI. It is a shipped default with
  // no switch since 2026-10-24, so the attribute is always on.
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
  assert.equal(htmlAttributes.get('data-everforest-light'), DEFAULT_STATE.light)
  assert.equal(htmlAttributes.get('data-everforest-dark'), DEFAULT_STATE.dark)
  const colorModeStylesheets = tagsOwnedBy(styleTags, COLOR_MODE_CSS_OWNER)
  assert.equal(colorModeStylesheets.length, 1, 'color-mode stylesheet was not injected')
  assert.equal(colorModeStylesheets[0].dataset.plugin, PACKAGE_ID)
  assert.ok(colorModeStylesheets[0].textContent.includes('data-everforest-color-mode="on"'))

  // The always-on text-selection stylesheet is part of the theme layer too.
  const selectionStylesheets = tagsOwnedBy(styleTags, PACKAGE_ID + '/selection')
  assert.equal(selectionStylesheets.length, 1, 'selection stylesheet was not injected')
  assert.ok(selectionStylesheets[0].textContent.includes('::selection'))
  assert.ok(selectionStylesheets[0].textContent.includes('data-everforest-color-mode') === false)

  // The always-on active-session stylesheet paints the selected workspace row.
  const activeSessionStylesheets = tagsOwnedBy(styleTags, PACKAGE_ID + '/active-session')
  assert.equal(activeSessionStylesheets.length, 1, 'active-session stylesheet was not injected')
  assert.ok(activeSessionStylesheets[0].textContent.includes('[aria-selected="true"]'))
  assert.ok(activeSessionStylesheets[0].textContent.includes('data-everforest-color-mode') === false)

  // Locale dictionaries, page stylesheet, Settings page registration.
  assert.equal(recorded.localeRegistrations.length, 1)
  assert.equal(recorded.localeRegistrations[0].ns, 'settings.everforest')
  assert.ok(recorded.localeRegistrations[0].dictionaries.en)
  assert.ok(recorded.localeRegistrations[0].dictionaries.zh)
  const settingsStylesheets = tagsOwnedBy(styleTags, PACKAGE_ID)
  assert.equal(settingsStylesheets.length, 1, 'settings stylesheet was not injected')
  assert.equal(settingsStylesheets[0].dataset.plugin, PACKAGE_ID)
  assert.equal(styleTags.length, 5, 'exactly five <style> elements (color mode + selection + active session + theme spotlight + settings)')
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
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  assert.equal(typeof store.select, 'function')
  assert.equal(typeof store.reset, 'function')
  assert.equal(typeof store.setPreference, 'function')
  assert.equal(store.setColorMode, undefined, 'the color-mode switch is gone (shipped default since 2026-10-24)')
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

  // ...but picking another strength in the already-active scheme must leave the
  // Appearance preference alone (system following survives a strength change).
  const callsBefore = recorded.setThemeCalls.length
  store.select('dark', 'medium')
  assert.equal(store.getSnapshot().state.dark, 'medium')
  assert.equal(recorded.setThemeCalls.length, callsBefore, 'same-scheme strength change rewrote Appearance')
  assert.equal(store.getSnapshot().theme.preference, 'dark')

  // Reset restores the Enchanted default pairing without touching Appearance.
  store.reset()
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  assert.deepEqual(recorded.setThemeCalls, ['light', 'dark'])

  // Color mode is a pure attribute + selector layer with no switch (shipped
  // default since 2026-10-24): a strength change keeps the always-on anchor and
  // never rebuilds the token sheet because of it.
  const layersBeforeMode = recorded.tokenLayers.length
  store.select('dark', 'medium')
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
  assert.equal(htmlAttributes.get('data-everforest-dark'), 'medium')
  assert.equal(recorded.tokenLayers.length, layersBeforeMode + 1, 'a strength change must re-stack exactly once')
  assert.deepEqual({ ...store.getSnapshot().state }, { light: DEFAULT_STATE.light, dark: 'medium' })

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
  assert.deepEqual(recorded.localeDisposals, ['settings.everforest'], 'locale dictionaries were not released on unload')
  assert.equal(window.listenerCount('storage'), 0, 'cross-window storage listener survived unload')
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
  // The durable form is waited for as its own optional service, independent of
  // slots/locale (a pre-0.3.0 host simply never delivers that one).
  assert.equal(recorded.tokenLayers.length, 1)
  assert.equal(recorded.slotRegistrations.length, 0)
  assert.equal(recorded.localeRegistrations.length, 0)
  // The color-mode stylesheet is NOT part of the Settings UI: it is mounted
  // with the token layer, so the mode keeps working without slots/locale.
  assert.equal(tagsOwnedBy(styleTags, COLOR_MODE_CSS_OWNER).length, 1)
  // The spotlight stylesheet is mounted with the token layer as well.
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/theme-spotlight').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/selection').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/active-session').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID).length, 0)
  assert.equal(styleTags.length, 4)
  assert.equal(recorded.injectCalls.length, 2)
  assert.deepEqual(Array.from(recorded.injectCalls[0].services), ['configForms'])
  assert.equal(recorded.injectCalls[0].delivered, true)
  assert.deepEqual(Array.from(recorded.injectCalls[1].services), ['slots', 'locale'])
  assert.equal(recorded.injectCalls[1].delivered, false)

  harness.releaseUiServices()
  assert.equal(recorded.slotRegistrations.length, 1)
  assert.equal(recorded.slotRegistrations[0].options.id, 'everforest')
  assert.equal(recorded.localeRegistrations.length, 1)
  assert.equal(recorded.localeRegistrations[0].ns, 'settings.everforest')
  assert.equal(styleTags.length, 5)

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

test('the development bundle mounts the debug panel into shell.overlay', async () => {
  const { module } = loadBundle({ source: composeBundle({ dev: true }), filename: 'client.dev.js' })
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  await flush()
  const { recorded } = harness

  // Both UI contributions mount: the Settings page and the dev-only overlay
  // panel, each addressed by its own slot id.
  const settings = recorded.slotRegistrations.find((entry) => entry.options.name === 'settings.section')
  const overlay = recorded.slotRegistrations.find((entry) => entry.options.name === 'shell.overlay')
  assert.ok(settings, 'the dev bundle must still register the Settings page')
  assert.ok(overlay, 'the dev bundle must register its shell.overlay panel')
  assert.equal(overlay.options.id, 'everforest-dev')
  assert.equal(overlay.options.order, 100)
  assert.equal(typeof overlay.component, 'function')
  assert.deepEqual(recorded.slotInjectKeys, ['settings.section', 'shell.overlay'])

  // The panel is a normal React component with no injected props: it closes
  // over the same store as the Settings page.
  const tree = overlay.component()
  const findBy = (node, predicate) => {
    if (node === null || node === undefined || typeof node !== 'object') return null
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = findBy(child, predicate)
        if (hit) return hit
      }
      return null
    }
    if (predicate(node)) return node
    // The integration harness's mock React keeps children on the node itself,
    // while the Settings test mock merges them into props; accept both.
    const children = []
    if (node.children !== undefined) children.push(node.children)
    if (node.props && node.props.children !== undefined) children.push(node.props.children)
    for (const child of children) {
      const hit = findBy(child, predicate)
      if (hit) return hit
    }
    return null
  }
  const root = findBy(tree, (node) => node.props && node.props['data-dev-panel'] === 'everforest-dev')
  assert.ok(root, 'the panel component did not render')
  assert.equal(root.props['data-collapsed'], 'false')

  // A chip click goes through the shared store: the token layer is re-stacked,
  // which proves the panel is wired to the real palette pipeline, not a mock.
  assert.equal(recorded.tokenLayers.length, 1)
  const chip = findBy(tree, (node) => node.props
    && node.props['data-scheme'] === 'dark'
    && node.props['data-strength'] === 'hard')
  assert.ok(chip, 'the dark-hard chip is missing')
  chip.props.onClick()
  assert.equal(recorded.tokenLayers.length, 2, 'the panel click did not replace the token layer')
  assert.notDeepEqual(recorded.tokenLayers[1].tokens, recorded.tokenLayers[0].tokens)
})

test('palette changes made by another window reach this one through the storage event', () => {
  const payload = (light, dark) => JSON.stringify({ version: STATE_VERSION, light, dark })
  const storage = createMemoryStorage({ [STORAGE_KEY]: payload('hard', 'soft') })
  const { module, window, htmlAttributes } = loadBundle({ storage })
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness
  const store = recorded.slotRegistrations[0].options.inject().store
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  assert.equal(recorded.tokenLayers.length, 1)
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')

  // Another window persists a different pairing. The browser delivers `storage`
  // to this document; the plugin must re-read the state, rebuild the token
  // layer and refresh the Settings page.
  storage.setItem(STORAGE_KEY, payload('soft', 'medium'))
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY })
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'soft', dark: 'medium' })
  assert.equal(recorded.tokenLayers.length, 2, 'the token layer was not rebuilt')
  const expected = tokensFor({ light: 'soft', dark: 'medium' })
  assert.equal(
    recorded.tokenLayers[1].tokens['--dsw-alias-bg-base'].light,
    expected['--dsw-alias-bg-base'].light,
    'the rebuilt layer does not match the other window choice',
  )

  // A legacy payload still carrying the retired colorMode flag is read as the
  // same pair: no extra layer, the always-on anchor stays on.
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'medium', colorMode: false }))
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY })
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'soft', dark: 'medium' })
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
  assert.equal(recorded.tokenLayers.length, 2, 'a legacy flag alone rebuilt the token layer')

  // Unrelated keys and an unchanged payload are ignored.
  window.dispatchEvent({ type: 'storage', key: 'some-other-plugin/v1' })
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY })
  assert.equal(recorded.tokenLayers.length, 2, 'a no-op event rebuilt the layer')

  // `clear()` in another window arrives with `key: null` and restores the defaults.
  storage.clear()
  window.dispatchEvent({ type: 'storage', key: null })
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  assert.equal(recorded.tokenLayers.length, 3)

  // Unload removes the listener: later writes must not touch the layer.
  harness.disposeAll()
  assert.equal(window.listenerCount('storage'), 0, 'storage listener survived unload')
  storage.setItem(STORAGE_KEY, payload('hard', 'hard'))
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY })
  assert.equal(recorded.tokenLayers.length, 3, 'a disposed plugin still rebuilt the layer')
})

// ---------------------------------------------------------------------------
// Host-backed durability (0.3.0 strengths, 0.4.0 color mode): configForms
// binding, adoption, migration. The fake form mirrors the real controller:
// versioned snapshots, atomic mutate ops, and a refusal that leaves the
// document unchanged.
// ---------------------------------------------------------------------------

test('a Host-stored choice is adopted on load and cached for the first frame', async () => {
  const storage = createMemoryStorage()
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'medium', dark: 'hard' },
    user: { light: 'medium', dark: 'hard' },
  })
  const { harness, htmlAttributes } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
  const store = storeOf(harness)

  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'medium', dark: 'hard' })
  assert.equal(harness.recorded.tokenLayers.length, 2, 'the adopted pair must rebuild the token layer')
  assert.equal(htmlAttributes.get('data-everforest-light'), 'medium')
  assert.equal(htmlAttributes.get('data-everforest-dark'), 'hard')
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
  const cached = JSON.parse(storage.getItem(STORAGE_KEY))
  assert.deepEqual(
    { light: cached.light, dark: cached.dark },
    { light: 'medium', dark: 'hard' },
  )
  assert.equal(Object.prototype.hasOwnProperty.call(cached, 'colorMode'), false, 'the retired flag is gone from the cache')
  assert.equal(form.record.subscribeCount, 1, 'the form must be observed for remote changes')
})

test('a legacy Host section carrying the retired colorMode flag is tolerated and adopted', async () => {
  // A 0.4.x profile patch still has `colorMode` in its config row. The schema
  // ignores unknown keys, so the section resolves to its strengths, the mode
  // stays on (shipped default), and the stale flag is never written back.
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'medium', dark: 'hard', colorMode: false },
    user: { light: 'medium', dark: 'hard', colorMode: false },
  })
  const { harness, htmlAttributes } = await mount({ harnessOptions: { form } })
  const store = storeOf(harness)

  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'medium', dark: 'hard' })
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
  store.select('light', 'soft')
  await flush()
  assert.deepEqual(form.record.mutations.at(-1).ops, [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'hard' },
  ], 'a write must only carry the two strengths, never the retired flag')
})

test('a Host value equal to the cache does not rebuild the token layer', async () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'medium', dark: 'hard' }),
  })
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'medium', dark: 'hard' },
    user: { light: 'medium', dark: 'hard' },
  })
  const { harness } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
  assert.deepEqual({ ...storeOf(harness).getSnapshot().state }, { light: 'medium', dark: 'hard' })
  assert.equal(harness.recorded.tokenLayers.length, 1, 'an equal adopt must not re-stack the layer')
})

test('a pre-0.3.0 cache choice is seeded into the Host once', async () => {
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, light: 'soft', dark: 'medium' }),
  })
  const form = createConfigForm({ status: 'ready', value: {}, user: {}, revision: 7 })
  const { harness } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
  const store = storeOf(harness)

  assert.equal(form.record.mutations.length, 1, 'the migration must write exactly once')
  assert.deepEqual(form.record.mutations[0].ops, [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'medium' },
  ])
  assert.equal(form.record.mutations[0].expectedRevision, 7, 'the seed must fence on the observed revision')
  assert.deepEqual(
    { ...store.getSnapshot().state },
    { light: 'soft', dark: 'medium' },
    'the cached choice must survive seeding',
  )
  assert.deepEqual(
    form.state.user,
    { light: 'soft', dark: 'medium' },
    'the Host now carries the migrated choice',
  )
  assert.equal(harness.recorded.tokenLayers.length, 1, 'seeding must not repaint the initial cache pair')
})

test('a legacy cache payload with the retired colorMode flag is not a real choice', async () => {
  // Only the two strengths define a real choice now. A 0.4.x cache holding the
  // default pairing plus the retired `colorMode: false` flag is the shipped
  // default (color mode is always on), so nothing is seeded.
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, ...DEFAULT_STATE, colorMode: false }),
  })
  const form = createConfigForm({ status: 'ready', value: {}, user: {}, revision: 2 })
  const { harness } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
  const store = storeOf(harness)

  assert.equal(form.record.mutations.length, 0, 'the retired flag alone must not trigger a migration')
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
})

test('no migration write happens without a real cached choice', async () => {
  const absent = createMemoryStorage()
  const shipped = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: STATE_VERSION, ...DEFAULT_STATE }),
  })
  for (const storage of [absent, shipped]) {
    const form = createConfigForm({ status: 'ready', value: {}, user: {} })
    const { harness } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
    assert.equal(form.record.mutations.length, 0)
    assert.deepEqual({ ...storeOf(harness).getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  }
})

test('a card click writes the whole state to the Host in one mutation', async () => {
  const storage = createMemoryStorage()
  const form = createConfigForm({ status: 'ready', value: {}, user: {}, revision: 4 })
  const { harness } = await mount({ harnessOptions: { form }, loadOptions: { storage } })
  const store = storeOf(harness)

  store.select('light', 'soft')
  await flush()

  assert.equal(form.record.mutations.length, 1, 'one user action must not fan out into two writes')
  assert.deepEqual(form.record.mutations[0].ops, [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'soft' },
  ])
  assert.equal(form.record.mutations[0].expectedRevision, undefined, 'a user write must not fence on an older revision')
  assert.deepEqual(form.state.user, { light: 'soft', dark: 'soft' })
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'soft', dark: 'soft' })
  const cached = JSON.parse(storage.getItem(STORAGE_KEY))
  assert.deepEqual(
    { light: cached.light, dark: cached.dark },
    { light: 'soft', dark: 'soft' },
  )
  assert.equal(Object.prototype.hasOwnProperty.call(cached, 'colorMode'), false, 'the retired flag must not come back')
})

test('restore-defaults clears the Host override with unset ops', async () => {
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'soft', dark: 'hard' },
    user: { light: 'soft', dark: 'hard' },
  })
  const { harness, htmlAttributes } = await mount({ harnessOptions: { form } })
  const store = storeOf(harness)
  assert.deepEqual(
    { ...store.getSnapshot().state },
    { light: 'soft', dark: 'hard' },
  )
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')

  store.reset()
  await flush()

  assert.equal(form.record.mutations.length, 1)
  assert.deepEqual(form.record.mutations[0].ops, [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
  ])
  assert.deepEqual(form.state.user, {}, 'the override row must disappear')
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
})

test('restore-defaults clicked while a card write is in flight still clears the Host', async () => {
  // Real writes cross the wire: until the answer folds into the mirror, the
  // snapshot still reports an empty user layer. The reset must not trust that
  // stale view — it has to queue the unset behind the in-flight set, which the
  // form controller serializes.
  const form = createConfigForm({ status: 'ready', value: {}, user: {}, revision: 1, deferMutate: true })
  const { harness } = await mount({ harnessOptions: { form } })
  const store = storeOf(harness)

  store.select('light', 'soft')
  assert.equal(form.record.mutations.length, 1, 'the card click must start one write')
  assert.deepEqual(form.state.user, {}, 'the in-flight set has not been folded yet')

  store.reset()
  assert.equal(form.record.mutations.length, 2, 'the reset must queue behind the in-flight set')
  assert.deepEqual(form.record.mutations[1].ops, [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
  ])
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })

  // Drain both writes in order: set, then the queued unset.
  await form.settle()
  await flush()
  assert.deepEqual(form.state.user, {}, 'the Host must not keep the write the user reset away')
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE }, 'the Host state must be the defaults')
})


test('a refused Host write falls back to the Host value and warns once', async () => {
  const warnings = []
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'soft', dark: 'hard' },
    user: { light: 'soft', dark: 'hard' },
    refuse: true,
  })
  const { harness } = await mount({
    harnessOptions: { form },
    loadOptions: { console: { warn: (...args) => warnings.push(args.join(' ')) } },
  })
  const store = storeOf(harness)

  store.select('light', 'medium')
  await flush()
  assert.deepEqual(
    { ...store.getSnapshot().state },
    { light: 'soft', dark: 'hard' },
    'the unaccepted value must not stick',
  )
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /refused/)

  // A second refusal must not spam the console.
  store.select('light', 'hard')
  await flush()
  assert.equal(warnings.length, 1)
})

test('a pre-0.3.0 host without configForms keeps working from localStorage', async () => {
  const storage = createMemoryStorage()
  const { harness, htmlAttributes } = await mount({ harnessOptions: { configForms: false }, loadOptions: { storage } })
  const store = storeOf(harness)

  assert.doesNotThrow(() => store.select('dark', 'hard'))
  await flush()
  assert.deepEqual({ ...store.getSnapshot().state }, {
    light: DEFAULT_STATE.light,
    dark: 'hard',
  })
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), {
    version: STATE_VERSION,
    light: DEFAULT_STATE.light,
    dark: 'hard',
  })

  // The color-mode CSS is independent of the Host settings service, so the
  // always-on attributes + stylesheet still work on a host that serves no form.
  assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
})

test('configForms arriving after apply() is adopted then', async () => {
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'medium', dark: 'hard' },
    user: { light: 'medium', dark: 'hard' },
  })
  const { harness } = await mount({ harnessOptions: { form, deferConfigForms: true } })
  const store = storeOf(harness)
  assert.deepEqual({ ...store.getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })

  harness.receiveConfigForms()
  await flush()
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'medium', dark: 'hard' })
})

test('a choice made before configForms arrives is queued and written when it binds', async () => {
  const form = createConfigForm({ status: 'ready', value: {}, user: {}, revision: 3 })
  const { harness } = await mount({ harnessOptions: { form, deferConfigForms: true } })
  const store = storeOf(harness)

  store.select('light', 'soft')
  await flush()
  assert.equal(form.record.mutations.length, 0, 'nothing can be written while the form is unbound')
  assert.deepEqual(
    { ...store.getSnapshot().state },
    { light: 'soft', dark: DEFAULT_STATE.dark },
  )

  harness.receiveConfigForms()
  await flush()
  assert.equal(form.record.mutations.length, 1, 'the queued choice must be written once')
  assert.deepEqual(form.record.mutations[0].ops, [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: DEFAULT_STATE.dark },
  ])
  assert.deepEqual(
    { ...store.getSnapshot().state },
    { light: 'soft', dark: DEFAULT_STATE.dark },
  )
})

test('a choice made in another browser is adopted through the Host broadcast', async () => {
  const form = createConfigForm({
    status: 'ready',
    value: { light: 'soft', dark: 'hard' },
    user: { light: 'soft', dark: 'hard' },
  })
  const { harness } = await mount({ harnessOptions: { form } })
  const store = storeOf(harness)
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'soft', dark: 'hard' })

  form.emit({
    user: { light: 'medium', dark: 'medium' },
    value: { light: 'medium', dark: 'medium' },
    revision: 2,
  })
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'medium', dark: 'medium' })
  assert.equal(harness.recorded.tokenLayers.length, 3, 'the broadcast pair must repaint')
})

test('unload removes the Host form subscription', async () => {
  const form = createConfigForm({ status: 'ready' })
  const { harness } = await mount({ harnessOptions: { form } })
  assert.equal(form.record.listenerCount(), 1)

  harness.disposeAll()
  assert.equal(form.record.listenerCount(), 0, 'the form subscription leaked on unload')
  form.emit({
    value: { light: 'soft', dark: 'hard' },
    user: { light: 'soft', dark: 'hard' },
  })
  assert.equal(harness.recorded.tokenLayers.length, 1, 'a disposed plugin still reacted to the Host')
})

test('the Client starts from the Host boot hint when its cache is empty', async () => {
  const bootHint = { version: STATE_VERSION, light: 'soft', dark: 'medium' }
  const { module } = loadBundle({ bootHint })
  const harness = createHarness({ configForms: false })
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const store = storeOf(harness)
  assert.deepEqual({ ...store.getSnapshot().state }, { light: 'soft', dark: 'medium' })
  const expected = tokensFor({ light: 'soft', dark: 'medium' })
  assert.equal(
    harness.recorded.tokenLayers[0].tokens['--dsw-alias-bg-base'].light,
    expected['--dsw-alias-bg-base'].light,
    'the first token layer must use the hint pair instead of the default',
  )

  // A legacy cache payload with the retired colorMode flag is ignored: the hint
  // pair still wins and no state field comes back.
  const cachedMode = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: STATE_VERSION,
      light: 'hard',
      dark: DEFAULT_STATE.dark,
      colorMode: false,
    }),
  })
  const hintedWithCache = loadBundle({ bootHint, storage: cachedMode })
  const hintedHarness = createHarness({ configForms: false })
  globalThis.require = () => mockReact
  try {
    hintedWithCache.module.apply(hintedHarness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  assert.deepEqual(
    { ...storeOf(hintedHarness).getSnapshot().state },
    { light: 'soft', dark: 'medium' },
    'the hint pair must win over a cache carrying only the retired flag',
  )
  assert.equal(hintedWithCache.htmlAttributes.get('data-everforest-color-mode'), 'on')

  // A bogus hint (old Host bundle / other plugin's global) must be ignored.
  const bogus = loadBundle({ bootHint: { version: 99, light: 'soft', dark: 'medium' } })
  const bogusHarness = createHarness({ configForms: false })
  globalThis.require = () => mockReact
  try {
    bogus.module.apply(bogusHarness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  assert.deepEqual({ ...storeOf(bogusHarness).getSnapshot().state }, { ...DEFAULT_LOCAL_STATE })
})

test('a failed Settings page setup is retried through the inject fallback', () => {
  const warnings = []
  const { module, styleTags } = loadBundle({ console: { warn: (...args) => warnings.push(args.join(' ')) } })
  const harness = createHarness()
  const originalRegister = harness.ctx.locale.register
  let attempts = 0
  harness.ctx.locale.register = (...args) => {
    attempts += 1
    if (attempts === 1) throw new Error('transient locale failure')
    return originalRegister(...args)
  }
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    assert.doesNotThrow(() => module.apply(harness.ctx), 'a Settings failure must not escape apply()')
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness

  // The first setup threw before the services gate; the flag must stay false so
  // the immediate `ctx.inject` fallback retries instead of leaving no page.
  assert.equal(attempts, 2, 'the inject fallback did not retry the Settings setup')
  assert.equal(recorded.localeRegistrations.length, 1, 'the retry registered the dictionaries twice')
  assert.equal(recorded.slotRegistrations.length, 1)
  assert.equal(recorded.slotRegistrations[0].options.id, 'everforest')
  // The color-mode stylesheet is mounted before the failure and is not part of
  // the Settings setup, so the only retried stylesheet is the settings one.
  assert.equal(tagsOwnedBy(styleTags, COLOR_MODE_CSS_OWNER).length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/theme-spotlight').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/selection').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID + '/active-session').length, 1)
  assert.equal(tagsOwnedBy(styleTags, PACKAGE_ID).length, 1)
  assert.equal(styleTags.length, 5)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /settings UI setup failed/)

  harness.disposeAll()
  assert.equal(styleTags.length, 0, 'stylesheet leaked after a retried setup')
  assert.deepEqual(recorded.localeDisposals, ['settings.everforest'])
})

test('setPreference tolerates a Host that cannot write the Appearance preference', () => {
  const warnings = []
  const { module } = loadBundle({ console: { warn: (...args) => warnings.push(args.join(' ')) } })
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const store = harness.recorded.slotRegistrations[0].options.inject().store
  harness.ctx.theme.setTheme = () => {
    throw new Error('the Host refused the write')
  }
  assert.doesNotThrow(() => store.setPreference('light'), 'a failed Appearance write escaped the store')
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /could not write the Appearance preference/)
})

test('build.mjs rejects a multi-declarator export instead of dropping the extra name', () => {
  // Commas inside initializers are legal and must keep working.
  assert.deepEqual(parseModule('single.js', 'export const a = f(1, 2)', 0).exportedNames, ['a'])
  assert.deepEqual(parseModule('array.js', "export const a = ['x', 'y']", 0).exportedNames, ['a'])
  assert.deepEqual(parseModule('string.js', "export const a = 'x,y'", 0).exportedNames, ['a'])

  // `export const a = 1, b = 2` would bundle only `a`; it must fail loudly.
  assert.throws(
    () => parseModule('multi.js', 'export const a = 1, b = 2', 0),
    (error) => error instanceof BuildError && /one export per declaration/.test(error.message),
  )
})

test('startup self-check only warns when an inherited probe is missing', async () => {
  const { SELF_CHECK_TOKENS } = await import('../src/tokens.js')

  // Emulate a healthy DSH 0.2.1-rc.2 / rc.3 body: every probe resolves by inheritance.
  // `--dsw-focus-ring-color` is absent on purpose — real DSH only sets it on
  // `html[data-input-modality=pointer] body :focus-visible`, and it must not be
  // probed (that would warn on every startup).
  const warnings = []
  const resolved = new Set(SELF_CHECK_TOKENS)
  const healthyHarness = createHarness()
  const { module: healthyModule } = loadBundle({
    body: { nodeName: 'BODY' },
    getComputedStyle: () => ({
      getPropertyValue: (name) => (resolved.has(name) ? ' 2px ' : ''),
    }),
    console: { warn: (...args) => warnings.push(args.join(' ')) },
  })
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    healthyModule.apply(healthyHarness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.deepEqual(warnings, [], `healthy tokens produced a warning: ${warnings.join(' | ')}`)
  assert.ok(!SELF_CHECK_TOKENS.includes('--dsw-focus-ring-color'), 'the focus ring must not be probed')
  healthyHarness.disposeAll()

  // A renamed/dropped probe warns exactly once and names the missing token.
  const renamed = SELF_CHECK_TOKENS[SELF_CHECK_TOKENS.length - 1]
  const partial = new Set(SELF_CHECK_TOKENS.filter((name) => name !== renamed))
  const missingWarnings = []
  const brokenHarness = createHarness()
  const { module: brokenModule } = loadBundle({
    body: { nodeName: 'BODY' },
    getComputedStyle: () => ({
      getPropertyValue: (name) => (partial.has(name) ? ' 1px ' : ''),
    }),
    console: { warn: (...args) => missingWarnings.push(args.join(' ')) },
  })
  try {
    globalThis.require = () => mockReact
    brokenModule.apply(brokenHarness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(missingWarnings.length, 1, missingWarnings.join(' | '))
  assert.match(missingWarnings[0], /DSH theme token/)
  assert.ok(missingWarnings[0].includes(renamed), `warning does not name ${renamed}`)
  brokenHarness.disposeAll()

  // No document.body (server-side/unit context): the check must stay silent.
  const noDomWarnings = []
  const noDomHarness = createHarness()
  const { module: noDomModule } = loadBundle({
    body: undefined,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    console: { warn: (...args) => noDomWarnings.push(args.join(' ')) },
  })
  try {
    globalThis.require = () => mockReact
    noDomModule.apply(noDomHarness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.deepEqual(noDomWarnings, [])
  noDomHarness.disposeAll()
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
  // 2026-10-24 accent trial: the UI accent tokens use the official palette
  // accents (fg.aqua / fg.blue), not Enchanted's muted header-* pair.
  assert.equal(layer('--dsw-alias-brand-primary').light, '#35A77C')
  assert.equal(layer('--dsw-alias-brand-primary').dark, '#83C092')
  assert.equal(layer('--dsw-alias-link').light, '#3A94C5')
  assert.equal(layer('--dsw-alias-link').dark, '#7FBBB3')
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

test('READMEs document the implemented state in both languages', () => {
  const previews = ['.github/assets/everforest-dark-soft.png', '.github/assets/everforest-light-hard.png'].sort()
  const icon = '.github/assets/everforest-icon.png'

  for (const file of ['README.md', 'README.en.md']) {
    const readme = read(file)
    assert.match(readme, /dsh-everforest/)
    assert.doesNotMatch(readme, /插件代码尚未落地/)
    assert.match(readme, /Settings → Everforest/)

    // Each language carries the two real preview screenshots (the plugin's
    // default Dark Soft / Light Hard pair) plus the header icon; every
    // referenced image must exist in the repository (the URLs are absolute for
    // the npm page).
    const referenced = [...readme.matchAll(/raw\.githubusercontent\.com\/FormalistBlue\/dsh-everforest\/[^/]+\/(\.github\/assets\/[^)\s]+\.png)/g)]
    assert.deepEqual([...new Set(referenced.map(([, path]) => path))].sort(), [...previews, icon].sort())
    for (const path of [...previews, icon]) assert.ok(existsSync(join(ROOT, path)), `missing image in ${file}: ${path}`)
  }

  // The market reads the repository-root screenshots.json (1-8 entries); it must
  // list the same two committed previews and nothing else.
  assert.deepEqual(JSON.parse(read('screenshots.json')), previews)

  // The default README is Chinese and links to the English one; the English
  // README links back.
  assert.match(read('README.md'), /README\.en\.md/)
  assert.match(read('README.en.md'), /README\.md/)
})

/**
 * Mount the real bundle against the fake harness and return the pieces the
 * palette tests need.
 * @returns {{ harness: object, recorded: object, store: object, htmlAttributes: Map }}
 */
function mountPaletteHarness() {
  const { module, htmlAttributes } = loadBundle()
  const harness = createHarness()
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const { recorded } = harness
  const store = recorded.slotRegistrations[0].options.inject().store
  return { harness, recorded, store, htmlAttributes }
}

test('same-scheme strength changes repaint instantly, without a transition window', async () => {
  const { harness, recorded, store, htmlAttributes } = mountPaletteHarness()
  try {
    // The colour fade is gone, so only the notify listener is left and nothing
    // is prepended ahead of ThemePresenter.
    assert.equal(recorded.themeListenerOptions.length, 1, 'unexpected theme/change listener count')
    assert.equal(recorded.themeListenerOptions[0].prepend, undefined)
    assert.equal(htmlAttributes.has('data-everforest-transition'), false)

    const layersBefore = recorded.tokenLayers.length
    store.select('dark', 'medium') // same scheme: strength-only change
    // One immediate re-stack, and no deferred "settled" re-apply 250 ms later.
    assert.equal(recorded.tokenLayers.length, layersBefore + 1, 'the strength change did not re-stack exactly once')
    assert.equal(htmlAttributes.has('data-everforest-transition'), false)
    await new Promise((resolve) => setTimeout(resolve, 250))
    assert.equal(
      recorded.tokenLayers.length,
      layersBefore + 1,
      'a deferred transition re-apply is still running for a strength change',
    )

    // Color mode is a pure attribute + selector layer with no switch: it stays
    // an always-on anchor and never rebuilds the token sheet.
    const layersBeforeMode = recorded.tokenLayers.length
    assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
    store.select('dark', 'hard')
    assert.equal(htmlAttributes.get('data-everforest-color-mode'), 'on')
    assert.equal(recorded.tokenLayers.length, layersBeforeMode + 1, 'a strength change must re-stack once')
    assert.equal(htmlAttributes.has('data-everforest-transition'), false)
  } finally {
    harness.disposeAll()
  }
})

test('a scheme switch through the theme service stays instant when View Transitions are unavailable', async () => {
  const { module } = loadBundle()
  const harness = createHarness()
  const original = harness.ctx.theme.setTheme
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  const wrapper = harness.ctx.theme.setTheme
  try {
    // The service instance is wrapped so DSH's own Appearance row reaches the
    // reveal; the fake document has no `startViewTransition`, so the wrapper
    // falls back to a synchronous switch.
    assert.notEqual(wrapper, original, 'the theme service was not wrapped for the Appearance row')
    wrapper.call(harness.ctx.theme, 'light')
    assert.deepEqual(harness.recorded.setThemeCalls, ['light'])
  } finally {
    harness.disposeAll()
  }
  assert.equal(harness.ctx.theme.setTheme, original, 'the theme service wrapper was not restored on unload')
})

test('an OS scheme flip while following the system reveals through the spotlight', async () => {
  const media = { matches: true }
  const harness = createHarness({ media })
  const loaded = loadBundle({
    viewTransition: true,
    // DSH's ThemeRuntime resolves `system` through this same media query, and
    // the reveal gate reads it too; `prefers-reduced-motion` stays off.
    matchMedia: (query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? media.matches : false,
    }),
  })
  const theme = harness.ctx.theme
  const original = theme.publish
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    loaded.module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  assert.notEqual(theme.publish, original, 'the theme service publish was not wrapped for OS flips')
  try {
    // The OS flips to light while the preference is `system`. ThemeRuntime's own
    // media listener calls publish(), and the wrapper has to start the View
    // Transition around that publish: the old frame is gone after it runs.
    media.matches = false
    theme.publish()
    assert.equal(loaded.transitions.length, 1, 'no View Transition was started for the OS flip')
    assert.equal(
      theme.getTheme().active.colorScheme,
      'dark',
      'the palette changed before the old frame could be snapshotted',
    )
    loaded.transitions[0].callback()
    assert.equal(theme.getTheme().active.colorScheme, 'light', 'the OS flip never reached the palette')

    // An OS flip has no click position: the reveal grows from the viewport
    // centre even though the pointer may have been recorded minutes ago.
    loaded.transitions[0].resolveReady()
    await flush()
    assert.equal(loaded.animations.length, 1)
    const [animation] = loaded.animations
    assert.match(String(animation.keyframes.clipPath[0]), /^circle\(0px at 640px 400px\)$/)
    assert.equal(animation.options.pseudoElement, '::view-transition-new(root)')
    loaded.transitions[0].resolveFinished()
    await flush()
  } finally {
    harness.disposeAll()
  }
  assert.equal(theme.publish, original, 'the publish wrapper was not restored on unload')
})

test('the OS-flip wrapper leaves every other theme publish on the instant path', async () => {
  const media = { matches: true }
  const harness = createHarness({ media })
  const loaded = loadBundle({
    viewTransition: true,
    matchMedia: (query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? media.matches : false,
    }),
  })
  const theme = harness.ctx.theme
  const originalRequire = globalThis.require
  globalThis.require = () => mockReact
  try {
    loaded.module.apply(harness.ctx)
  } finally {
    globalThis.require = originalRequire
  }
  try {
    // A publish that resolves the same scheme (strength / font change) is not an
    // OS flip: no transition.
    theme.publish()
    assert.equal(loaded.transitions.length, 0, 'a same-scheme publish started a transition')

    // A Host broadcast that changes the preference (dark -> system) reports a
    // different resolved scheme too, but its old preference was fixed: documented
    // instant path, no transition.
    theme.setTheme('dark')
    assert.deepEqual(harness.recorded.setThemeCalls, ['dark'])
    media.matches = false
    theme.preference = 'system' // adopt() by ThemeRuntime, not a setTheme call
    theme.publish()
    assert.equal(theme.getTheme().active.colorScheme, 'light')
    assert.equal(loaded.transitions.length, 0, 'a preference broadcast was treated as an OS flip')

    // The setTheme path still runs exactly one reveal: the publish it triggers
    // runs inside the transition callback and is let through by the running
    // guard instead of being wrapped a second time.
    media.matches = true
    theme.setTheme('dark')
    assert.equal(loaded.transitions.length, 1, 'the Appearance-row path did not reveal exactly once')
    assert.equal(theme.getTheme().active.colorScheme, 'light', 'the setTheme change ran before the old snapshot')
    loaded.transitions[0].callback()
    assert.equal(theme.getTheme().active.colorScheme, 'dark')
    loaded.transitions[0].resolveFinished()
    await flush()
  } finally {
    harness.disposeAll()
  }
})
