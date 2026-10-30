/**
 * Tests for `src/nav-icon.js` — the settings-nav glyph, without a browser.
 *
 * The real shell's `SettingsPanel` renders each `settings.section` entry as a
 * `<button>` holding the shell's gear `<svg>` and a `navLabel` span. The fake
 * document here reproduces exactly the surface the module touches (head, body,
 * one `querySelectorAll` for the nav rows, attribute writes and the observer),
 * so these tests decide the two things the feature owns: which row is claimed,
 * and whether every claim is released on dispose.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  NAV_GLYPH_SVG,
  NAV_ICON_MARKER,
  NAV_ROW_SELECTOR,
  installSettingsNavIcon,
  isOwnNavRow,
  navGlyphMaskUrl,
  navGlyphStyles,
} from '../src/nav-icon.js'

/** One nav button: text plus the attribute surface the module writes. */
function makeRow (text) {
  const attributes = new Set()
  return {
    textContent: text,
    attributes,
    setAttribute: (name) => attributes.add(name),
    removeAttribute: (name) => attributes.delete(name),
    hasAttribute: (name) => attributes.has(name),
  }
}

/** Fake `<head>`/`<body>`/`createElement`/`querySelectorAll` for the installer. */
function makeDocument (rows) {
  const tags = []
  const doc = {
    head: {
      appendChild (tag) {
        tags.push(tag)
      },
    },
    body: {},
    createElement (tagName) {
      return {
        tagName,
        dataset: {},
        textContent: '',
        remove () {
          const index = tags.indexOf(this)
          if (index >= 0) tags.splice(index, 1)
        },
      }
    },
    querySelectorAll (selector) {
      if (selector === NAV_ROW_SELECTOR) return rows
      if (selector === `[${NAV_ICON_MARKER}]`) return rows.filter((row) => row.attributes.has(NAV_ICON_MARKER))
      return []
    },
  }
  return { doc, tags }
}

/** Minimal `MutationObserver` stand-in: records instances, fires on demand. */
function makeObserverClass () {
  const instances = []
  class FakeMutationObserver {
    constructor (callback) {
      this.callback = callback
      this.disconnected = false
      this.observed = null
      instances.push(this)
    }

    observe (target, options) {
      this.observed = { target, options }
    }

    disconnect () {
      this.disconnected = true
    }

    fire () {
      if (!this.disconnected) this.callback()
    }
  }
  return { FakeMutationObserver, instances }
}

/** Flush the module's `queueMicrotask` sync after an observer notification. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

const markerRows = (rows) => rows.filter((row) => row.attributes.has(NAV_ICON_MARKER))

test('the glyph contract: marker, selector and an encoded mask URL', () => {
  assert.equal(NAV_ICON_MARKER, 'data-everforest-nav-icon')
  assert.equal(NAV_ROW_SELECTOR, '[role="dialog"] nav button')
  assert.match(NAV_GLYPH_SVG, /^<svg [^>]*viewBox="0 0 16 16"/)
  assert.match(NAV_GLYPH_SVG, /fill="#000"/)

  const url = navGlyphMaskUrl()
  assert.ok(url.startsWith('data:image/svg+xml,'))
  assert.equal(decodeURIComponent(url.slice('data:image/svg+xml,'.length)), NAV_GLYPH_SVG)
})

test('the stylesheet hides the shell gear and paints the mask in its 16px slot', () => {
  const css = navGlyphStyles()
  assert.match(css, new RegExp(`\\[${NAV_ICON_MARKER}\\] > svg \\{ display: none; \\}`))
  assert.match(css, new RegExp(`\\[${NAV_ICON_MARKER}\\]::before`))
  assert.match(css, /background-color: currentColor/)
  assert.match(css, /mask-size: 16px 16px/)
  assert.match(css, /width: 16px/)
  assert.match(css, /height: 16px/)
  assert.match(css, /data:image\/svg\+xml/)
})

test('isOwnNavRow matches only the exact visible label', () => {
  assert.equal(isOwnNavRow('Everforest', 'Everforest'), true)
  assert.equal(isOwnNavRow('  Everforest  ', ' Everforest '), true)
  assert.equal(isOwnNavRow('Everforest', 'Everforest Light'), false)
  assert.equal(isOwnNavRow('Everforest Light', 'Everforest'), false)
  assert.equal(isOwnNavRow('Everforest', ''), false)
  assert.equal(isOwnNavRow('Everforest', '   '), false)
  assert.equal(isOwnNavRow('Everforest', null), false)
  assert.equal(isOwnNavRow(null, 'Everforest'), false)
})

test('install marks the plugin row on mount and re-claims it when the label changes', async () => {
  const own = makeRow('Everforest')
  const other = makeRow('Notification reminders')
  const rows = [own, other]
  const { doc, tags } = makeDocument(rows)
  const { FakeMutationObserver, instances } = makeObserverClass()

  const previousObserver = globalThis.MutationObserver
  globalThis.MutationObserver = FakeMutationObserver
  let label = 'Everforest'
  let dispose
  try {
    dispose = installSettingsNavIcon({ document: doc, resolveLabel: () => label })
    // Style tag sits under the plugin's own owner, exactly like the plugin's
    // other sheets, and the row is claimed synchronously on install.
    assert.equal(tags.length, 1)
    assert.equal(tags[0].dataset.plugin, 'dsh-everforest')
    assert.equal(tags[0].dataset.pluginCss, 'everforest/settings-nav-icon')
    assert.deepEqual(markerRows(rows), [own])
    assert.equal(instances.length, 1)
    assert.deepEqual(instances[0].observed.options, { childList: true, subtree: true, characterData: true })

    // A second section appears later (another plugin loads, or the dialog is
    // rebuilt): the observer claims it too, and only it.
    const late = makeRow('Everforest')
    rows.push(late)
    instances[0].fire()
    await flush()
    assert.deepEqual(markerRows(rows), [own, late])

    // A locale switch changes the visible label: the old row is released and
    // the row now carrying the label is claimed.
    label = 'Everforest 主题'
    instances[0].fire()
    await flush()
    assert.deepEqual(markerRows(rows), [])

    label = 'Everforest'
    instances[0].fire()
    await flush()
    assert.deepEqual(markerRows(rows), [own, late])

    // An unresolved locale (empty label) must match nothing at all.
    label = ''
    instances[0].fire()
    await flush()
    assert.deepEqual(markerRows(rows), [])
  } finally {
    dispose?.()
    if (previousObserver === undefined) delete globalThis.MutationObserver
    else globalThis.MutationObserver = previousObserver
  }
})

test('dispose removes the markers, the stylesheet and the observer', async () => {
  const own = makeRow('Everforest')
  const rows = [own]
  const { doc, tags } = makeDocument(rows)
  const { FakeMutationObserver, instances } = makeObserverClass()

  const previousObserver = globalThis.MutationObserver
  globalThis.MutationObserver = FakeMutationObserver
  try {
    const dispose = installSettingsNavIcon({ document: doc, resolveLabel: () => 'Everforest' })
    assert.equal(tags.length, 1)
    assert.deepEqual(markerRows(rows), [own])

    dispose()
    assert.deepEqual(markerRows(rows), [])
    assert.equal(tags.length, 0, 'the stylesheet must leave with the fiber')
    assert.equal(instances[0].disconnected, true)
  } finally {
    if (previousObserver === undefined) delete globalThis.MutationObserver
    else globalThis.MutationObserver = previousObserver
  }
})

test('install is a no-op without a usable DOM or observer', () => {
  const noop = () => {}
  assert.equal(typeof installSettingsNavIcon(), 'function')
  assert.equal(typeof installSettingsNavIcon({ document: undefined, resolveLabel: noop }), 'function')
  assert.equal(typeof installSettingsNavIcon({ document: {}, resolveLabel: noop }), 'function')

  // A document with a head but no body (server-side render / bare test harness)
  // must not throw; the theme has to keep working without the settings dialog.
  const { doc, tags } = makeDocument([])
  assert.equal(typeof installSettingsNavIcon({ document: doc, resolveLabel: noop }), 'function')

  // Without an observer nothing is installed: the installer returns the no-op
  // disposer before it creates a stylesheet.
  assert.equal(tags.length, 0)
})
