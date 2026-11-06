/**
 * Tests for `src/nav-icon.js` — the settings-nav glyph component, without a browser.
 *
 * DSH 0.2.2 added the official `settings.section.icon` slot; the plugin only
 * builds the component (the registration lives in `src/client-entry.js`). The
 * fake `h` below records the element tree the component returns, so these tests
 * pin the glyph contract the shell's icon span relies on: a square SVG painted
 * with `currentColor` at the requested size.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NAV_GLYPH_PATH, NAV_ICON_SLOT, createSettingsNavIcon } from '../src/nav-icon.js'

/** Minimal `createElement` stand-in that records the element tree. */
const h = (type, props, ...children) => ({ type, props: props ?? {}, children })

test('the icon contract: official slot name and the pine mark', () => {
  assert.equal(NAV_ICON_SLOT, 'settings.section.icon')
  // Single-colour pine reduced from the package icon, drawn on a 16px viewBox.
  assert.match(NAV_GLYPH_PATH, /^M8 1\.2 /)
  assert.ok(NAV_GLYPH_PATH.length > 20)
})

test('the component paints a square SVG in currentColor at the requested size', () => {
  const SettingsNavIcon = createSettingsNavIcon({ h })
  const svg = SettingsNavIcon({ size: 20, active: true })
  assert.equal(svg.type, 'svg')
  assert.equal(svg.props.width, 20)
  assert.equal(svg.props.height, 20)
  assert.equal(svg.props.viewBox, '0 0 16 16')
  assert.equal(svg.props.fill, 'currentColor')
  assert.equal(svg.props['aria-hidden'], 'true')
  assert.equal(svg.props.focusable, 'false')
  assert.equal(svg.children.length, 1)
  const [path] = svg.children
  assert.equal(path.type, 'path')
  assert.equal(path.props.d, NAV_GLYPH_PATH)
})

test('the component defaults to the shell 16px icon size and tolerates a bad size', () => {
  const SettingsNavIcon = createSettingsNavIcon({ h })
  assert.equal(SettingsNavIcon().props.width, 16)
  assert.equal(SettingsNavIcon().props.height, 16)
  // A future shell passing an unusable size must still get a valid SVG.
  for (const size of [Number.NaN, 0, -4, undefined]) {
    const svg = SettingsNavIcon({ size })
    assert.equal(svg.props.width, 16, String(size))
    assert.equal(svg.props.height, 16, String(size))
  }
})

test('building the component without a createElement is a loud error', () => {
  assert.throws(() => createSettingsNavIcon(), /h must be a function/)
  assert.throws(() => createSettingsNavIcon({ h: null }), /h must be a function/)
})
