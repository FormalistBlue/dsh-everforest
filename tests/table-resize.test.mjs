import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MARKDOWN_SCOPE } from '../src/color-mode.js'
import {
  COLUMN_VARIABLE,
  DRAG_ATTR,
  EDGE_ATTR,
  MAX_COLUMNS,
  MIN_COLUMN_WIDTH,
  RESIZABLE_ATTR,
  clampSpan,
  installColumnResize,
  isResizeBoundary,
  nextColumnWidths,
  normalizeWidths,
  resizeColumn,
  tableResizeStyles
} from '../src/table-resize.js'
import { declarationsOf, styleRules } from './support/css.mjs'

test('resize attributes and limits are one contract', () => {
  assert.equal(RESIZABLE_ATTR, 'data-everforest-resizable')
  assert.equal(EDGE_ATTR, 'data-everforest-edge')
  assert.equal(DRAG_ATTR, 'data-everforest-col-resize')
  assert.equal(COLUMN_VARIABLE, '--everforest-col-')
  assert.equal(MIN_COLUMN_WIDTH, 64)
  assert.equal(MAX_COLUMNS, 12)
})

test('tableResizeStyles scopes every rule to the markdown content layer', () => {
  const rules = styleRules(tableResizeStyles())
  assert.ok(rules.length > MAX_COLUMNS, 'expected the generated width rules')
  for (const rule of rules) {
    if (rule.selector.startsWith('html[')) continue
    assert.ok(rule.selector.startsWith(MARKDOWN_SCOPE), `unscoped selector: ${rule.selector}`)
  }
  assert.doesNotMatch(tableResizeStyles(), /#[0-9a-zA-Z]+/)
})

test('tableResizeStyles locks fixed layout and emits one width rule per column', () => {
  const rules = styleRules(tableResizeStyles())
  const table = `table[${RESIZABLE_ATTR}]`
  const lock = rules.find((rule) => rule.selector === `${MARKDOWN_SCOPE} ${table}`)
  assert.ok(lock, 'missing table lock rule')
  assert.equal(declarationsOf(lock.body).get('table-layout'), 'fixed')

  for (let column = 1; column <= MAX_COLUMNS; column += 1) {
    const selector = `${MARKDOWN_SCOPE} ${table} > thead > tr > th:nth-child(${column})`
    const rule = rules.find((entry) => entry.selector === selector)
    assert.ok(rule, `missing width rule for column ${column}`)
    assert.equal(declarationsOf(rule.body).get('width'), `var(${COLUMN_VARIABLE}${column})`)
  }
  assert.equal(
    rules.some((rule) => rule.selector.includes(`:nth-child(${MAX_COLUMNS + 1})`)),
    false,
    'no width rule beyond MAX_COLUMNS'
  )
})

test('tableResizeStyles overrides the renderer cell caps and paints the edge guide', () => {
  const rules = styleRules(tableResizeStyles())
  const cells = rules.find((rule) => rule.selector.includes('> tbody > tr > td') && rule.selector.includes(`table[${RESIZABLE_ATTR}]`))
  assert.ok(cells, 'missing cell cap override')
  // Measured border-box widths are painted as `width`, so the cells must switch
  // to border-box or every locked column grows by its horizontal padding.
  assert.equal(declarationsOf(cells.body).get('box-sizing'), 'border-box')
  assert.equal(declarationsOf(cells.body).get('min-width'), '0')
  assert.equal(declarationsOf(cells.body).get('max-width'), 'none')

  const edge = rules.find((rule) => rule.selector === `${MARKDOWN_SCOPE} thead th[${EDGE_ATTR}]`)
  assert.ok(edge, 'missing edge cursor rule')
  assert.equal(declarationsOf(edge.body).get('cursor'), 'col-resize')

  const guide = rules.find((rule) => rule.selector === `${MARKDOWN_SCOPE} thead th[${EDGE_ATTR}]::after`)
  assert.ok(guide, 'missing edge guide rule')
  // The handle colour is a color-mode role (2026-10-30: the accent aqua was too
  // bright); the plain-token brand is only the fallback for a document without
  // the color-mode sheet.
  assert.equal(declarationsOf(guide.body).get('background-color'), 'var(--everforest-color-table-handle, var(--dsw-alias-brand-primary))')
  assert.equal(declarationsOf(guide.body).get('pointer-events'), 'none')

  // The wide table's last-column handle sits on the outer border, which the
  // clipping scroll wrapper would otherwise swallow half of.
  const outerGuide = rules.find((rule) => rule.selector === `${MARKDOWN_SCOPE} .md-table-wide thead th:last-child[${EDGE_ATTR}]::after`)
  assert.ok(outerGuide, 'missing wide last-column guide rule')
  assert.equal(declarationsOf(outerGuide.body).get('right'), '0')
})

test('tableResizeStyles keeps the guide inside the header row in every state', () => {
  const rules = styleRules(tableResizeStyles())
  // 2026-10-30 request: the handle is one header cell tall on hover and while
  // dragging — a drag highlights only the header row's border line, not the
  // whole column edge. The guide is the header cell's `::after`, so the only
  // geometry it needs is "fill the cell box".
  const guide = rules.find((rule) => rule.selector === `${MARKDOWN_SCOPE} thead th[${EDGE_ATTR}]::after`)
  assert.ok(guide, 'missing edge guide rule')
  const declarations = declarationsOf(guide.body)
  assert.equal(declarations.get('top'), '0')
  assert.equal(declarations.get('bottom'), '0')
  // No state (drag included) may add a height to the guide or a second guide
  // rule that reaches past the header row.
  assert.equal(rules.some((rule) => rule.selector.includes('::after') && declarationsOf(rule.body).has('height')), false, 'no guide height override')
  assert.equal(rules.some((rule) => rule.selector.includes(`[class*="tableScroll"][${DRAG_ATTR}] thead th[${EDGE_ATTR}]::after`)), false, 'no drag-state guide rule')
})

test('tableResizeStyles suppresses selection while dragging on the table wrapper', () => {
  const rules = styleRules(tableResizeStyles())
  // The drag state owns several rules now (cursor/selection, full-height
  // guide); the selection one is the rule that also covers the descendants.
  const drag = rules.find((rule) => rule.selector.endsWith('] *') && rule.selector.includes(`[class*="tableScroll"][${DRAG_ATTR}]`))
  assert.ok(drag, 'missing drag-state rule')
  assert.equal(declarationsOf(drag.body).get('cursor'), 'col-resize !important')
  assert.equal(declarationsOf(drag.body).get('user-select'), 'none !important')
  // A document-wide attribute selector would invalidate every element's style
  // on each drag start / end; the drag marker must stay on the table wrapper.
  assert.equal(rules.some((rule) => rule.selector.startsWith(`html[${DRAG_ATTR}]`)), false)
})

test('clampSpan keeps the pair total and both columns above the floor', () => {
  const span = clampSpan(200, 300, 40, 64)
  assert.deepEqual(span, { left: 240, right: 260 })

  const shrunk = clampSpan(200, 300, -400, 64)
  assert.equal(shrunk.left, 64)
  assert.equal(shrunk.right, 436)

  const grown = clampSpan(200, 300, 400, 64)
  assert.equal(grown.left, 436)
  assert.equal(grown.right, 64)
  assert.equal(grown.left + grown.right, 500)

  const unchanged = clampSpan(200, 300, 0, 64)
  assert.deepEqual(unchanged, { left: 200, right: 300 })
})

test('isResizeBoundary exposes the last column edge only on wide tables', () => {
  // Fill tables: every interior boundary, but not the wrapper's outer border.
  assert.equal(isResizeBoundary(0, 3, false), true)
  assert.equal(isResizeBoundary(1, 3, false), true)
  assert.equal(isResizeBoundary(2, 3, false), false)
  // Wide tables: the last column's right edge is the table's own border and
  // dragging it is how the last column (and the whole table) gets narrower.
  assert.equal(isResizeBoundary(3, 4, true), true)
  assert.equal(isResizeBoundary(2, 4, true), true)
  assert.equal(isResizeBoundary(4, 4, true), false)
  assert.equal(isResizeBoundary(-1, 4, true), false)
  assert.equal(isResizeBoundary(0, 1, true), false)
})

test('resizeColumn moves one column and lets the table follow it', () => {
  const widths = [200, 300, 240]
  // Wide tables resize the grabbed column alone: no neighbour compensation.
  assert.deepEqual(resizeColumn(widths, 1, -40, 64), [200, 260, 240])
  assert.deepEqual(resizeColumn(widths, 0, 40, 64), [240, 300, 240])
  // The last column has its own handle (table's right border).
  assert.deepEqual(resizeColumn(widths, 2, -100, 64), [200, 300, 140])
  // Floor and no-op cases.
  assert.deepEqual(resizeColumn(widths, 2, -400, 64), [200, 300, 64])
  assert.deepEqual(resizeColumn(widths, 1, 0, 64), widths)
  assert.deepEqual(resizeColumn(widths, 7, 40, 64), widths)
  // The input is never mutated and widths stay on the half-pixel grid.
  assert.deepEqual(widths, [200, 300, 240])
  assert.deepEqual(resizeColumn([100.5, 200], 0, 33, 64), [133.5, 200])
})

test('nextColumnWidths dispatches between pair redistribution and single-column resize', () => {
  // Fill tables: move the boundary between the pair, keep the pair sum.
  assert.deepEqual(nextColumnWidths([200, 300, 240], 1, 40, false), [200, 340, 200])
  // Wide tables: resize the grabbed column alone, the rest keep their widths.
  assert.deepEqual(nextColumnWidths([200, 300, 240], 1, 40, true), [200, 340, 240])
  // The last column is a boundary of its own on a wide table.
  assert.deepEqual(nextColumnWidths([200, 300, 240], 2, -100, true), [200, 300, 140])
  // The start widths are never mutated (each move recomputes from the origin).
  const start = [200, 300, 240]
  nextColumnWidths(start, 0, 10, false)
  assert.deepEqual(start, [200, 300, 240])
})

test('normalizeWidths preserves the total and the minimum width', () => {
  const widths = normalizeWidths([120, 180, 300], 600, 64)
  assert.equal(widths.length, 3)
  assert.equal(widths.reduce((sum, width) => sum + width, 0), 600)
  assert.ok(widths.every((width) => width >= 64))

  const scaled = normalizeWidths([100, 200, 100], 800, 64)
  assert.equal(scaled.reduce((sum, width) => sum + width, 0), 800)
  assert.ok(scaled[1] > scaled[0], 'proportions are kept')

  const squeezed = normalizeWidths([10, 1000], 200, 64)
  assert.equal(squeezed[0], 64)
  assert.equal(squeezed[0] + squeezed[1], 200)

  assert.deepEqual(normalizeWidths([], 300, 64), [])
  assert.deepEqual(normalizeWidths([120, 180], 0, 64), [120, 180])
})

test('normalizeWidths rounds to half pixels without drifting off the total', () => {
  const widths = normalizeWidths([333, 333, 334], 1000, 64)
  for (const width of widths) assert.equal(width * 2, Math.round(width * 2), `${width} is not a half pixel`)
  assert.equal(widths.reduce((sum, width) => sum + width, 0), 1000)
})

test('normalizeWidths never exceeds the available width (no sub-pixel scrollbar)', () => {
  // Real chat measurement: the locked column sum was rounded up to 747.5px
  // inside a 747.44px content box, which grew the fixed-layout table by 0.06px
  // and made Chromium report scrollWidth 748 — a scrollbar that cannot scroll.
  const measured = [189.359, 270.094, 287.984]
  const total = measured.reduce((sum, width) => sum + width, 0)
  const widths = normalizeWidths(measured, total, 64)
  const sum = widths.reduce((acc, width) => acc + width, 0)
  assert.ok(sum <= total, `sum ${sum} exceeds the available ${total}`)
  assert.equal(sum * 2, Math.round(sum * 2), 'widths stay on the half-pixel grid')
  for (const width of widths) assert.ok(width >= 64)

  for (const fraction of [0.01, 0.1, 0.25, 0.44, 0.49, 0.5, 0.75, 0.99]) {
    const available = 747 + fraction
    const scaled = normalizeWidths([200, 300, 247 + fraction], available, 64)
    const scaledSum = scaled.reduce((acc, width) => acc + width, 0)
    assert.ok(scaledSum <= available, `sum ${scaledSum} exceeds available ${available}`)
  }
})

test('installColumnResize is inert without a document', () => {
  const dispose = installColumnResize({})
  assert.equal(typeof dispose, 'function')
  assert.doesNotThrow(() => dispose())
})

test('installColumnResize registers document listeners and removes them on dispose', () => {
  const documentListeners = new Map()
  const windowListeners = new Map()
  const attributes = new Map()
  const document = {
    documentElement: {
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name)
    },
    addEventListener: (type, listener) => {
      const set = documentListeners.get(type) ?? new Set()
      documentListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener: (type, listener) => {
      documentListeners.get(type)?.delete(listener)
    }
  }
  const window = {
    addEventListener: (type, listener) => {
      const set = windowListeners.get(type) ?? new Set()
      windowListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener: (type, listener) => {
      windowListeners.get(type)?.delete(listener)
    }
  }

  const dispose = installColumnResize({ document, window })
  assert.deepEqual([...documentListeners.keys()].sort(), ['keydown', 'pointercancel', 'pointerdown', 'pointermove', 'pointerup'])
  assert.deepEqual([...windowListeners.keys()], ['blur'])

  dispose()
  for (const listeners of documentListeners.values()) assert.equal(listeners.size, 0)
  for (const listeners of windowListeners.values()) assert.equal(listeners.size, 0)
  assert.equal(attributes.has(DRAG_ATTR), false)
  assert.doesNotThrow(() => dispose())
})
