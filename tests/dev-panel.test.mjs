/**
 * Tests for the development-only debug panel (`src/dev-panel.js`) and for the
 * build gate that keeps it out of the published bundle.
 *
 * The panel is a pure `createElement` component like the Settings page, so the
 * same mock-React approach applies: call the component, inspect the returned
 * element tree, invoke the handlers and assert what the store received. The
 * build-gate tests pin the contract that matters for publishing — the
 * committed `client.js` is the production composition (no panel code, no
 * `// @dev-only:` markers) while `composeBundle({ dev: true })` carries the
 * panel — without writing to disk.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import { BuildError, composeBundle, stripDevBlocks } from '../scripts/build.mjs'
import { DEV_PANEL_ID, DEV_PANEL_STORAGE_KEY, DEV_PANEL_STYLES, createDevPanel } from '../src/dev-panel.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

/** Minimal `React.createElement` stand-in: builds a plain tree of nodes. */
function createElement(type, props, ...children) {
  const merged = { ...(props && typeof props === 'object' ? props : {}) }
  if (children.length === 1) merged.children = children[0]
  else if (children.length > 1) merged.children = children
  return { type, props: merged }
}

/**
 * Mock React namespace with the hooks the panel uses. `useState` accepts the
 * initial value but never re-renders (assertions inspect one render at a time
 * or render again after a persisted change), and `useRef` is a real object so
 * the drag code can mutate it.
 */
function createMockReact() {
  return {
    createElement,
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect() {},
    useRef(initial) {
      return { current: initial }
    },
    useSyncExternalStore(subscribe, getSnapshot) {
      return getSnapshot()
    },
  }
}

/** Observable store double with the client entry's store contract. */
function createMockStore(options = {}) {
  const listeners = new Set()
  const calls = { select: [], reset: 0, preference: [] }
  let snapshot = {
    state: {
      light: options.light ?? DEFAULT_STATE.light,
      dark: options.dark ?? DEFAULT_STATE.dark,
    },
    theme: {
      preference: options.preference ?? 'system',
      active: { colorScheme: options.colorScheme ?? 'dark' },
    },
  }
  function notify() {
    for (const listener of [...listeners]) listener()
  }
  return {
    calls,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    select(scheme, strength) {
      calls.select.push([scheme, strength])
      snapshot = { state: { ...snapshot.state, [scheme]: strength }, theme: snapshot.theme }
      notify()
    },
    reset() {
      calls.reset += 1
      snapshot = { state: { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }, theme: snapshot.theme }
      notify()
    },
    setPreference(preference) {
      calls.preference.push(preference)
      snapshot = { state: snapshot.state, theme: { preference, active: snapshot.theme.active } }
      notify()
    },
  }
}

/** In-memory `Storage` double; `throwOnGet` simulates a blocked storage. */
function createMemoryStorage(entries = {}, { throwOnGet = false } = {}) {
  const values = new Map(Object.entries(entries))
  return {
    get length() {
      return values.size
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => {
      if (throwOnGet) throw new DOMException('blocked', 'SecurityError')
      return values.has(key) ? values.get(key) : null
    },
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

/** Depth-first walk over the element tree produced by the mock `createElement`. */
function walk(node, visit) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node !== 'object') return
  visit(node)
  walk(node.props && node.props.children, visit)
}

/** Every element matching `predicate`. */
function findAll(tree, predicate) {
  const found = []
  walk(tree, (node) => {
    if (node !== null && typeof node === 'object' && predicate(node)) found.push(node)
  })
  return found
}

/** The panel root element(s) of one render. */
function panelRoots(tree) {
  return findAll(tree, (node) => node.props && node.props['data-dev-panel'] === DEV_PANEL_ID)
}

/** All native buttons carrying `attribute` = `value`. */
function buttonsWith(tree, attribute, value) {
  return findAll(tree, (node) => node.type === 'button' && node.props && node.props[attribute] === value)
}

/** Render the panel once with a fresh mock React. */
function renderPanel({ store = createMockStore(), storage = createMemoryStorage() } = {}) {
  const React = createMockReact()
  const Panel = createDevPanel({ React, h: React.createElement, store, storage })
  return { tree: Panel(), store, storage, React }
}

test('createDevPanel rejects a React-less dependency object', () => {
  assert.throws(() => createDevPanel({}), TypeError)
  assert.throws(() => createDevPanel(), TypeError)
})

test('the expanded panel renders appearance and the six palette chips', () => {
  const { tree, store } = renderPanel({ store: createMockStore({ light: 'hard', dark: 'soft' }) })
  const roots = panelRoots(tree)
  assert.equal(roots.length, 1)
  const root = roots[0]
  assert.equal(root.props['data-collapsed'], 'false')
  // Structural placement is inline (belt-and-braces inside a click-through
  // overlay layer); the visual styling comes from the stylesheet.
  assert.equal(root.props.style.position, 'fixed')
  assert.equal(root.props.style.left, '992px')
  assert.equal(root.props.style.top, '472px')
  assert.equal(root.props.style.pointerEvents, 'auto')
  assert.equal(typeof root.props.style.zIndex, 'number')

  // The stylesheet is mounted by the component (and unmounts with it).
  assert.equal(findAll(tree, (node) => node.type === 'style').length, 1)
  assert.match(findAll(tree, (node) => node.type === 'style')[0].props.children, /everforest-dev/);

  // Appearance: DSH order light → dark → system, system selected by default.
  const preferences = findAll(tree, (node) => node.props && node.props['data-preference'] !== undefined)
  assert.deepEqual(preferences.map((node) => node.props['data-preference']), ['light', 'dark', 'system'])
  assert.deepEqual(preferences.map((node) => node.props['aria-pressed']), ['false', 'false', 'true'])

  // Color mode is a shipped default since 2026-10-24: the panel has no switch.
  const switches = findAll(tree, (node) => node.type === 'button' && node.props && node.props.role === 'switch')
  assert.equal(switches.length, 0)
  assert.doesNotMatch(JSON.stringify(tree), /色彩模式/)

  // Six chips, selected state from the snapshot (dark soft / light hard).
  const chips = findAll(tree, (node) => node.props && node.props['data-scheme'] !== undefined)
  assert.equal(chips.length, 6)
  assert.deepEqual(
    chips.map((node) => [node.props['data-scheme'], node.props['data-strength']]),
    [
      ['dark', 'hard'], ['dark', 'medium'], ['dark', 'soft'],
      ['light', 'hard'], ['light', 'medium'], ['light', 'soft'],
    ],
  )
  const pressed = chips.filter((node) => node.props['aria-pressed'] === 'true')
  assert.deepEqual(pressed.map((node) => [node.props['data-scheme'], node.props['data-strength']]), [['dark', 'soft'], ['light', 'hard']]);
  // Palette data becomes the chip's own artwork colors, never chrome.
  assert.match(chips[3].props.style.backgroundColor, /^#[0-9A-F]{6}$/i)
  assert.match(chips[3].props.style.color, /^#[0-9A-F]{6}$/i)

  // Store untouched by rendering.
  assert.deepEqual(store.calls, { select: [], reset: 0, preference: [] })
})

test('the palette chips select their scheme and strength', () => {
  const { tree, store } = renderPanel()
  const chip = buttonsWith(tree, 'data-strength', 'medium').find((node) => node.props['data-scheme'] === 'dark')
  assert.ok(chip)
  chip.props.onClick()
  assert.deepEqual(store.calls.select, [['dark', 'medium']])
})

test('appearance options and reset write through the store', () => {
  const { tree, store } = renderPanel()
  const system = findAll(tree, (node) => node.props && node.props['data-preference'] === 'system')[0]
  system.props.onClick()
  assert.deepEqual(store.calls.preference, ['system'])

  const light = findAll(tree, (node) => node.props && node.props['data-preference'] === 'light')[0]
  light.props.onClick()
  assert.deepEqual(store.calls.preference, ['system', 'light'])

  const reset = findAll(tree, (node) => node.type === 'button' && node.props && node.props.className === 'everforest-dev-reset')[0]
  reset.props.onClick()
  assert.equal(store.calls.reset, 1)
})

test('collapsing and expanding the panel persists its state and survives a remount', () => {
  const storage = createMemoryStorage()
  const store = createMockStore()
  const first = renderPanel({ store, storage })
  const collapse = findAll(first.tree, (node) => node.type === 'button' && node.props && node.props['aria-label'] === '收起调试面板')[0]
  assert.ok(collapse)
  collapse.props.onClick()
  const stored = JSON.parse(storage.getItem(DEV_PANEL_STORAGE_KEY))
  assert.equal(stored.collapsed, true)

  // A remounted panel starts collapsed from the persisted state.
  const second = renderPanel({ store, storage })
  const fab = panelRoots(second.tree)[0]
  assert.equal(fab.type, 'button')
  assert.equal(fab.props['data-collapsed'], 'true')
  assert.equal(fab.props.style.position, 'fixed')
  assert.equal(fab.props.style.left, '992px')
  assert.equal(fab.props.style.top, '472px')
  assert.equal(fab.props.style.pointerEvents, 'auto')
  assert.equal(fab.props.children, 'EF')

  // Regression (2026-10-24): the collapsed state must keep its stylesheet —
  // it used to unmount with the expanded tree, leaving an unstyled, unclickable
  // button at the top-left corner of the click-through overlay layer.
  const collapsedStyles = findAll(second.tree, (node) => node.type === 'style')
  assert.equal(collapsedStyles.length, 1, 'the collapsed panel lost its stylesheet')
  assert.match(collapsedStyles[0].props.children, /everforest-dev-fab/)

  fab.props.onClick()
  assert.equal(JSON.parse(storage.getItem(DEV_PANEL_STORAGE_KEY)).collapsed, false)
})

test('dragging the header moves the panel and persists the new position', () => {
  const listeners = new Map()
  const fakeWindow = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  }
  const previousWindow = globalThis.window
  globalThis.window = fakeWindow
  try {
    const storage = createMemoryStorage()
    const { tree } = renderPanel({ storage })
    const header = findAll(tree, (node) => node.props && node.props.className === 'everforest-dev-header')[0]
    assert.ok(header)
    assert.ok(listeners.size === 0, 'no listeners before a drag starts')
    header.props.onPointerDown({
      clientX: 100,
      clientY: 100,
      target: {},
      preventDefault() {},
    })
    assert.equal(typeof listeners.get('pointermove'), 'function')
    assert.equal(typeof listeners.get('pointerup'), 'function')
    listeners.get('pointermove')({ clientX: 140, clientY: 130 })
    listeners.get('pointerup')()
    const stored = JSON.parse(storage.getItem(DEV_PANEL_STORAGE_KEY))
    assert.equal(stored.left, 1032)
    assert.equal(stored.top, 502)
    assert.equal(listeners.size, 0, 'drag listeners are removed on pointerup')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('a pointerdown on a header button does not start a drag', () => {
  const listeners = new Map()
  const previousWindow = globalThis.window
  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  }
  try {
    const { tree } = renderPanel()
    const header = findAll(tree, (node) => node.props && node.props.className === 'everforest-dev-header')[0]
    header.props.onPointerDown({
      clientX: 100,
      clientY: 100,
      target: { closest: () => ({}) },
      preventDefault() {},
    })
    assert.equal(listeners.size, 0)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('unreadable storage or a missing store never breaks the panel', () => {
  const blocked = createMemoryStorage({}, { throwOnGet: true })
  const React = createMockReact()
  const Panel = createDevPanel({ React, h: React.createElement, store: createMockStore(), storage: blocked })
  const tree = Panel()
  assert.equal(panelRoots(tree).length, 1)

  // No store at all: only rendering is required, actions are inert.
  const bare = createDevPanel({ React, h: React.createElement })
  const bareTree = bare()
  assert.equal(panelRoots(bareTree).length, 1)
  const chip = buttonsWith(bareTree, 'data-strength', 'soft')[0]
  chip.props.onClick()
})

test('malformed or foreign persisted payloads fall back to the default spot', () => {
  for (const payload of ['', 'null', '{oops', '[]', '{"left":"x","top":5}', '{"left":-500,"top":99999}']) {
    const storage = createMemoryStorage({ [DEV_PANEL_STORAGE_KEY]: payload })
    const { tree } = renderPanel({ storage })
    const root = panelRoots(tree)[0]
    assert.equal(root.props['data-collapsed'], 'false', `payload ${payload}`)
    const left = Number(String(root.props.style.left).replace('px', ''))
    const top = Number(String(root.props.style.top).replace('px', ''))
    assert.ok(Number.isFinite(left) && left >= 4 && left <= 1200, `left for ${payload}`)
    assert.ok(Number.isFinite(top) && top >= 4 && top <= 760, `top for ${payload}`)
  }
})

test('the stylesheet is self-contained and scoped to the panel', () => {
  assert.match(DEV_PANEL_STYLES, /\.everforest-dev\s*\{/)
  assert.match(DEV_PANEL_STYLES, /pointer-events:\s*auto/)
  // No global element selector: every rule is scoped under a panel class.
  for (const selector of DEV_PANEL_STYLES.split('\n').filter((line) => line.includes('{'))) {
    assert.ok(selector.trim().startsWith('.everforest-dev'), `unscoped rule: ${selector}`)
  }
})

test('stripDevBlocks keeps dev-only code only in the development bundle', () => {
  const source = ['before', '// @dev-only:start', 'panel()', '// @dev-only:end', 'after'].join('\n')
  assert.equal(stripDevBlocks('x.js', source), 'before\nafter')
  assert.equal(stripDevBlocks('x.js', source, { dev: true }), 'before\npanel()\nafter')
})

test('stripDevBlocks rejects unbalanced markers instead of guessing', () => {
  assert.throws(() => stripDevBlocks('x.js', '// @dev-only:start\ncode'), BuildError)
  assert.throws(() => stripDevBlocks('x.js', 'code\n// @dev-only:end'), BuildError)
  assert.throws(() => stripDevBlocks('x.js', '// @dev-only:start\n// @dev-only:start\n// @dev-only:end'), BuildError)
})

test('the production composition carries no dev-panel code; the dev one does', () => {
  const prod = composeBundle()
  const dev = composeBundle({ dev: true })
  for (const marker of [DEV_PANEL_ID, 'dev-panel.js', 'DEV_PANEL_STORAGE_KEY', 'createDevPanel', '@dev-only']) {
    assert.ok(!prod.includes(marker), `production bundle must not contain ${marker}`)
  }
  assert.ok(dev.includes(`id: '${DEV_PANEL_ID}'`))
  assert.ok(dev.includes('src/dev-panel.js'))
  assert.ok(dev.includes('DEVELOPMENT BUILD'))
  assert.ok(dev.length > prod.length)
  // Both compositions must be valid scripts.
  new vm.Script(prod, { filename: 'client.prod.js' })
  new vm.Script(dev, { filename: 'client.dev.js' })
})

test('the committed client.js is exactly the production composition', () => {
  assert.equal(read('client.js'), composeBundle())
})

test('--check verifies the production bundle and rejects --check --dev', () => {
  const conflicting = spawnSync(process.execPath, ['scripts/build.mjs', '--check', '--dev'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  })
  assert.equal(conflicting.status, 1)
  assert.match(conflicting.stderr, /--check always verifies the production bundle/)

  const productionCheck = spawnSync(process.execPath, ['scripts/build.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  })
  assert.equal(productionCheck.status, 0, productionCheck.stdout + productionCheck.stderr)
})

test('package.json exposes the dev build script', () => {
  const manifest = JSON.parse(read('package.json'))
  assert.equal(manifest.scripts['build:dev'], 'node scripts/build.mjs --dev')
  assert.equal(manifest.scripts.build, 'node scripts/build.mjs')
  assert.equal(manifest.scripts.prepack, 'node scripts/build.mjs -C')
  // The dev panel must not be published: it is neither in `files` nor reachable
  // from the production bundle.
  assert.ok(!manifest.files.includes('src/dev-panel.js'))
})
