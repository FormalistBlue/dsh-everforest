/**
 * Unit tests for the Everforest Settings page (`src/settings-page.js`) plus the
 * locale dictionaries it renders through.
 *
 * The page is a pure `createElement` component: the client entry injects React
 * and the palette module, so here a tiny mock React (no renderer, no DOM) calls
 * the component directly and the returned element tree is inspected. This keeps
 * the component's contract — six cards, `aria-pressed`, the Appearance day/night
 * switch (`role="switch"` + `aria-checked`) and follow-system chip, current row,
 * click → `store.select` / `store.setPreference`, reset → `store.reset` —
 * testable in plain Node. Color mode has no control on the page any more (a
 * shipped default since 2026-10-24), so the tests pin its absence.
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
    state: {
      light: options.light ?? 'hard',
      dark: options.dark ?? 'soft',
    },
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
const isAppearanceSwitch = (node) => Boolean(
  node
  && node.type === 'button'
  && node.props
  && node.props.role === 'switch'
  && typeof node.props.className === 'string'
  && node.props.className.split(/\s+/).includes('everforest-appearance-switch'),
)
const isAppearanceSystem = (node) => Boolean(
  node
  && node.type === 'button'
  && node.props
  && typeof node.props.className === 'string'
  && node.props.className.split(/\s+/).includes('everforest-appearance-system'),
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
    '--dsw-alias-border-l4',
    '--dsw-alias-bg-module-platform',
    '--dsw-alias-interactive-bg-hover',
    '--dsw-focus-ring-color',
    '--dsw-radius-sm',
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
    '.everforest-appearance-row',
    '.everforest-appearance-switch',
    '.everforest-appearance-switch:focus-visible',
    '.everforest-appearance-track',
    '.everforest-appearance-orb',
    '.everforest-appearance-switch[aria-checked=\'true\'] .everforest-appearance-orb',
    '.everforest-appearance-moon-dot',
    '.everforest-appearance-cloud',
    '.everforest-appearance-forest',
    '.everforest-appearance-tree',
    '.everforest-appearance-tree-front',
    '.everforest-appearance-tree-back',
    '.everforest-appearance-stars',
    '.everforest-appearance-star',
    '.everforest-appearance-system',
    '.everforest-appearance-system[aria-pressed=\'true\']',
    '.everforest-appearance-system:focus-visible',
    '.everforest-reset',
  ]) {
    assert.ok(SETTINGS_STYLES.includes(marker), `stylesheet is missing ${marker}`)
  }

  // Color mode has no control on this page since 2026-10-24: none of the 0.4.x
  // color-mode styles may survive in the stylesheet. (The appearance switch is
  // deliberately named without the `everforest-switch-` prefix.)
  for (const gone of [
    '.everforest-color-mode',
    '.everforest-switch',
  ]) {
    assert.equal(SETTINGS_STYLES.includes(gone), false, `stylesheet still styles ${gone}`)
  }

  // Motion is decorative: reduced-motion users get the state change without the
  // spinning orb, drifting clouds or twinkling stars.
  assert.match(SETTINGS_STYLES, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(SETTINGS_STYLES, /animation: none/)
})

test('settings-page stylesheet does not reference Harness internals', () => {
  assert.doesNotMatch(SETTINGS_STYLES, /@deepseek-ai\//)
  assert.doesNotMatch(SETTINGS_STYLES, /styles\.insert/)
  // Class names stay namespaced.
  const classes = SETTINGS_STYLES.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []
  const foreign = classes.filter((name) => !name.startsWith('.everforest-'))
  assert.deepEqual(foreign, [], `unexpected class names: ${foreign.join(', ')}`)
})

test('every settings-page border uses the same hairline width', () => {
  // 2026-10-24 user report: the strength cards' selected ring (1px border plus a
  // 1px inset box-shadow) read as 2px next to the 1px appearance cubes. One
  // width for the whole page, and selection may only change the border colour.
  const solidBorders = SETTINGS_STYLES.match(/border(?:-(?:top|bottom|left|right))?:\s*[^;}]*solid/g) ?? []
  assert.ok(solidBorders.length >= 6, `expected the page borders, found ${solidBorders.length}`)
  for (const declaration of solidBorders) {
    assert.match(declaration, /var\(--everforest-border-width\)/, `border without the shared width: ${declaration}`)
  }
  const widthDeclarations = SETTINGS_STYLES.match(/--everforest-border-width:\s*[^;]+;/g) ?? []
  assert.deepEqual(
    widthDeclarations.map((value) => value.replace(/\s+/g, ' ').trim()),
    ['--everforest-border-width: .5px;'],
    'the page must declare exactly one border width'
  )
  assert.doesNotMatch(SETTINGS_STYLES, /box-shadow:/, 'selection must not thicken the outline')
})

test('locale dictionaries are complete and mirrored', () => {
  assert.equal(NS, 'settings.everforest')
  const enKeys = Object.keys(EN).sort()
  const zhKeys = Object.keys(ZH).sort()
  assert.deepEqual(zhKeys, enKeys)

  const required = [
    'nav.title',
    'appearance.title',
    'appearance.label',
    'appearance.switch',
    'appearance.system',
    'appearance.dark',
    'appearance.light',
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
    'aria.card',
    'aria.group',
  ]
  for (const key of required) {
    assert.ok(enKeys.includes(key), `EN is missing key ${key}`)
    assert.ok(zhKeys.includes(key), `ZH is missing key ${key}`)
  }
  // The 0.4.x color-mode control is gone, so its five keys are gone too: the
  // dictionaries hold exactly the 19 keys of the remaining page.
  assert.equal(enKeys.length, required.length)

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
  assert.match(ZH['reset'], /恢复默认/)
  // Removed UI copy must stay removed (2026-10-23 screenshot review removed the
  // explanatory paragraphs; 2026-10-24 removed the color-mode control itself).
  for (const removed of [
    'intro',
    'appearance.systemActive',
    'appearance.fixed',
    'colorMode.title',
    'colorMode.desc',
    'colorMode.on',
    'colorMode.off',
    'colorMode.switch',
    'colorMode.experimental',
    'hint.scheme',
    'hint.storage',
  ]) {
    assert.equal(EN[removed], undefined, `EN still has removed key ${removed}`)
    assert.equal(ZH[removed], undefined, `ZH still has removed key ${removed}`)
  }
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

test('page renders the appearance control, two groups of three cards, then the current row', () => {
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

  // Color mode has no block on the page any more: the light group is directly
  // followed by the current-choice row.
  const order = []
  walk(tree, (node) => order.push(node))
  const currentIndex = order.indexOf(findOne(tree, byClass('everforest-current')))
  assert.ok(currentIndex > order.indexOf(sections[2]), 'the current row must follow the light group')
  assert.equal(findOne(tree, byClass('everforest-color-mode')), undefined)

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
      palette.FOREGROUNDS.dark.aqua,
    ],
    'dark-medium': [
      palette.RAMPS.dark.medium.bg0,
      palette.RAMPS.dark.medium.bg1,
      palette.RAMPS.dark.medium.bg2,
      palette.FOREGROUNDS.dark.fg,
      palette.FOREGROUNDS.dark.aqua,
    ],
    'dark-soft': [
      palette.RAMPS.dark.soft.bg0,
      palette.RAMPS.dark.soft.bg1,
      palette.RAMPS.dark.soft.bg2,
      palette.FOREGROUNDS.dark.fg,
      palette.FOREGROUNDS.dark.aqua,
    ],
    'light-hard': [
      palette.RAMPS.light.hard.bg0,
      palette.RAMPS.light.hard.bg1,
      palette.RAMPS.light.hard.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.aqua,
    ],
    'light-medium': [
      palette.RAMPS.light.medium.bg0,
      palette.RAMPS.light.medium.bg1,
      palette.RAMPS.light.medium.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.aqua,
    ],
    'light-soft': [
      palette.RAMPS.light.soft.bg0,
      palette.RAMPS.light.soft.bg1,
      palette.RAMPS.light.soft.bg2,
      palette.FOREGROUNDS.light.fg,
      palette.FOREGROUNDS.light.aqua,
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

test('appearance control is a day/night switch plus a follow-system chip', () => {
  const { tree } = renderPage({ store: createMockStore({ preference: 'system', colorScheme: 'light' }) })
  const switchButton = findOne(tree, isAppearanceSwitch)
  assert.ok(switchButton, 'missing the day/night switch')
  assert.equal(switchButton.props.type, 'button')
  assert.equal(switchButton.props['aria-checked'], 'false')
  assert.equal(switchButton.props['aria-label'], 'Light and dark mode')

  const system = findOne(tree, isAppearanceSystem)
  assert.ok(system, 'missing the follow-system chip')
  assert.equal(system.type, 'button')
  assert.equal(system.props.type, 'button')
  assert.equal(system.props['aria-pressed'], 'true')
  assert.equal(textContent(system), 'Follow system')

  // The old three-cube markup (and its data attribute) is gone.
  assert.equal(findAll(tree, (node) => node.props && typeof node.props['data-preference'] === 'string').length, 0)
  assert.equal(findOne(tree, byClass('everforest-appearance-cube')), undefined)

  const row = findOne(tree, byClass('everforest-appearance-row'))
  assert.ok(row)
  assert.deepEqual(row.props.children, [switchButton, system])
  // DSH's own Appearance row shows no explanatory note; neither does this page.
  assert.equal(findOne(tree, byClass('everforest-appearance-note')), undefined)
})

test('switch mirrors the resolved scheme and toggles the fixed preference', () => {
  // `system` shows the resolved side; flipping the switch fixes the preference.
  const systemStore = createMockStore({ preference: 'system', colorScheme: 'dark' })
  const systemSwitch = findOne(renderPage({ store: systemStore }).tree, isAppearanceSwitch)
  assert.equal(systemSwitch.props['aria-checked'], 'true')
  systemSwitch.props.onClick()
  assert.deepEqual(systemStore.calls.preference, ['light'])

  const darkStore = createMockStore({ preference: 'dark', colorScheme: 'dark' })
  const darkSwitch = findOne(renderPage({ store: darkStore }).tree, isAppearanceSwitch)
  assert.equal(darkSwitch.props['aria-checked'], 'true')
  darkSwitch.props.onClick()
  assert.deepEqual(darkStore.calls.preference, ['light'])

  const lightStore = createMockStore({ preference: 'light', colorScheme: 'light' })
  const lightSwitch = findOne(renderPage({ store: lightStore }).tree, isAppearanceSwitch)
  assert.equal(lightSwitch.props['aria-checked'], 'false')
  lightSwitch.props.onClick()
  assert.deepEqual(lightStore.calls.preference, ['dark'])

  // The chip is the third DSH preference and is pressed only while following.
  const chipStore = createMockStore({ preference: 'dark', colorScheme: 'dark' })
  const chip = findOne(renderPage({ store: chipStore }).tree, isAppearanceSystem)
  assert.equal(chip.props['aria-pressed'], 'false')
  chip.props.onClick()
  assert.deepEqual(chipStore.calls.preference, ['system'])

  // A later render reflects the new preference.
  const { tree: updated } = renderPage({ store: chipStore })
  assert.equal(findOne(updated, isAppearanceSystem).props['aria-pressed'], 'true')
  assert.equal(findOne(updated, isAppearanceSwitch).props['aria-checked'], 'true')
})

test('switch renders the eighteen decorative scene SVGs and inlines palette colours', () => {
  const { tree } = renderPage()
  const switchButton = findOne(tree, isAppearanceSwitch)
  const dots = findAll(switchButton, byClass('everforest-appearance-moon-dot'))
  assert.equal(dots.length, 3)
  const clouds = findAll(switchButton, byClass('everforest-appearance-cloud'))
  assert.equal(clouds.length, 6)
  assert.equal(findAll(switchButton, byClass('everforest-appearance-cloud-shade')).length, 3)
  assert.equal(findAll(switchButton, byClass('everforest-appearance-cloud-light')).length, 3)
  const trees = findAll(switchButton, byClass('everforest-appearance-tree'))
  assert.equal(trees.length, 5)
  assert.equal(findAll(switchButton, byClass('everforest-appearance-tree-front')).length, 2)
  assert.equal(findAll(switchButton, byClass('everforest-appearance-tree-back')).length, 3)
  const stars = findAll(switchButton, byClass('everforest-appearance-star'))
  assert.equal(stars.length, 4)
  const svgs = findAll(switchButton, (node) => node.type === 'svg')
  assert.equal(svgs.length, 18)
  for (const svg of svgs) {
    assert.equal(svg.props['aria-hidden'], 'true')
    const expectedViewBox = svg.props.className.includes('star')
      ? '0 0 20 20'
      : svg.props.className.includes('tree')
        ? '0 0 20 28'
        : '0 0 100 100'
    assert.equal(svg.props.viewBox, expectedViewBox)
  }

  // Artwork colours are inline Everforest palette data, not stylesheet literals.
  const style = switchButton.props.style
  assert.equal(style['--everforest-switch-day-track'], palette.FOREGROUNDS.light.blue)
  assert.equal(style['--everforest-switch-night-track'], palette.RAMPS.dark.hard.bgDim)
  assert.equal(style['--everforest-switch-sun'], palette.FOREGROUNDS.light.yellow)
  assert.equal(style['--everforest-switch-moon'], palette.FOREGROUNDS.dark.fg)
  assert.equal(style['--everforest-switch-crater'], palette.FOREGROUNDS.dark.grey1)
  assert.equal(style['--everforest-switch-cloud'], palette.RAMPS.light.hard.bg0)
  assert.equal(style['--everforest-switch-tree'], palette.FOREGROUNDS.dark.green)
  assert.equal(style['--everforest-switch-tree-back'], palette.FOREGROUNDS.dark.aqua)
  assert.equal(style['--everforest-switch-star'], palette.FOREGROUNDS.dark.fg)

  const track = findOne(switchButton, byClass('everforest-appearance-track'))
  assert.ok(track)
  assert.equal(track.props['aria-hidden'], 'true')
  assert.equal(findOne(switchButton, byClass('everforest-appearance-forest')).props['aria-hidden'], 'true')
  assert.equal(findOne(switchButton, byClass('everforest-appearance-stars')).props['aria-hidden'], 'true')

  // Day/night scene is split: clouds only show at night, pines only by day.
  assert.match(SETTINGS_STYLES, /\.everforest-appearance-cloud \{[^}]*opacity: 0/)
  assert.match(SETTINGS_STYLES, /\[aria-checked='true'\] \.everforest-appearance-cloud \{[^}]*opacity: 1/)
  assert.match(SETTINGS_STYLES, /\.everforest-appearance-forest \{[^}]*opacity: 1/)
  assert.match(SETTINGS_STYLES, /\[aria-checked='true'\] \.everforest-appearance-forest \{[^}]*opacity: 0/)
  // The pine wood sits right of the sun (sun: left 4 + 26 = ends at x=30), so the
  // trees never overlap the sun disc.
  const treeLefts = [...SETTINGS_STYLES.matchAll(/\.everforest-appearance-tree-\d \{ left: (\d+(?:\.\d+)?)px/g)]
    .map((match) => Number(match[1]))
  assert.equal(treeLefts.length, 5, 'expected five positioned pines')
  for (const left of treeLefts) assert.ok(left > 30, `pine at ${left}px overlaps the sun`)
  // The orb must slide via its transition; a transform animation used to
  // replace the transition and made it jump + spin in place.
  assert.doesNotMatch(SETTINGS_STYLES, /rotate\(/)
  assert.match(SETTINGS_STYLES, /\.everforest-appearance-orb \{[^}]*transition: transform \.4s/)
})

test('the removed explanatory copy is gone from the page', () => {
  const { tree } = renderPage()
  for (const gone of [
    'everforest-intro',
    'everforest-appearance-note',
    'everforest-color-mode-experimental',
    'everforest-hint',
  ]) {
    assert.equal(findOne(tree, byClass(gone)), undefined, `${gone} still rendered`)
  }
  // The header keeps only its title.
  const header = findOne(tree, byClass('everforest-header'))
  assert.equal(findAll(header, (node) => node.type === 'h2').length, 1)
  assert.equal(findAll(header, (node) => node.type === 'p').length, 0)
})

test('color mode has no control on the page any more (shipped default since 2026-10-24)', () => {
  const { tree } = renderPage()
  // No section, heading, chip preview or copy for the mode.
  assert.equal(findOne(tree, byClass('everforest-color-mode')), undefined)
  assert.equal(findOne(tree, byClass('everforest-color-mode-swatch')), undefined)
  const text = textContent(tree)
  assert.doesNotMatch(text, /color mode/i)
  assert.doesNotMatch(text, /色彩模式/)

  // The only `role="switch"` on the page is the Appearance day/night switch;
  // color mode has no toggle of its own.
  const switches = findAll(tree, (node) => node.props && node.props.role === 'switch')
  assert.equal(switches.length, 1)
  assert.ok(isAppearanceSwitch(switches[0]))

  // Even a store snapshot that still carries the retired 0.4.x flag changes
  // nothing: there is no color-mode control to render and the page stays valid.
  for (const colorMode of [true, false, 'on', null]) {
    const { tree: legacy } = renderPage({
      store: {
        getSnapshot: () => ({
          state: { light: 'hard', dark: 'soft', colorMode },
          theme: { preference: 'system', active: { colorScheme: 'light' } },
        }),
        subscribe: () => () => {},
        select: () => {},
        reset: () => {},
      },
    })
    assert.equal(findAll(legacy, isCard).length, 6)
    assert.equal(findAll(legacy, (node) => node.props && node.props.role === 'switch').length, 1)
    assert.ok(isAppearanceSwitch(findOne(legacy, (node) => node.props && node.props.role === 'switch')))
  }
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

test('page keeps the current row but drops the old hint list', () => {
  const { tree } = renderPage()
  assert.equal(findAll(tree, byClass('everforest-hint')).length, 0)
  assert.equal(findAll(tree, byClass('everforest-hints')).length, 0)
  // The current row still explains the resolved appearance.
  const meta = textContent(findOne(tree, byClass('everforest-current-meta')))
  assert.match(meta, /Active appearance/)
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
  const switchButton = findOne(tree, isAppearanceSwitch)
  assert.ok(switchButton)
  assert.equal(switchButton.props['aria-label'], '明暗模式')
  assert.equal(textContent(findOne(tree, isAppearanceSystem)), '跟随系统')
  assert.equal(
    textContent(findOne(tree, byClass('everforest-current-main'))),
    '当前：深色 Soft · 浅色 Hard',
  )
  assert.match(textContent(findOne(tree, byClass('everforest-current-meta'))), /跟随系统/)
  assert.equal(textContent(findOne(tree, byClass('everforest-reset'))), '恢复默认')
  // The removed explanatory copy and the color-mode control are not rendered in
  // Chinese either.
  for (const gone of ['everforest-intro', 'everforest-hint', 'everforest-appearance-note', 'everforest-color-mode-experimental']) {
    assert.equal(findOne(tree, byClass(gone)), undefined, `${gone} still rendered`)
  }
  assert.doesNotMatch(textContent(tree), /色彩模式/)
})

test('all interactive controls are native buttons', () => {
  const { tree } = renderPage()
  const buttons = findAll(tree, (node) => node.type === 'button')
  assert.equal(buttons.length, 9) // six cards + appearance switch + follow-system chip + reset
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
  findOne(tree, isAppearanceSwitch).props.onClick()
  findOne(tree, isAppearanceSystem).props.onClick()
  assert.doesNotThrow(() => findOne(tree, byClass('everforest-reset')).props.onClick())
  // Standard slot owner props are ignored by the page.
  const tree2 = Component({ t: translateEN, store: createMockStore(), close: () => {}, extra: 42 })
  assert.equal(findAll(tree2, isCard).length, 6)
})

test('hostile store snapshots degrade to the default pairing', () => {
  const store = {
    getSnapshot: () => ({ state: { light: 'ultra', dark: null, colorMode: 'on' }, theme: { preference: 'weird' } }),
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
  assert.equal(findOne(tree, isAppearanceSystem).props['aria-pressed'], 'true')
  assert.equal(findOne(tree, isAppearanceSwitch).props['aria-checked'], 'true')
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
  // The switch still renders, with the palette1 artwork fallbacks inline.
  const switchButton = findOne(tree, isAppearanceSwitch)
  assert.ok(switchButton)
  assert.equal(switchButton.props.style['--everforest-switch-day-track'], '#3A94C5')
  assert.equal(switchButton.props.style['--everforest-switch-night-track'], '#1E2326')
  assert.equal(switchButton.props.style['--everforest-switch-tree'], '#A7C080')
  assert.equal(switchButton.props.style['--everforest-switch-tree-back'], '#83C092')
  assert.equal(findAll(switchButton, (node) => node.type === 'svg').length, 18)
})
