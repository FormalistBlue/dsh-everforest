import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MARKDOWN_SCOPE } from '../src/color-mode.js'
import { headerSignature } from '../src/colwidth-store.js'
import {
  COLUMN_VARIABLE,
  DRAG_ATTR,
  EDGE_ATTR,
  MAX_COLUMNS,
  MIN_COLUMN_WIDTH,
  NODE_ATTR,
  RESIZABLE_ATTR,
  SESSION_ATTR,
  clampSpan,
  installColumnResize,
  isResizeBoundary,
  memoryWidths,
  nextColumnWidths,
  normalizeWidths,
  resizeColumn,
  tableMemoryKey,
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

test('memory anchors are one contract', () => {
  // Both are README-free DSH internals (design.md §18.6): they key the width
  // memory only, so a rename loses the memory but never breaks a table.
  assert.equal(SESSION_ATTR, 'data-conversation-session')
  assert.equal(NODE_ATTR, 'data-chat-node-key')
})

/** Fake `style` object with the property surface `lock()` / `release()` use. */
function createFakeStyle() {
  const properties = new Map()
  return {
    setProperty: (name, value) => properties.set(name, value),
    getPropertyValue: (name) => (properties.has(name) ? properties.get(name) : ''),
    removeProperty: (name) => {
      properties.delete(name)
    },
    item: (index) => [...properties.keys()][index] ?? '',
    get length() {
      return properties.size
    },
    get width() {
      return properties.get('width') ?? ''
    },
    set width(value) {
      properties.set('width', value)
    },
    get maxWidth() {
      return properties.get('max-width') ?? ''
    },
    set maxWidth(value) {
      properties.set('max-width', value)
    },
  }
}

/** Fake scroll wrapper; `mdTableWide` mirrors the DSH wide-table class. */
function createFakeWrapper({ width = 747.44, mdTableWide = false } = {}) {
  const attributes = new Map()
  return {
    classList: { contains: (name) => mdTableWide && name === 'md-table-wide' },
    getBoundingClientRect: () => ({ width }),
    clientWidth: Math.floor(width),
    setAttribute(name, value) {
      attributes.set(name, value)
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
  }
}

/** Base class for fake event targets: `edgeHit` checks `target instanceof Element`. */
class FakeElement {}

/**
 * Minimal fake chat table: enough of the DOM surface `restore()` and the memory
 * key derivation use (the module's real DOM behaviour is covered by the offline
 * preview harness; these tests pin the wiring and the geometry).
 */
function createFakeTable(options = {}) {
  const {
    sessionId = 'session-1',
    nodeKey = '14:assistant-step1:61',
    headers = ['项目', '结果'],
    cellWidths = headers.map(() => 100),
    compact = false,
    ordinal = 0,
    siblings = 0,
    wrapper = createFakeWrapper(),
  } = options
  const markdown = { getAttribute: (name) => (compact && name === 'data-markdown-variant' ? 'compact' : null) }
  const session = { getAttribute: (name) => (name === SESSION_ATTR ? sessionId : null) }
  const node = {
    getAttribute: (name) => (name === NODE_ATTR ? nodeKey : null),
    querySelectorAll: () => [...before, table, ...after],
  }
  const row = { cells: [], parentElement: null }
  const tHead = { rows: [row] }
  row.parentElement = tHead
  const cells = headers.map((text, index) => {
    const cell = new FakeElement()
    const cellAttributes = new Map()
    cell.textContent = text
    cell.parentElement = row
    cell.setAttribute = (name, value) => cellAttributes.set(name, value)
    cell.getAttribute = (name) => (cellAttributes.has(name) ? cellAttributes.get(name) : null)
    cell.removeAttribute = (name) => cellAttributes.delete(name)
    cell.closest = (selector) => {
      if (selector === 'th') return cell
      if (selector === 'table') return table
      return null
    }
    cell.getBoundingClientRect = () => {
      let left = 0
      for (let column = 0; column < index; column += 1) left += cellWidths[column]
      return { width: cellWidths[index], left, right: left + cellWidths[index] }
    }
    return cell
  })
  row.cells = cells
  const attributes = new Map()
  const table = {
    isConnected: true,
    parentElement: wrapper,
    tHead,
    style: createFakeStyle(),
    setAttribute(name, value) {
      attributes.set(name, value)
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null
    },
    hasAttribute(name) {
      return attributes.has(name)
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
    closest(selector) {
      if (selector === `[${SESSION_ATTR}]`) return session
      if (selector === `[${NODE_ATTR}]`) return node
      if (selector === '[class*="markdown"]') return markdown
      return null
    },
    matches: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  // Tables rendered before this one shift its ordinal; they are other markdown
  // tables, so they count in the ordinal the same way.
  const stub = () => ({ closest: (selector) => (selector === '[class*="markdown"]' ? markdown : null) })
  const before = Array.from({ length: ordinal }, stub)
  const after = Array.from({ length: siblings }, stub)
  return table
}

test('memoryWidths rescales fill tables to the container and pins wide tables', () => {
  // Fill tables are always exactly as wide as their container: the remembered
  // pixels are proportions to be applied to today's container width, never a
  // pinned pixel sum (a stale sum is how a ghost scrollbar appears).
  const fill = memoryWidths([300, 400], { wide: false, columns: 2, containerWidth: 500 })
  assert.ok(fill !== null)
  assert.equal(fill.reduce((sum, width) => sum + width, 0), 500)
  assert.ok(fill[1] > fill[0], 'the remembered ratio survives')
  assert.ok(fill.every((width) => width * 2 === Math.round(width * 2)), 'half-pixel grid')

  // Wide tables keep the dragged pixels: the table width is the column sum and
  // the wrapper scrolls when the window is narrower.
  assert.deepEqual(memoryWidths([300, 400.24], { wide: true, columns: 2, containerWidth: 0 }), [300, 400])
  assert.deepEqual(memoryWidths([300, 400], { wide: true, columns: 2, containerWidth: 900 }), [300, 400])

  // A hidden container has no width to normalize against; the pixels go in
  // as-is and the ResizeObserver rescales them when the table becomes visible.
  assert.deepEqual(memoryWidths([300, 400], { wide: false, columns: 2, containerWidth: 0 }), [300, 400])

  // Entries that cannot apply to this table are refused outright.
  assert.equal(memoryWidths([300], { wide: false, columns: 2, containerWidth: 500 }), null)
  assert.equal(memoryWidths([300, 400, 500], { wide: false, columns: 2, containerWidth: 500 }), null)
  assert.equal(memoryWidths([300, 400], { wide: false, columns: 1, containerWidth: 500 }), null)
  assert.equal(memoryWidths([300, 400], { wide: false, columns: MAX_COLUMNS + 1, containerWidth: 500 }), null)
  assert.equal(memoryWidths([300, MIN_COLUMN_WIDTH - 1], { wide: true, columns: 2, containerWidth: 0 }), null)
  assert.equal(memoryWidths([300, Number.NaN], { wide: true, columns: 2, containerWidth: 0 }), null)
  assert.equal(memoryWidths('nope', { wide: true, columns: 2, containerWidth: 0 }), null)
})

test('tableMemoryKey joins the session, the chat node and the table ordinal', () => {
  const first = createFakeTable({ tableIndex: 0 })
  assert.equal(tableMemoryKey(first), 'session-1|14:assistant-step1:61|0')

  // A message can render several tables; the ordinal tells them apart, and it
  // counts only the markdown tables this module could ever lock.
  const second = createFakeTable({ ordinal: 1 })
  assert.equal(tableMemoryKey(second), 'session-1|14:assistant-step1:61|1')

  // Tables outside a chat node (previews, settings) are not remembered.
  const orphan = createFakeTable()
  orphan.closest = (selector) => (selector === '[class*="markdown"]' ? { getAttribute: () => null } : null)
  assert.equal(tableMemoryKey(orphan), null)
  const noSession = createFakeTable()
  noSession.closest = (selector) => {
    if (selector === `[${NODE_ATTR}]`) return { getAttribute: () => 'node' }
    if (selector === '[class*="markdown"]') return { getAttribute: () => null }
    return null
  }
  assert.equal(tableMemoryKey(noSession), null)

  // The compact reasoning variant is outside the interaction (and therefore
  // outside the memory): no key, exactly like no drag handle.
  const compact = createFakeTable({ compact: true })
  assert.equal(compact.closest('[class*="markdown"]').getAttribute('data-markdown-variant'), 'compact')
  assert.equal(tableMemoryKey(compact), null)
})

/** A fake document with the two element queries `installColumnResize` makes. */
function createFakeDocument(tables) {
  const documentListeners = new Map()
  return {
    documentElement: { nodeType: 1 },
    querySelectorAll: (selector) => (selector === '[class*="tableScroll"] > table' ? tables : []),
    addEventListener(type, listener) {
      const set = documentListeners.get(type) ?? new Set()
      documentListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener(type, listener) {
      documentListeners.get(type)?.delete(listener)
    },
    listeners: documentListeners,
  }
}

/** A fake window: only the calls the module actually makes. */
function createFakeWindow() {
  const windowListeners = new Map()
  return {
    addEventListener(type, listener) {
      const set = windowListeners.get(type) ?? new Set()
      windowListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener(type, listener) {
      windowListeners.get(type)?.delete(listener)
    },
    getComputedStyle: () => ({
      borderLeftWidth: '.5px',
      borderRightWidth: '.5px',
      paddingLeft: '0px',
      paddingRight: '0px',
    }),
    listeners: windowListeners,
  }
}

/** Read the column widths painted on a fake table, in column order. */
function fakeWidths(table) {
  const widths = []
  for (let column = 1; column <= MAX_COLUMNS; column += 1) {
    const value = table.style.getPropertyValue(`${COLUMN_VARIABLE}${column}`)
    if (value === '') break
    widths.push(Number.parseFloat(value))
  }
  return widths
}

test('installColumnResize restores remembered widths on the tables already mounted', () => {
  const table = createFakeTable()
  const reads = []
  const memory = {
    read(key, check) {
      reads.push([key, check])
      return [300, 400]
    },
    write: () => true,
    forget: () => true,
  }
  const document = createFakeDocument([table])
  const dispose = installColumnResize({ document, window: createFakeWindow(), memory })

  // The remembered set was validated against the live header, then painted
  // through the same lock path a drag uses.
  assert.deepEqual(reads, [[
    'session-1|14:assistant-step1:61|0',
    { columns: 2, signature: headerSignature(['项目', '结果']) },
  ]])
  assert.equal(table.getAttribute(RESIZABLE_ATTR), '2')
  const widths = fakeWidths(table)
  assert.equal(widths.length, 2)
  // Fill table: the sum is rescaled to the wrapper's content box (747.44 - 1px
  // of borders), never past it.
  assert.ok(widths.reduce((sum, width) => sum + width, 0) <= 746.44)
  assert.ok(widths[1] > widths[0])

  dispose()
  assert.equal(table.hasAttribute(RESIZABLE_ATTR), false, 'dispose releases the restored table')
  assert.equal(fakeWidths(table).length, 0)
})

test('installColumnResize leaves tables alone when the memory has no entry', () => {
  const table = createFakeTable()
  const memory = { read: () => null, write: () => true, forget: () => true }
  const dispose = installColumnResize({ document: createFakeDocument([table]), window: createFakeWindow(), memory })
  assert.equal(table.hasAttribute(RESIZABLE_ATTR), false)
  assert.equal(fakeWidths(table).length, 0)
  dispose()
})

test('installColumnResize restores a wide table at its remembered pixel width', () => {
  const table = createFakeTable({ headers: ['一', '二', '三', '四'], wrapper: createFakeWrapper({ mdTableWide: true }) })
  const memory = { read: () => [200, 250.5, 300, 350], write: () => true, forget: () => true }
  const dispose = installColumnResize({ document: createFakeDocument([table]), window: createFakeWindow(), memory })
  assert.equal(table.getAttribute(RESIZABLE_ATTR), '4')
  assert.deepEqual(fakeWidths(table), [200, 250.5, 300, 350])
  assert.equal(table.style.width, '1100.5px', 'wide table width is the column sum')
  assert.equal(table.style.maxWidth, 'none')
  dispose()
  assert.equal(table.style.width, '')
  assert.equal(table.style.maxWidth, '')
})

test('installColumnResize keeps a broken memory from breaking the table', () => {
  const table = createFakeTable()
  const memory = {
    read: () => {
      throw new Error('storage exploded')
    },
    write: () => true,
    forget: () => true,
  }
  const dispose = installColumnResize({ document: createFakeDocument([table]), window: createFakeWindow(), memory })
  assert.equal(table.hasAttribute(RESIZABLE_ATTR), false)
  assert.equal(fakeWidths(table).length, 0)
  dispose()
})

/** Dispatch one fake pointer event through the listeners the module registered. */
function dispatchPointer(document, type, event) {
  for (const listener of document.listeners.get(type) ?? []) listener(event)
}

/** A pointerdown on the right edge of column 0 of a fake table. */
function edgePress(table) {
  const cell = table.tHead.rows[0].cells[0]
  return {
    button: 0,
    pointerType: 'mouse',
    clientX: cell.getBoundingClientRect().right,
    target: cell,
    preventDefault() {},
  }
}

test('finishDrag remembers the final widths under the table identity', () => {
  const table = createFakeTable({ cellWidths: [300, 400] })
  const writes = []
  const memory = {
    read: () => null,
    write(key, widths, check) {
      writes.push({ key, widths, check })
      return true
    },
    forget: () => true,
  }
  const document = createFakeDocument([table])
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement
  try {
    const dispose = installColumnResize({ document, window: createFakeWindow(), memory })
    const down = edgePress(table)
    dispatchPointer(document, 'pointerdown', down)
    assert.equal(table.getAttribute(RESIZABLE_ATTR), '2')
    dispatchPointer(document, 'pointermove', { pointerType: 'mouse', clientX: down.clientX + 40, target: down.target })
    // A fill table moves the boundary between the pair: [300, 400] + 40 px.
    assert.deepEqual(fakeWidths(table), [340, 360])
    dispatchPointer(document, 'pointerup', {})
    assert.equal(writes.length, 1, 'one drag writes exactly one entry')
    assert.equal(writes[0].key, 'session-1|14:assistant-step1:61|0')
    assert.deepEqual(writes[0].widths, [340, 360], 'the remembered widths are the final ones')
    assert.deepEqual(writes[0].check, { columns: 2, signature: headerSignature(['项目', '结果']) })
    dispose()
  } finally {
    globalThis.Element = previousElement
  }
})

test('Escape cancels a drag without touching the memory', () => {
  const table = createFakeTable({ cellWidths: [300, 400] })
  let writes = 0
  const memory = {
    read: () => null,
    write() {
      writes += 1
      return true
    },
    forget: () => true,
  }
  const document = createFakeDocument([table])
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement
  try {
    const dispose = installColumnResize({ document, window: createFakeWindow(), memory })
    const down = edgePress(table)
    dispatchPointer(document, 'pointerdown', down)
    dispatchPointer(document, 'pointermove', { pointerType: 'mouse', clientX: down.clientX + 40, target: down.target })
    assert.deepEqual(fakeWidths(table), [340, 360])
    dispatchPointer(document, 'keydown', { key: 'Escape' })
    assert.equal(writes, 0, 'a canceled drag is never remembered')
    assert.deepEqual(fakeWidths(table), [300, 400], 'the drag start widths are painted back')
    assert.equal(table.getAttribute(RESIZABLE_ATTR), '2', 'the table stays locked at its start widths')
    dispose()
  } finally {
    globalThis.Element = previousElement
  }
})

test('double press restores the auto layout and forgets the remembered widths', () => {
  const table = createFakeTable({ cellWidths: [300, 400] })
  const forgotten = []
  const memory = {
    read: () => [240, 460],
    write: () => true,
    forget(key) {
      forgotten.push(key)
      return true
    },
  }
  const document = createFakeDocument([table])
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement
  try {
    const dispose = installColumnResize({ document, window: createFakeWindow(), memory })
    assert.equal(table.getAttribute(RESIZABLE_ATTR), '2', 'the seeded widths were restored first')
    const press = edgePress(table)
    dispatchPointer(document, 'pointerdown', press)
    dispatchPointer(document, 'pointerup', {})
    dispatchPointer(document, 'pointerdown', press)
    assert.deepEqual(forgotten, ['session-1|14:assistant-step1:61|0'])
    assert.equal(table.getAttribute(RESIZABLE_ATTR), null, 'the auto layout is back')
    assert.deepEqual(fakeWidths(table), [])
    dispose()
  } finally {
    globalThis.Element = previousElement
  }
})

test('a table mounted later is restored and dispose disconnects the observer', () => {
  const table = createFakeTable()
  const reads = []
  const memory = {
    read(key) {
      reads.push(key)
      return [240, 460]
    },
    write: () => true,
    forget: () => true,
  }
  const document = createFakeDocument([])
  const previousObserver = globalThis.MutationObserver
  const instances = []
  class FakeObserver {
    constructor(callback) {
      this.callback = callback
      this.disconnected = false
      instances.push(this)
    }

    observe(target, options) {
      this.target = target
      this.options = options
    }

    disconnect() {
      this.disconnected = true
    }
  }
  globalThis.MutationObserver = FakeObserver
  try {
    const dispose = installColumnResize({ document, window: createFakeWindow(), memory })
    assert.equal(instances.length, 1, 'one observer per install')
    assert.deepEqual(instances[0].options, { childList: true, subtree: true })
    assert.equal(reads.length, 0, 'nothing is restored before a table exists')
    const wrapper = {
      nodeType: 1,
      matches: (selector) => selector === '[class*="tableScroll"]',
      querySelector: () => table,
      querySelectorAll: (selector) => (selector === '[class*="tableScroll"] > table' ? [table] : []),
    }
    instances[0].callback([{ addedNodes: [wrapper] }])
    assert.deepEqual(reads, ['session-1|14:assistant-step1:61|0'])
    assert.equal(table.getAttribute(RESIZABLE_ATTR), '2')
    // The same node can be reported several times (a wrapper and its table in
    // one record); the table must be locked exactly once.
    instances[0].callback([{ addedNodes: [wrapper] }])
    assert.equal(reads.length, 1, 'restoring is idempotent')
    dispose()
    assert.equal(instances[0].disconnected, true)
    assert.equal(table.getAttribute(RESIZABLE_ATTR), null)
  } finally {
    globalThis.MutationObserver = previousObserver
  }
})

test('without a memory the controller keeps the stateless behaviour', () => {
  const table = createFakeTable({ cellWidths: [300, 400] })
  const previousObserver = globalThis.MutationObserver
  let observers = 0
  globalThis.MutationObserver = class {
    constructor() {
      observers += 1
    }
  }
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement
  try {
    const document = createFakeDocument([table])
    const dispose = installColumnResize({ document, window: createFakeWindow() })
    assert.equal(observers, 0, 'no memory means no observer and no storage')
    const down = edgePress(table)
    dispatchPointer(document, 'pointerdown', down)
    assert.equal(table.getAttribute(RESIZABLE_ATTR), '2', 'dragging still locks the table')
    dispatchPointer(document, 'pointerup', {})
    dispatchPointer(document, 'pointerdown', down)
    assert.equal(table.getAttribute(RESIZABLE_ATTR), null, 'double press still restores the auto layout')
    dispose()
  } finally {
    globalThis.MutationObserver = previousObserver
    globalThis.Element = previousElement
  }
})


test('a table unmounted with its session is released instead of retained', () => {
  const first = createFakeTable()
  const second = createFakeTable({ nodeKey: '14:assistant-step2:62' })
  const memory = { read: () => [240, 460], write: () => true, forget: () => true }
  const document = createFakeDocument([first, second])
  const previousObserver = globalThis.MutationObserver
  const instances = []
  class FakeObserver {
    constructor(callback) {
      this.callback = callback
      instances.push(this)
    }

    observe() {}

    disconnect() {}
  }
  globalThis.MutationObserver = FakeObserver
  try {
    const dispose = installColumnResize({ document, window: createFakeWindow(), memory })
    assert.equal(first.getAttribute(RESIZABLE_ATTR), '2')
    assert.equal(second.getAttribute(RESIZABLE_ATTR), '2')
    // A session switch removes the old chat subtree; the next observer batch
    // must release the detached table instead of holding its DOM for the rest
    // of the page's life.
    first.isConnected = false
    instances[0].callback([{ addedNodes: [] }])
    assert.equal(first.getAttribute(RESIZABLE_ATTR), null, 'the detached table was released')
    assert.equal(fakeWidths(first).length, 0)
    assert.equal(second.getAttribute(RESIZABLE_ATTR), '2', 'the mounted table keeps its widths')
    dispose()
  } finally {
    globalThis.MutationObserver = previousObserver
  }
})
