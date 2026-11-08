import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

import { apply, PLUGIN_PACKAGE, pluginFrameRow, pluginFrameStyles } from '../index.js'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** The one declaration block of the sheet, without the selector list. */
function declarationOf(css) {
  const match = css.match(/\{([^}]*)\}/)
  assert.ok(match, 'the frame sheet must contain a declaration block')
  return match[1]
}

test('the frame rule is scoped to this package (name pinned to package.json)', () => {
  assert.equal(PLUGIN_PACKAGE, packageJson.name)
  const css = pluginFrameStyles()
  // Every selector must be anchored on one of DSH's stable data attributes for
  // this bundle; nothing may target the frames of other plugins.
  const selectors = css.slice(0, css.indexOf('{')).split(',').map((line) => line.trim()).filter(Boolean)
  assert.equal(selectors.length, 4)
  for (const selector of selectors) {
    assert.match(selector, new RegExp(`\\[data-(?:plugin-package|plugin-detail|market-entry)="${PLUGIN_PACKAGE}"\\]`), selector)
  }
  assert.equal((css.match(/dsh-everforest/g) || []).length, selectors.length)
})

test('the rule only clears the ring: colour only, no layout or weight', () => {
  const css = pluginFrameStyles()
  assert.equal(css.split('}').length - 1, 1, 'the sheet must be exactly one rule')
  const declarations = declarationOf(css).split(';').map((line) => line.trim()).filter(Boolean)
  assert.deepEqual(declarations, ['border-color: transparent'])
  // Border width, radius, size and spacing must stay DSH's, so the card keeps
  // its geometry when the ring disappears.
  assert.doesNotMatch(css, /\b(?:border|border-width|border-style|border-radius|width|height|margin|padding)\s*:/)
  assert.doesNotMatch(css, /!important/)
})

test('detached from the hashed class names: the selectors use [class*=] fallbacks', () => {
  const css = pluginFrameStyles()
  // The four DSH render sites: installed card, detail head, part rows, market card.
  for (const fallback of ['_cardIcon', '_rowIcon']) {
    assert.ok(css.includes(fallback), `missing hashed-class fallback ${fallback}`)
  }
  assert.ok(css.includes('> span[aria-hidden="true"]'), 'the market card icon span is not anchored')
  // No bare class selector: DSH's CSS-module hashes change per build.
  assert.doesNotMatch(css, /(?:^|[\s,])\.(?:_|[a-z])/i)
})

test('the Host half appends it as a JSON-safe style row', () => {
  const row = pluginFrameRow()
  assert.deepEqual(Object.keys(row).sort(), ['kind', 'text'])
  assert.equal(row.kind, 'style')
  assert.equal(row.text, pluginFrameStyles())
  assert.doesNotMatch(row.text, /<\/style|<!--/i, 'the style text must not terminate its element')
  assert.deepEqual(JSON.parse(JSON.stringify(row)), row, 'the row must survive the boot payload serialization')

  const table = []
  const listeners = []
  const ctx = {
    on: (event, listener) => {
      assert.equal(event, 'webserver/index-inject')
      listeners.push(listener)
      return () => {}
    },
  }
  apply(ctx)
  assert.equal(listeners.length, 1)
  listeners[0](table)
  assert.equal(table.length, 2, 'palette script + frame style')
  const style = table.find((entry) => entry.kind === 'style')
  assert.deepEqual(style, row)
})
