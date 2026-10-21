/**
 * Unit tests for the Everforest Settings page (`src/settings-page.js`) plus the
 * locale dictionaries it renders through.
 *
 * The page is a pure `createElement` component: the client entry injects React
 * and the palette module, so here a tiny mock React (no renderer, no DOM) calls
 * the component directly and the returned element tree is inspected. This keeps
 * the component's contract — six cards, `aria-pressed`, current row, click →
 * `store.select`, reset → `store.reset` — testable in plain Node.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as palette from '../src/palette.js'
import { EN, NS, ZH } from '../src/locale.js'
import { SETTINGS_STYLES, createSettingsComponent } from '../src/settings-page.js'

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
 * Mock React namespace.
 * @param {{ withUseSyncExternalStore?: boolean }} [options] - omit
 *   `useSyncExternalStore` to exercise the `useState` + `useEffect` fallback.
 */
function createMockReact(options = {}) {
  const withUseSyncExternalStore = options.withUseSyncExternalStore !== false
  const React = {
    createElement,
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect(effect) {
      if (typeof effect === 'function') effect()
    },
  }
  if (withUseSyncExternalStore) {
    React.useSyncExternalStore = (subscribe, getSnapshot) => getSnapshot()
  }
  return React
}

/** Observable store double with the same contract as the client entry's store. */
function createMockStore(options = {}) {
  const listeners = new Set()
  const calls = { select: [], reset: 0, preference: [] }
  let snapshot = {
    state: { light: options.light ?? 'hard', dark: options.dark ?? 'soft' },
    theme: {
      preference: options.preference ?? 'system',
      active: { colorScheme: options.colorScheme ?? 'light' },
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
      snapshot = { state: { light: 'hard', dark: 'soft' }, theme: snapshot.theme }
      notify()
    },
    setPreference(preference) {
      calls.preference.push(preference)
      const colorScheme = preference === 'system'
        ? snapshot.theme.active.colorScheme
        : preference
      snapshot = { state: snapshot.state, theme: { preference, active: { colorScheme } } }
      notify()
    },
    setAppearance(preference, colorScheme) {
      snapshot = { state: snapshot.state, theme: { preference, active: { colorScheme } } }
    },
  }
}

/** English translator from the real dictionary, with `{name}` expansion. */
function translateEN(key, params) {
  const text = EN[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ))
}

/** Simplified Chinese translator from the real dictionary. */
function translateZH(key, params) {
  const text = ZH[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ))
}

/** Render the page once and return the element tree. */
function renderPage(options = {}) {
  const React = options.React ?? createMockReact()
  const Component = createSettingsComponent({
    React,
    h: React.createElement,
    palette: options.palette ?? palette,
  })
  const store = options.store === undefined ? createMockStore() : options.store
  const tree = Component({
    t: options.t ?? translateEN,
    store,
    close: () => {},
    ...options.props,
  })
  return { tree, store, Component }
}

/** Depth-first walk over a mock element tree. */
function walk(node, visit) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node !== 'object') return
  visit(node)
  walk(node.props ? node.props.children : undefined, visit)
}

function findAll(tree, predicate) {
  const result = []
  walk(tree, (node) => {
    if (predicate(node)) result.push(node)
  })
  return result
}

function findOne(tree, predicate) {
  return findAll(tree, predicate)[0]
}

/** The visible text of a subtree (string children only). */
function textContent(node) {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join('')
  if (typeof node !== 'object') return ''
  return textContent(node.props ? node.props.children : undefined)
}

const isCard = (node) => Boolean(
  node
  && node.type === 'button'
  && node.props
  && typeof node.props['data-scheme'] === 'string'
  && typeof node.props['data-strength'] === 'string',
)
const isAppearanceOption = (node) => Boolean(
  node
  && node.type === 'button'
  && node.props
  && typeof node.props['data-preference'] === 'string',
)
const byClass = (name) => (node) => Boolean(
  node
  && node.props
  && typeof node.props.className === 'string'
  && node.props.className.split(/\s+/).includes(name),
)

test('createSettingsComponent validates its injected dependencies', () => {
  assert.throws(() => createSettingsComponent(), TypeError)
  assert.throws(() => createSettingsComponent({}), TypeError)
  assert.throws(() => createSettingsComponent({ React: {} }), TypeError)
  const Component = createSettingsComponent({ React: createMockReact() })
  assert.equal(typeof Component, 'function')
})

test('source module never imports React or a Harness client package', () => {
  const source = read('src/settings-page.js')
  assert.doesNotMatch(source, /from ['"]react(['"/])/)
  assert.doesNotMatch(source, /require\(['"]react['"]\)/)
  assert.doesNotMatch(source, /from ['"]@deepseek-ai\//)
  assert.doesNotMatch(source, /require\(['"]@deepseek-ai\//)
})

test('SETTINGS_STYLES uses only design tokens for interface colors', () => {
  assert.equal(typeof SETTINGS_STYLES, 'string')
  assert.ok(SETTINGS_STYLES.length > 500, 'stylesheet looks too short')

  // No hard-coded colors: every interface color must come from a --dsw-* token
  // (Everforest palette colors are inline data in the DOM, not CSS).
  assert.doesNotMatch(SETTINGS_STYLES, /#[0-9a-f]{3,8}\b/i)
  assert.doesNotMatch(SETTINGS_STYLES, /\b(rgba?|hsla?)\s*\(/i)
  assert.doesNotMatch(SETTINGS_STYLES, /\btransparent\b/i)

  for (const marker of [
    '--dsw-alias-brand-primary',
    '--dsw-alias-settings-card-fill',
    '--dsw-alias-settings-card-stroke',
    '--dsw-alias-label-primary',
    '--dsw-alias-border-l1',
    '--dsw-focus-ring-color',
    '--dsw-radius-md',
  ]) {
    assert.ok(SETTINGS_STYLES.includes(marker), `stylesheet does not use ${marker}`)
  }

  for (const marker of [
    '.everforest-page',
    '.everforest-card',
    '.everforest-card:hover',
    '.everforest-card[aria-pressed=\'true\']',
    '.everforest-card:focus-visible',
    '.everforest-swatch',
    '.everforest-appearance-options',
    '.everforest-appearance-option[aria-pressed=\'true\']',
    '.everforest-appearance-option:focus-visible',
    '.everforest-appearance-note',
    '.everforest-reset',
  ]) {
    assert.ok(SETTINGS_STYLES.includes(marker), `stylesheet is missing ${marker}`)
  }
})

test('settings-page stylesheet does not reference Harness internals', () => {
  assert.doesNotMatch(SETTINGS_STYLES, /@deepseek-ai\//)
  assert.doesNotMatch(SETTINGS_STYLES, /styles\.insert/)
  // Class names stay namespaced.
  const classes = SETTINGS_STYLES.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []
  const foreign = classes.filter((name) => !name.startsWith('.everforest-'))
  assert.deepEqual(foreign, [], `unexpected class names: ${foreign.join(', ')}`)
})

test('locale dictionaries are complete and mirrored', () => {
  assert.equal(NS, 'settings.everforest')
  const enKeys = Object.keys(EN).sort()
  const zhKeys = Object.keys(ZH).sort()
  assert.deepEqual(zhKeys, enKeys)

  const required = [
    'nav.title',
    'intro',
    'appearance.title',
    'appearance.label',
    'appearance.system',
    'appearance.dark',
    'appearance.light',
    'appearance.systemActive',
    'appearance.fixed',
    'group.dark',
    'group.light',
    'strength.hard',
    'strength.medium',
    'strength.soft',
    'current.label',
    'current.summary',
    'current.active',
    'current.system',
    'reset',
    'hint.scheme',
    'hint.storage',
    'aria.card',
    'aria.group',
  ]
  for (const key of required) {
    assert.ok(enKeys.includes(key), `EN is missing key ${key}`)
    assert.ok(zhKeys.includes(key), `ZH is missing key ${key}`)
  }

  for (const dictionary of [EN, ZH]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, 'string', `${key} must be a string`)
      assert.ok(value.trim().length > 0, `${key} must not be empty`)
    }
  }

  // Placeholder names must match between the two languages.
  const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort().join(',')
  for (const key of enKeys) {
    assert.equal(placeholders(ZH[key]), placeholders(EN[key]), `placeholders differ for ${key}`)
  }

  // Chinese copy is actually Simplified Chinese where it matters.
  assert.match(ZH['group.dark'], /深色/)
  assert.match(ZH['group.light'], /浅色/)
  assert.match(ZH['appearance.system'], /跟随系统/)
  assert.match(ZH['appearance.systemActive'], /当前生效/)
  assert.match(ZH['hint.scheme'], /全局外观偏好/)
  assert.match(ZH['hint.storage'], /浏览器/)
  assert.match(ZH['reset'], /恢复默认/)
})

test('locale JSON metadata exists for the plugin manager', () => {
  const en = JSON.parse(read('locale/en.json'))
  const zh = JSON.parse(read('locale/zh.json'))
  assert.deepEqual(Object.keys(zh), Object.keys(en))
  for (const [id, metadata] of [['en', en], ['zh', zh]]) {
    assert.equal(metadata.meta.title, 'Everforest', `${id} meta.title`)
    assert.equal(typeof metadata.meta.description, 'string', `${id} meta.description`)
    assert.ok(metadata.meta.description.length > 30, `${id} meta.description is too short`)
    assert.match(metadata.meta.description, /Everforest/)
  }
})

test('page renders the appearance control, then two groups with three cards each', () => {
  const { tree } = renderPage()
  const cards = findAll(tree, isCard)
  assert.equal(cards.length, 6)
  assert.deepEqual(
    cards.map((card) => [card.props['data-scheme'], card.props['data-strength']]),
    [
      ['dark', 'hard'],
      ['dark', 'medium'],
      ['dark', 'soft'],
      ['light', 'hard'],
      ['light', 'medium'],
      ['light', 'soft'],
    ],
  )

  const sections = findAll(tree, (node) => node.type === 'section')
  assert.equal(sections.length, 3)
  assert.equal(textContent(findOne(sections[0], byClass('everforest-group-title'))), 'Appearance')
  assert.equal(textContent(findOne(sections[1], byClass('everforest-group-title'))), 'Dark')
  assert.equal(textContent(findOne(sections[2], byClass('everforest-group-title'))), 'Light')
  for (const section of sections) assert.ok(section.props['aria-labelledby'])

  const cardGroups = findAll(tree, (node) => (
    node.props
    && node.props.role === 'group'
    && typeof node.props.className === 'string'
    && node.props.className.split(/\s+/).includes('everforest-cards')
  ))
  assert.equal(cardGroups.length, 2)
  assert.equal(cardGroups[0].props['aria-label'], 'Dark palettes')
  assert.equal(cardGroups[1].props['aria-label'], 'Light palettes')

  // `aria-label` only reaches the accessibility tree on elements whose role
  // supports naming; a bare <div> with just a label is silently ignored.
  const labelled = findAll(tree, (node) => node.props && typeof node.props['aria-label'] === 'string')
  assert.ok(labelled.length > 0)
  for (const node of labelled) {
    const role = node.props.role ?? (node.type === 'button' ? 'button' : undefined)
    assert.ok(role, `${node.type}.${node.props.className ?? ''}: aria-label without a naming role`)
  }
})

test('default pairing selects dark soft and light hard via aria-pressed', () => {
  const { tree } = renderPage()
  const cards = findAll(tree, isCard)
  const pressed = cards
    .filter((card) => card.props['aria-pressed'] === 'true')
    .map((card) => card.props['data-scheme'] + '-' + card.props['data-strength'])
  assert.deepEqual(pressed, ['dark-soft', 'light-hard'])
  for (const card of cards) {
    assert.equal(card.props.type, 'button')
    const selected = card.props['aria-pressed'] === 'true'
    assert.equal(selected, card.props.className.includes('everforest-card-selected'))
    if (selected) {
      const mark = findOne(card, byClass('everforest-card-mark'))
      assert.ok(mark, 'selected card needs a visible mark')
      assert.equal(mark.props['aria-hidden'], 'true')
    }
  }

  // Cards are labelled with both scheme and strength, not just color.
  const darkHard = cards[0]
  assert.equal(darkHard.props['aria-label'], 'Dark Hard palette')
  const lightSoft = cards[5]
  assert.equal(lightSoft.props['aria-label'], 'Light Soft palette')
})

test('each card previews the five signature palette colors', () => {
  const { tree } = renderPage()
  const cards = findAll(tree, isCard)
  const expected = {
    'dark-hard': [
      palette.RAMPS.dark.hard.bg0,
      palette.RAMPS.dark.hard.bg1,
      palette.RAMPS.dark.hard.bg2,
      palette.FOREGROUNDS.dark.fg,
      palette.FOREGROUNDS.dark.headerAqua,
    ],
    'dark-medium': [
      palette.RAMPS.dark.medium.bg0,
      palette.RAMPS.dark.medium.bg1,
      palette.RAMPS.dark.medium.bg2,
      palette.FOREGROUNDS.dark.fg,
      palette.FOREGROUNDS.dark.headerAqua,
    ],
    'dark-soft': [
      palette.RAMPS.dark.soft.bg0,
      palette.RAMPS.dark.soft.bg1,
      palette.RAMPS.dark.soft.bg2,
      palette.FOREGROUNDS.dark.fg,
      palette.FOREGROUNDS.dark.headerAqua,
    ],
    'light-hard': [
      palette.RAMPS.light.hard.bg0,
      palette.RAMPS.light.hard.bg1,
      palette.RAMPS.light.hard.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.headerAqua,
    ],
    'light-medium': [
      palette.RAMPS.light.medium.bg0,
      palette.RAMPS.light.medium.bg1,
      palette.RAMPS.light.medium.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.headerAqua,
    ],
    'light-soft': [
      palette.RAMPS.light.soft.bg0,
      palette.RAMPS.light.soft.bg1,
      palette.RAMPS.light.soft.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.headerAqua,
    ],
  }
  for (const card of cards) {
    const id = card.props['data-scheme'] + '-' + card.props['data-strength']
    const swatch = findOne(card, byClass('everforest-swatch'))
    assert.ok(swatch, `${id} has no swatch`)
    assert.equal(swatch.props['aria-hidden'], 'true')
    const segments = findOne(card, byClass('everforest-swatch'))
      ? findAll(swatch, byClass('everforest-swatch-segment'))
      : []
    assert.equal(segments.length, 5, `${id} should have five swatch segments`)
    const colors = segments.map((segment) => segment.props.style.backgroundColor)
    assert.deepEqual(colors, expected[id], `${id} preview colors`)
    for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i)
  }
})

test('current row shows the pairing, active appearance, and system note', () => {
  const { tree } = renderPage({ store: createMockStore({ colorScheme: 'light', preference: 'system' }) })
  const current = findOne(tree, byClass('everforest-current'))
  assert.ok(current)
  assert.equal(current.props.role, 'group', 'aria-label needs a naming role to be exposed')
  assert.equal(current.props['aria-label'], 'Current choice')
  assert.equal(
    textContent(findOne(current, byClass('everforest-current-main'))),
    'Current: Dark Soft · Light Hard',
  )
  assert.equal(
    textContent(findOne(current, byClass('everforest-current-meta'))),
    'Active appearance: Light · following system',
  )
})

test('current row reflects a fixed Appearance preference', () => {
  for (const [preference, colorScheme] of [['dark', 'dark'], ['light', 'light']]) {
    const { tree } = renderPage({ store: createMockStore({ preference, colorScheme }) })
    const meta = textContent(findOne(tree, byClass('everforest-current-meta')))
    assert.equal(meta, `Active appearance: ${preference === 'dark' ? 'Dark' : 'Light'}`)
    assert.doesNotMatch(meta, /following system/)
  }
  // A fixed preference wins over a stale active scheme for the label.
  const { tree } = renderPage({ store: createMockStore({ preference: 'light', colorScheme: 'light' }) })
  assert.match(textContent(findOne(tree, byClass('everforest-current-meta'))), /Light/)
})

test('appearance control offers system, dark and light and marks the preference', () => {
  const { tree } = renderPage({ store: createMockStore({ preference: 'system', colorScheme: 'light' }) })
  const options = findAll(tree, isAppearanceOption)
  assert.deepEqual(
    options.map((option) => option.props['data-preference']),
    ['system', 'dark', 'light'],
  )
  assert.deepEqual(options.map(textContent), ['Follow system', 'Dark', 'Light'])
  assert.deepEqual(
    options.filter((option) => option.props['aria-pressed'] === 'true').map((option) => option.props['data-preference']),
    ['system'],
  )
  const group = findOne(tree, (node) => (
    node.props && node.props.role === 'group' && node.props['aria-label'] === 'Appearance preference'
  ))
  assert.ok(group)
  for (const option of options) {
    assert.equal(option.props.type, 'button')
    assert.equal(typeof option.props.onClick, 'function')
  }
  assert.equal(
    textContent(findOne(tree, byClass('everforest-appearance-note'))),
    'Following the system appearance; the active side is Light.',
  )
})

test('clicking an appearance option calls store.setPreference and re-renders', () => {
  const store = createMockStore({ preference: 'dark', colorScheme: 'dark' })
  const { tree } = renderPage({ store })
  const options = findAll(tree, isAppearanceOption)
  assert.deepEqual(
    options.filter((option) => option.props['aria-pressed'] === 'true').map((option) => option.props['data-preference']),
    ['dark'],
  )
  assert.equal(
    textContent(findOne(tree, byClass('everforest-appearance-note'))),
    'Appearance is fixed to Dark; it no longer follows the system.',
  )

  const system = options.find((option) => option.props['data-preference'] === 'system')
  system.props.onClick()
  const light = options.find((option) => option.props['data-preference'] === 'light')
  light.props.onClick()
  assert.deepEqual(store.calls.preference, ['system', 'light'])

  const { tree: updated } = renderPage({ store })
  const pressed = findAll(updated, isAppearanceOption)
    .filter((option) => option.props['aria-pressed'] === 'true')
    .map((option) => option.props['data-preference'])
  assert.deepEqual(pressed, ['light'])
  assert.match(
    textContent(findOne(updated, byClass('everforest-appearance-note'))),
    /fixed to Light/,
  )
})

test('appearance note tracks the resolved side while following the system', () => {
  const { tree } = renderPage({ store: createMockStore({ preference: 'system', colorScheme: 'dark' }) })
  assert.equal(
    textContent(findOne(tree, byClass('everforest-appearance-note'))),
    'Following the system appearance; the active side is Dark.',
  )
  // Fixed preferences win over the (stale) resolved scheme for the note.
  const { tree: fixed } = renderPage({ store: createMockStore({ preference: 'light', colorScheme: 'dark' }) })
  assert.equal(
    textContent(findOne(fixed, byClass('everforest-appearance-note'))),
    'Appearance is fixed to Light; it no longer follows the system.',
  )
})

test('clicking a card calls store.select with its scheme and strength', () => {
  const store = createMockStore()
  const { tree } = renderPage({ store })
  const cards = findAll(tree, isCard)

  cards[5].props.onClick() // light · soft
  assert.deepEqual(store.calls.select, [['light', 'soft']])

  const darkMedium = cards.find((card) => (
    card.props['data-scheme'] === 'dark' && card.props['data-strength'] === 'medium'
  ))
  darkMedium.props.onClick()
  assert.deepEqual(store.calls.select, [['light', 'soft'], ['dark', 'medium']])

  // A later render sees the new selection.
  const { tree: updated } = renderPage({ store })
  const pressed = findAll(updated, isCard)
    .filter((card) => card.props['aria-pressed'] === 'true')
    .map((card) => card.props['data-scheme'] + '-' + card.props['data-strength'])
  assert.deepEqual(pressed, ['dark-medium', 'light-soft'])
})

test('restore-defaults button calls store.reset and shows the default pairing', () => {
  const store = createMockStore({ light: 'soft', dark: 'medium' })
  const { tree } = renderPage({ store })
  const reset = findOne(tree, byClass('everforest-reset'))
  assert.ok(reset)
  assert.equal(reset.type, 'button')
  assert.equal(reset.props.type, 'button')
  assert.equal(textContent(reset), 'Restore defaults')

  reset.props.onClick()
  assert.equal(store.calls.reset, 1)
  assert.deepEqual(store.getSnapshot().state, { light: 'hard', dark: 'soft' })

  const { tree: updated } = renderPage({ store })
  const pressed = findAll(updated, isCard)
    .filter((card) => card.props['aria-pressed'] === 'true')
    .map((card) => card.props['data-scheme'] + '-' + card.props['data-strength'])
  assert.deepEqual(pressed, ['dark-soft', 'light-hard'])
})

test('page explains the Appearance write and the per-browser storage scope', () => {
  const { tree } = renderPage()
  const hints = findAll(tree, byClass('everforest-hint'))
  assert.equal(hints.length, 2)
  const text = hints.map(textContent).join('\n')
  assert.match(text, /Appearance/)
  assert.match(text, /Follow system/)
  assert.match(text, /global appearance preference/)
  assert.match(text, /browser or app window/)
  assert.match(text, /restart/)
})

test('Simplified Chinese renders translated copy and labels', () => {
  const { tree } = renderPage({ t: translateZH })
  const sections = findAll(tree, (node) => node.type === 'section')
  assert.equal(sections.length, 3)
  assert.equal(textContent(findOne(sections[0], byClass('everforest-group-title'))), '外观')
  assert.equal(textContent(findOne(sections[1], byClass('everforest-group-title'))), '深色')
  assert.equal(textContent(findOne(sections[2], byClass('everforest-group-title'))), '浅色')

  const cards = findAll(tree, isCard)
  assert.equal(cards[0].props['aria-label'], '深色 Hard 配色')
  const appearanceOptions = findAll(tree, isAppearanceOption)
  assert.deepEqual(appearanceOptions.map(textContent), ['跟随系统', '深色', '浅色'])
  assert.match(
    textContent(findOne(tree, byClass('everforest-appearance-note'))),
    /正在跟随系统外观，当前生效的是浅色。/,
  )
  assert.equal(
    textContent(findOne(tree, byClass('everforest-current-main'))),
    '当前：深色 Soft · 浅色 Hard',
  )
  assert.match(textContent(findOne(tree, byClass('everforest-current-meta'))), /跟随系统/)
  assert.equal(textContent(findOne(tree, byClass('everforest-reset'))), '恢复默认')
  assert.match(textContent(findOne(tree, byClass('everforest-intro'))), /外观/)
  const hintText = findAll(tree, byClass('everforest-hint')).map(textContent).join('\n')
  assert.match(hintText, /全局外观偏好/)
  assert.match(hintText, /浏览器 \/ 应用窗口/)
})

test('all interactive controls are native buttons', () => {
  const { tree } = renderPage()
  const buttons = findAll(tree, (node) => node.type === 'button')
  assert.equal(buttons.length, 10) // six cards + three appearance options + reset
  for (const button of buttons) {
    assert.equal(button.props.type, 'button')
    assert.equal(typeof button.props.onClick, 'function')
    assert.equal(button.props.tabIndex, undefined)
    assert.equal(button.props.disabled, undefined)
    assert.equal(button.props['aria-hidden'], undefined)
  }
})

test('falls back to useState/useEffect when useSyncExternalStore is missing', () => {
  const React = createMockReact({ withUseSyncExternalStore: false })
  assert.equal(React.useSyncExternalStore, undefined)
  const store = createMockStore({ light: 'hard', dark: 'soft' })
  const { tree } = renderPage({ React, store })
  assert.equal(findAll(tree, isCard).length, 6)
  assert.equal(
    textContent(findOne(tree, byClass('everforest-current-main'))),
    'Current: Dark Soft · Light Hard',
  )
})

test('renders safely without a store and without optional props', () => {
  const React = createMockReact()
  const Component = createSettingsComponent({ React, h: React.createElement, palette })
  const tree = Component({ t: translateEN })
  assert.equal(findAll(tree, isCard).length, 6)
  assert.equal(
    textContent(findOne(tree, byClass('everforest-current-main'))),
    'Current: Dark Soft · Light Hard',
  )
  // The no-op fallback store keeps the appearance control clickable.
  for (const option of findAll(tree, isAppearanceOption)) option.props.onClick()
  // Standard slot owner props are ignored by the page.
  const tree2 = Component({ t: translateEN, store: createMockStore(), close: () => {}, extra: 42 })
  assert.equal(findAll(tree2, isCard).length, 6)
})

test('hostile store snapshots degrade to the default pairing', () => {
  const store = {
    getSnapshot: () => ({ state: { light: 'ultra', dark: null }, theme: { preference: 'weird' } }),
    subscribe: () => () => {},
    select: () => {},
    reset: () => {},
  }
  const { tree } = renderPage({ store })
  const pressed = findAll(tree, isCard)
    .filter((card) => card.props['aria-pressed'] === 'true')
    .map((card) => card.props['data-scheme'] + '-' + card.props['data-strength'])
  assert.deepEqual(pressed, ['dark-soft', 'light-hard'])
  // Unknown preference falls back to "system" and the first scheme.
  assert.match(
    textContent(findOne(tree, byClass('everforest-current-meta'))),
    /following system/,
  )
  assert.deepEqual(
    findAll(tree, isAppearanceOption)
      .filter((option) => option.props['aria-pressed'] === 'true')
      .map((option) => option.props['data-preference']),
    ['system'],
  )
})

test('a missing palette module still renders the six default cards', () => {
  const React = createMockReact()
  const Component = createSettingsComponent({ React, h: React.createElement, palette: {} })
  const tree = Component({ t: translateEN, store: createMockStore() })
  const cards = findAll(tree, isCard)
  assert.equal(cards.length, 6)
  for (const card of cards) {
    const segments = findAll(findOne(card, byClass('everforest-swatch')), byClass('everforest-swatch-segment'))
    assert.equal(segments.length, 5)
  }
})
