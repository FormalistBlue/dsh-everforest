// Interactive column resizing for chat markdown tables.
//
// DSH renders every markdown table as
//
//   <div class="…tableScroll…"><table><thead><tr><th>…
//
// with no React extension point for tables (MarkdownText is a memoized switch
// over mdast nodes), so this module owns the interaction on the DOM level and
// never renders, inserts, or moves a node. It only
//
//   - tags a table with `data-everforest-resizable` and one pixel width per
//     column (`--everforest-col-N`) after the user starts a drag,
//   - switches that table to `table-layout: fixed` so the widths win over the
//     auto layout the renderer picked,
//   - paints a hover guide on the right edge of every header cell and drives a
//     drag from document-level pointer events. Fill tables (fewer than four
//     columns, width 100%) re-distribute the pair sum, so the table keeps its
//     width; wide tables (`md-table-wide`, natural width inside a horizontal
//     scroller) resize the column alone and the table width follows the column
//     sum — every column, the last one included, has its own right-edge handle,
//     so the whole table can be made narrower instead of pushing the slack into
//     the last column (Element-UI behaviour),
//   - rescales the locked widths when the chat column is resized (fill tables),
//   - restores DSH's automatic layout on double click / when the user presses
//     Escape during a drag.
//
// Everything is reversible: removing the attribute, the custom properties and
// the inline width returns the table to the renderer's own layout.
//
// A table the renderer unmounts (a session switch, a reload) would come back in
// the automatic layout, so an optional `memory` object remembers the widths the
// user dragged under a stable per-table key: the conversation id, the chat node
// (message) key and the table's ordinal inside that node. `src/colwidth-store.js`
// owns the persistence; this module only derives the key and repairs the saved
// pixels for the current layout. Without `memory` the interaction is exactly the
// stateless version it used to be.
//
// Column resizing is mouse/pen only: a touch drag on a header would fight the
// horizontal scroll of a wide table.

import { MARKDOWN_SCOPE } from './color-mode.js'
import { headerSignature, tableWidthKey } from './colwidth-store.js'

/** Marks a table whose columns are locked to explicit pixel widths. */
export const RESIZABLE_ATTR = 'data-everforest-resizable'

/** Marks the header cell whose right edge is currently under the pointer. */
export const EDGE_ATTR = 'data-everforest-edge'

/** Marks the table's scroll wrapper while a column drag is in flight. */
export const DRAG_ATTR = 'data-everforest-col-resize'

/** Per-column custom property prefix; column 1 is `--everforest-col-1`. */
export const COLUMN_VARIABLE = '--everforest-col-'

/** Smallest width the drag leaves a column; the frame padding is 32px. */
export const MIN_COLUMN_WIDTH = 64

/** Largest table enhanced; the stylesheet emits one width rule per column. */
export const MAX_COLUMNS = 12

/** Pointer distance (px, inside the cell) that hits a column boundary. */
export const EDGE_ZONE = 6

/** Two presses on one boundary within this window restore the auto layout. */
const DOUBLE_PRESS_MS = 500

/** ...and only when the two presses land this close together (px). */
const DOUBLE_PRESS_DISTANCE = 8

/**
 * DSH anchor of the chat surface a table lives in: the conversation id on the
 * content root. Internal renderer attribute (design.md §18.6), used only to key
 * the width memory — a table without it is simply not remembered.
 */
export const SESSION_ATTR = 'data-conversation-session'

/** Chat node (message) key anchor; see {@link SESSION_ATTR}. */
export const NODE_ATTR = 'data-chat-node-key'

/**
 * Move the boundary between two adjacent columns by `delta`, keeping their
 * combined width (`left + right`) constant and both columns at least `min` wide.
 * The caller ends up with two widths that sum to the same total, which keeps
 * the table width stable during the drag.
 * @param {number} left - starting width of the left column.
 * @param {number} right - starting width of the right column.
 * @param {number} delta - pointer movement in px (rightward positive).
 * @param {number} min - minimum width of either column.
 * @returns {{ left: number, right: number }}
 */
export function clampSpan (left, right, delta, min) {
  const total = left + right
  if (!(total > 0)) return { left, right }
  const floor = Math.min(min, total / 2)
  const nextLeft = Math.min(Math.max(left + delta, floor), total - floor)
  return { left: nextLeft, right: total - nextLeft }
}

/**
 * Resize one column by `delta`, leaving every other column untouched. Used for
 * wide tables: their width is not tied to the text column, so shrinking a column
 * must shrink the table (and its horizontal scroller) instead of handing the
 * freed space to the next column. Every column has a right-edge handle, the last
 * one included — dragging the table's right border resizes the last column.
 * Widths stay on the half-pixel grid the browser renders crisply.
 * @param {number[]} widths - current column widths.
 * @param {number} index - column to resize.
 * @param {number} delta - pointer movement in px (rightward positive).
 * @param {number} min - minimum width of the column.
 * @returns {number[]} the new widths, same length and order.
 */
export function resizeColumn (widths, index, delta, min) {
  const next = widths.slice()
  if (index < 0 || index >= next.length) return next
  next[index] = Math.max(min, Math.round((widths[index] + delta) * 2) / 2)
  return next
}

/**
 * The column set after moving the boundary at `index` by `delta`. Wide tables
 * resize the grabbed column alone (the table width follows the sum); fill tables
 * move the boundary between the pair and keep its sum. The start widths are
 * never mutated, so every pointer move is computed from the drag origin.
 * @param {number[]} startWidths - widths captured when the drag started.
 * @param {number} index - index of the column whose right boundary is dragged.
 * @param {number} delta - pointer movement in px (rightward positive).
 * @param {boolean} wide - whether the table is a wide (scrolling) table.
 * @returns {number[]} the new widths, same length and order.
 */
export function nextColumnWidths (startWidths, index, delta, wide) {
  if (wide) return resizeColumn(startWidths, index, delta, MIN_COLUMN_WIDTH)
  const span = clampSpan(startWidths[index], startWidths[index + 1], delta, MIN_COLUMN_WIDTH)
  const widths = startWidths.slice()
  widths[index] = span.left
  widths[index + 1] = span.right
  return widths
}

/**
 * Scale `widths` so they sum to at most `total` while every column keeps at
 * least `min` px (or her share of a table that cannot afford `min`). Widths stay
 * on the half-pixel grid the browser renders crisply, and the budget is
 * **floored** to that grid: a locked table paints the widths as CSS `width`, so
 * `width: 100%` only stays authoritative when the column sum does not exceed the
 * container. Rounding the sum up (even by 0.06px) makes the fixed layout table
 * grow a fraction, which Chromium reports as +1px of `scrollWidth` — a
 * horizontal scrollbar that cannot actually scroll.
 * @param {number[]} widths - current column widths.
 * @param {number} total - available table width in px.
 * @param {number} min - minimum column width in px.
 * @returns {number[]}
 */
export function normalizeWidths (widths, total, min) {
  const count = widths.length
  if (count === 0) return []
  if (!(total > 0)) return widths.slice()
  // Half-pixel budget, rounded down so the sum can never exceed `total`.
  const budget = Math.floor((total + 1e-6) * 2) / 2
  const floor = Math.min(min, budget / count)
  const weights = widths.map((width) => (width > 0 ? width : 1))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const result = weights.map((weight) => Math.max(floor, Math.round((budget * weight / weightSum) * 2) / 2))
  let excess = Math.round((result.reduce((sum, width) => sum + width, 0) - budget) * 2) / 2
  while (excess > 0) {
    let changed = false
    for (let index = count - 1; index >= 0 && excess > 0; index -= 1) {
      const room = result[index] - floor
      if (room <= 0) continue
      const cut = Math.min(room, excess)
      result[index] = Math.round((result[index] - cut) * 2) / 2
      excess = Math.round((excess - cut) * 2) / 2
      changed = true
    }
    if (!changed) break
  }
  const deficit = Math.round((budget - result.reduce((sum, width) => sum + width, 0)) * 2) / 2
  if (deficit > 0) result[count - 1] = Math.round((result[count - 1] + deficit) * 2) / 2
  return result
}

/**
 * The widths a remembered entry paints on a table in the current layout, or
 * null when the entry cannot be trusted here.
 *
 * A fill table is always exactly as wide as its container, so its remembered
 * pixels are **rescaled proportionally** to the current container width instead
 * of pinned (a wider window then widens every column, a narrower one shrinks
 * them, and the column sum never exceeds the container — the ghost-scrollbar
 * rule of `normalizeWidths`). A wide table keeps the absolute pixels the user
 * dragged and the wrapper scrolls when the window is narrower, which is exactly
 * its unpinned Element-style behaviour.
 *
 * The caller validates the header signature and the column count beforehand;
 * only the geometry is checked here. A zero container width (a hidden tab or a
 * collapsed group) returns the pixels as they are and lets the existing
 * ResizeObserver rescale them once the table is visible.
 *
 * @param {number[]} saved - widths read from the memory.
 * @param {{ wide: boolean, columns: number, containerWidth: number }} context
 * @returns {number[] | null}
 */
export function memoryWidths (saved, context) {
  const columns = context.columns
  if (!Array.isArray(saved) || saved.length !== columns) return null
  if (!(columns >= 2) || columns > MAX_COLUMNS) return null
  if (!saved.every((width) => Number.isFinite(width) && width >= MIN_COLUMN_WIDTH)) return null
  const rounded = saved.map((width) => Math.round(width * 2) / 2)
  if (context.wide) {
    const total = rounded.reduce((sum, width) => sum + width, 0)
    return total > 0 ? rounded : null
  }
  if (context.containerWidth > 0) return normalizeWidths(rounded, context.containerWidth, MIN_COLUMN_WIDTH)
  return rounded
}

/** Table selector for the locked state, scoped like the color-mode sheet. */
const TABLE_SCOPE = `${MARKDOWN_SCOPE} table[${RESIZABLE_ATTR}]`

/**
 * The interaction stylesheet. Column width rules are generated for every
 * column index so a locked table needs no per-column inline styles beyond the
 * custom properties themselves.
 * @returns {string}
 */
export function tableResizeStyles () {
  const rules = [
    `${MARKDOWN_SCOPE} thead th {\n  position: relative;\n}`,
    `${MARKDOWN_SCOPE} thead th[${EDGE_ATTR}] {\n  cursor: col-resize;\n}`,
    `${MARKDOWN_SCOPE} thead th[${EDGE_ATTR}]::after {\n  content: "";\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  right: -1px;\n  width: 2px;\n  border-radius: 1px;\n  background-color: var(--everforest-color-table-handle, var(--dsw-alias-brand-primary));\n  pointer-events: none;\n}`,
    // The wide table's last column has its handle on the table's own right
    // border, which sits right against the clipping scroll wrapper: keep the
    // guide inside the cell so it does not lose its outer half.
    `${MARKDOWN_SCOPE} .md-table-wide thead th:last-child[${EDGE_ATTR}]::after {\n  right: 0;\n}`,
    `${TABLE_SCOPE} {\n  table-layout: fixed;\n}`,
    `${TABLE_SCOPE} > thead > tr > th,\n${TABLE_SCOPE} > tbody > tr > td {\n  box-sizing: border-box;\n  min-width: 0;\n  max-width: none;\n}`,
    // The drag state is carried by the table's scroll wrapper, not by <html>: a
    // `html[data-…] *` rule would invalidate the style of every element in the
    // window on each drag start / end (measured ~260 ms per toggle in the real
    // app), while this rule only invalidates one table's subtree (~12 ms).
    `${MARKDOWN_SCOPE} [class*="tableScroll"][${DRAG_ATTR}],\n${MARKDOWN_SCOPE} [class*="tableScroll"][${DRAG_ATTR}] * {\n  cursor: col-resize !important;\n  user-select: none !important;\n}`
  ]
  for (let column = 1; column <= MAX_COLUMNS; column += 1) {
    rules.push(`${TABLE_SCOPE} > thead > tr > th:nth-child(${column}) {\n  width: var(${COLUMN_VARIABLE}${column});\n}`)
  }
  return `${rules.join('\n\n')}\n`
}

/**
 * Header cells of a table, or null when the table has no header row.
 * @param {HTMLTableElement} table
 * @returns {HTMLTableCellElement[] | null}
 */
function headerCells (table) {
  const row = table.tHead && table.tHead.rows.length > 0 ? table.tHead.rows[0] : null
  return row === null ? null : Array.from(row.cells)
}

/**
 * Whether a table is a chat markdown table in the standard (non-compact)
 * variant, i.e. whether the color-mode sheet and this module apply at all.
 * @param {HTMLTableElement} table
 * @returns {boolean}
 */
function inMarkdownScope (table) {
  const container = table.closest('[class*="markdown"]')
  return container !== null && container.getAttribute('data-markdown-variant') !== 'compact'
}

/**
 * Whether a table is a wide (bleeding, horizontally scrolling) table. DSH marks
 * the wrapper, not the table, so every call site has to look one level up.
 * @param {HTMLTableElement} table
 * @returns {boolean}
 */
function isWideTable (table) {
  return table.parentElement !== null && table.parentElement.classList.contains('md-table-wide')
}

/**
 * Zero-based index of `table` among the markdown tables of its chat node.
 *
 * One message can render several tables (a common real case), and the node
 * identity alone cannot tell them apart, so the ordinal is part of the memory
 * key. Only tables this module can ever lock are counted (the compact reasoning
 * variant is excluded), so the ordinal does not shift when such a table is
 * added elsewhere in the same message.
 * @param {Element} node - the chat node element (`[data-chat-node-key]`).
 * @param {HTMLTableElement} table
 * @returns {number} the ordinal, or -1 when the table is not inside `node`.
 */
function tableOrdinal (node, table) {
  if (typeof node.querySelectorAll !== 'function') return -1
  let ordinal = 0
  for (const candidate of node.querySelectorAll('[class*="tableScroll"] > table')) {
    if (!inMarkdownScope(candidate)) continue
    if (candidate === table) return ordinal
    ordinal += 1
  }
  return -1
}

/**
 * The width-memory key of a chat table, or null when it is not a chat table
 * with both anchors (document previews, the Settings page, a future renderer
 * that drops the attributes). Keys are per conversation on purpose: the same
 * markdown rendered in two sessions keeps two independent column widths.
 * @param {HTMLTableElement} table
 * @returns {string | null}
 */
export function tableMemoryKey (table) {
  if (typeof table.closest !== 'function') return null
  // Only the tables this module can lock are remembered (the compact reasoning
  // variant is not a place the user can drag a border).
  if (!inMarkdownScope(table)) return null
  const session = table.closest(`[${SESSION_ATTR}]`)
  const node = table.closest(`[${NODE_ATTR}]`)
  if (session === null || node === null) return null
  const ordinal = tableOrdinal(node, table)
  if (ordinal < 0) return null
  return tableWidthKey(
    session.getAttribute(SESSION_ATTR),
    node.getAttribute(NODE_ATTR),
    ordinal
  )
}

/**
 * Whether column `index` of a table with `count` columns has a draggable right
 * edge. Interior boundaries always do. The outermost right border — the right
 * edge of the last column — only does on a wide table, where resizing the last
 * column is meaningful because the table width follows the columns; on a fill
 * table that border belongs to the 100%-wide wrapper and a drag would be a no-op.
 * @param {number} index - column index.
 * @param {number} count - number of columns.
 * @param {boolean} wide - whether the table is a wide (scrolling) table.
 * @returns {boolean}
 */
export function isResizeBoundary (index, count, wide) {
  if (!(count >= 2) || !(index >= 0) || index >= count) return false
  return index < count - 1 || wide
}

/**
 * The column boundary under the pointer, if there is one.
 *
 * Interior boundaries always hit; the right edge of the **last** header cell
 * only on a wide table (see {@link isResizeBoundary}).
 * @param {EventTarget | null} target - pointer event target.
 * @param {number} clientX - pointer viewport x.
 * @returns {{ table: HTMLTableElement, cell: HTMLTableCellElement, index: number } | null}
 */
function edgeHit (target, clientX) {
  if (!(target instanceof Element)) return null
  const cell = target.closest('th')
  if (cell === null || cell.parentElement === null || cell.parentElement.parentElement === null) return null
  const table = cell.closest('table')
  if (table === null || !table.tHead || cell.parentElement.parentElement !== table.tHead) return null
  if (!inMarkdownScope(table)) return null
  const cells = headerCells(table)
  if (cells === null || cells.length < 2 || cells.length > MAX_COLUMNS) return null
  const index = cells.indexOf(cell)
  if (index < 0) return null
  if (!isResizeBoundary(index, cells.length, isWideTable(table))) return null
  const rect = cell.getBoundingClientRect()
  if (rect.width < EDGE_ZONE * 2) return null
  const distance = rect.right - clientX
  if (distance < 0 || distance > EDGE_ZONE) return null
  return { table, cell, index }
}

/**
 * Install the interaction on a document.
 *
 * The returned disposer removes every listener and observer and restores every
 * table this instance locked. A fresh call after a plugin reload starts from
 * empty state, exactly like the first install.
 *
 * `memory` is optional: `{ read(key, check), write(key, widths, check),
 * forget(key) }` (see `createColumnWidthMemory`). Without it the interaction is
 * the stateless version — widths survive only while the table element does.
 *
 * @param {{ document?: Document, window?: Window, memory?: { read: Function, write: Function, forget: Function } }} [options]
 * @returns {() => void}
 */
export function installColumnResize (options = {}) {
  const doc = options.document
  if (!doc || typeof doc.addEventListener !== 'function') return () => {}
  const win = options.window || (typeof window === 'undefined' ? undefined : window)
  const memory = options.memory
    && typeof options.memory.read === 'function'
    && typeof options.memory.write === 'function'
    && typeof options.memory.forget === 'function'
    ? options.memory
    : null

  /** Locked table -> { widths, wide }; also the source of truth during drags. */
  const tables = new Map()
  /** Observed wrapper -> table, for the column rescale. */
  const observed = new Map()

  let edgeCell = null
  let drag = null
  let lastPress = null
  let observer = null
  let mutationObserver = null
  let resizeObserverCtor = typeof ResizeObserver === 'function' ? ResizeObserver : null
  if (resizeObserverCtor === null && win && typeof win.ResizeObserver === 'function') resizeObserverCtor = win.ResizeObserver

  /**
   * Write a column set onto the table: the per-column widths as custom
   * properties (the stylesheet turns them into `th` widths) and, for a wide
   * table, the explicit table width. Without the latter the table's
   * `max-content` layout would keep its old width and spread the pixels a drag
   * freed over the columns (which is how the last column used to swallow the
   * slack) instead of following the drag.
   * @param {HTMLTableElement} table
   * @param {number[]} widths
   * @param {boolean} wide
   */
  function applyWidths (table, widths, wide) {
    for (let index = 0; index < widths.length; index += 1) {
      table.style.setProperty(`${COLUMN_VARIABLE}${index + 1}`, `${widths[index]}px`)
    }
    if (wide) table.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`
  }

  /** Remove every trace of a lock; the renderer's auto layout takes over again. */
  function release (table) {
    table.removeAttribute(RESIZABLE_ATTR)
    for (let index = table.style.length - 1; index >= 0; index -= 1) {
      const property = table.style.item(index)
      if (property.startsWith(COLUMN_VARIABLE)) table.style.removeProperty(property)
    }
    table.style.removeProperty('width')
    table.style.removeProperty('max-width')
    tables.delete(table)
    const wrapper = table.parentElement
    if (wrapper !== null && observer !== null && observed.has(wrapper)) {
      observer.unobserve(wrapper)
      observed.delete(wrapper)
    }
  }

  /**
   * Repaint after the chat column changed width (fill tables only). A wide table
   * keeps its natural/explicit width and scrolls inside its wrapper, so it is
   * not observed here.
   */
  function onWrapperResize (entries) {
    for (const entry of entries) {
      const table = observed.get(entry.target)
      if (table === undefined) continue
      const state = tables.get(table)
      if (state === undefined || !table.isConnected) {
        observed.delete(entry.target)
        tables.delete(table)
        if (observer !== null) observer.unobserve(entry.target)
        continue
      }
      const total = entry.contentRect.width
      if (!(total > 0)) continue
      const current = state.widths.reduce((sum, width) => sum + width, 0)
      if (Math.abs(current - total) < 0.5) continue
      state.widths = normalizeWidths(state.widths, total, MIN_COLUMN_WIDTH)
      applyWidths(table, state.widths, false)
    }
  }

  /** Lock a table to explicit widths for the first time. */
  function lock (table, widths) {
    const wide = isWideTable(table)
    table.setAttribute(RESIZABLE_ATTR, String(widths.length))
    applyWidths(table, widths, wide)
    if (wide) {
      // The wide layout sizes itself with `max-content`; the explicit width plus
      // `max-width: none` keeps the header-cell widths authoritative while the
      // wrapper scrolls (and while a column is grown past the natural width).
      table.style.maxWidth = 'none'
    }
    tables.set(table, { widths, wide })
    const wrapper = table.parentElement
    if (wide || wrapper === null || resizeObserverCtor === null || observed.has(wrapper)) return
    if (observer === null) observer = new resizeObserverCtor(onWrapperResize)
    observed.set(wrapper, table)
    observer.observe(wrapper)
  }

  /** Whether the table is already locked. */
  function isLocked (table) {
    return tables.has(table)
  }

  /** Column count + header signature of a table, or null without a header. */
  function tableCheck (table) {
    const cells = headerCells(table)
    if (cells === null || cells.length < 2 || cells.length > MAX_COLUMNS) return null
    return {
      columns: cells.length,
      signature: headerSignature(cells.map((cell) => cell.textContent || ''))
    }
  }

  /**
   * The content-box width of a fill table's scroll wrapper, i.e. the width its
   * columns have to add up to.
   *
   * `getBoundingClientRect` is used instead of `clientWidth` because it carries
   * the half pixels the layout works on: rounding a whole pixel up is exactly
   * what once produced a scrollbar that could not scroll.
   */
  function containerWidth (table) {
    const wrapper = table.parentElement
    if (wrapper === null || typeof wrapper.getBoundingClientRect !== 'function') return 0
    const rect = wrapper.getBoundingClientRect()
    if (!(rect.width > 0)) return 0
    const view = win && typeof win.getComputedStyle === 'function' ? win : null
    if (view === null) return rect.width
    const style = view.getComputedStyle(wrapper)
    const size = (value) => (typeof value === 'string' ? Number.parseFloat(value) : 0) || 0
    return rect.width
      - size(style.borderLeftWidth) - size(style.borderRightWidth)
      - size(style.paddingLeft) - size(style.paddingRight)
  }

  /** Paint remembered widths on a freshly mounted table, if there are any. */
  function restore (table) {
    if (memory === null || tables.has(table)) return
    if (typeof table.isConnected === 'boolean' && !table.isConnected) return
    if (!inMarkdownScope(table)) return
    const check = tableCheck(table)
    if (check === null) return
    const key = tableMemoryKey(table)
    if (key === null) return
    let saved = null
    try {
      saved = memory.read(key, check)
    } catch {
      saved = null
    }
    if (!Array.isArray(saved)) return
    const wide = isWideTable(table)
    const widths = memoryWidths(saved, {
      wide,
      columns: check.columns,
      containerWidth: wide ? 0 : containerWidth(table)
    })
    if (widths === null) return
    lock(table, widths)
  }

  /** Remember the widths currently painted on a table. */
  function remember (table) {
    if (memory === null) return
    const state = tables.get(table)
    if (state === undefined) return
    const check = tableCheck(table)
    if (check === null || check.columns !== state.widths.length) return
    const key = tableMemoryKey(table)
    if (key === null) return
    try {
      memory.write(key, state.widths, check)
    } catch {
      // A broken memory must never break the drag: the table keeps its widths.
    }
  }

  /** Drop a table's remembered widths (double click restores the auto layout). */
  function forget (table) {
    if (memory === null) return
    const key = tableMemoryKey(table)
    if (key === null) return
    try {
      memory.forget(key)
    } catch {
      // See remember(): the auto layout is restored either way.
    }
  }

  /** Tables under one added DOM node (the node may wrap the table or be one). */
  function collectTables (node, found) {
    if (node === null || typeof node !== 'object' || node.nodeType !== 1) return
    const element = node
    if (typeof element.matches === 'function' && element.matches('table')) found.push(element)
    if (typeof element.querySelectorAll !== 'function') return
    if (typeof element.matches === 'function' && element.matches('[class*="tableScroll"]')) {
      const direct = element.querySelector('table')
      if (direct !== null) found.push(direct)
    }
    for (const table of element.querySelectorAll('[class*="tableScroll"] > table')) found.push(table)
  }

  /**
   * Release the tables the renderer already unmounted.
   *
   * Switching sessions replaces the whole chat subtree; every locked table of
   * the old session would otherwise stay in `tables` (which holds the DOM
   * element, and with it the detached subtree) for the rest of the page's
   * life. Restored tables make that set larger than it used to be, so the
   * memory path prunes detached entries before every restore batch. Cheap: the
   * map only ever holds the tables locked in the current session.
   */
  function pruneDetached () {
    for (const table of [...tables.keys()]) {
      if (table.isConnected === false) release(table)
    }
  }

  /**
   * Tables the renderer mounts later: a new session (the whole chat subtree is
   * replaced), a `loadEarlier` page, or a table created by the streaming
   * markdown renderer. Scrolling, collapsing and streaming a settled table
   * never unmount it, so nothing else triggers a restore.
   */
  function onMutations (records) {
    const found = []
    for (const record of records) {
      for (const node of record.addedNodes) collectTables(node, found)
    }
    pruneDetached()
    for (const table of found) restore(table)
  }

  /** Restore what is already mounted, then watch for later mounts. */
  function startMemory () {
    if (memory === null) return
    if (typeof doc.querySelectorAll === 'function') {
      for (const table of doc.querySelectorAll('[class*="tableScroll"] > table')) restore(table)
    }
    if (mutationObserver !== null) return
    const Observer = typeof MutationObserver === 'function'
      ? MutationObserver
      : (win && typeof win.MutationObserver === 'function' ? win.MutationObserver : null)
    if (typeof Observer !== 'function') return
    if (!doc.documentElement || typeof doc.documentElement.nodeType !== 'number') return
    mutationObserver = new Observer(onMutations)
    mutationObserver.observe(doc.documentElement, { childList: true, subtree: true })
  }

  /** Put the hover guide on `cell`, or clear it when `cell` is null. */
  function setEdge (cell) {
    if (edgeCell === cell) return
    if (edgeCell !== null) edgeCell.removeAttribute(EDGE_ATTR)
    edgeCell = cell
    if (edgeCell !== null) edgeCell.setAttribute(EDGE_ATTR, '')
  }

  function onPointerMove (event) {
    if (event.pointerType === 'touch') return
    if (drag !== null) {
      // Always recompute from the drag's starting widths: the pointer
      // coordinate is absolute, so accumulating on the already-moved widths
      // would double-apply every step.
      const widths = nextColumnWidths(drag.startWidths, drag.index, event.clientX - drag.startX, drag.wide)
      if (widths.every((width, index) => width === drag.widths[index])) return
      drag.widths = widths
      drag.moved = true
      tables.set(drag.table, { widths, wide: drag.wide })
      applyWidths(drag.table, widths, drag.wide)
      return
    }
    const hit = edgeHit(event.target, event.clientX)
    setEdge(hit === null ? null : hit.cell)
  }

  function onPointerDown (event) {
    if (drag !== null || event.button !== 0 || event.pointerType === 'touch') return
    const hit = edgeHit(event.target, event.clientX)
    if (hit === null) return
    event.preventDefault()
    // A second press on the same boundary within the double-click window is the
    // "restore automatic widths" gesture. It is detected here instead of from
    // the `dblclick` event because canceling `pointerdown` suppresses the
    // compatibility mouse events in Chromium — the native `dblclick` never
    // arrives, so there is no second path to keep.
    const now = Date.now()
    if (
      lastPress !== null
      && lastPress.table === hit.table
      && lastPress.index === hit.index
      && Math.abs(lastPress.x - event.clientX) <= DOUBLE_PRESS_DISTANCE
      && lastPress.moved !== true
      && now - lastPress.at <= DOUBLE_PRESS_MS
    ) {
      lastPress = null
      if (isLocked(hit.table)) release(hit.table)
      // The gesture means "stop imposing widths on this table", so the memory
      // entry goes too — a later remount must not bring the widths back.
      forget(hit.table)
      finishDrag()
      setEdge(null)
      return
    }
    lastPress = { table: hit.table, index: hit.index, x: event.clientX, at: now, moved: false }
    const cells = headerCells(hit.table)
    if (cells === null) return
    const measured = cells.map((cell) => cell.getBoundingClientRect().width)
    const total = measured.reduce((sum, width) => sum + width, 0)
    if (!(total > 0)) return
    const widths = normalizeWidths(measured, total, MIN_COLUMN_WIDTH)
    if (!isLocked(hit.table)) lock(hit.table, widths)
    const state = tables.get(hit.table)
    if (state === undefined) return
    drag = {
      table: hit.table,
      index: hit.index,
      wide: state.wide,
      wrapper: hit.table.parentElement,
      startX: event.clientX,
      startWidths: state.widths.slice(),
      widths: state.widths.slice(),
      moved: false
    }
    setEdge(hit.cell)
    if (drag.wrapper !== null) drag.wrapper.setAttribute(DRAG_ATTR, '')
  }

  function finishDrag (canceled = false) {
    if (drag === null) return
    const finished = drag
    // A drag that actually moved is not half of a double click, so the next
    // press on the same boundary starts a new drag instead of resetting.
    if (lastPress !== null && lastPress.table === finished.table && lastPress.index === finished.index) {
      lastPress.moved = finished.moved
    }
    drag = null
    if (finished.wrapper !== null) finished.wrapper.removeAttribute(DRAG_ATTR)
    setEdge(null)
    if (finished.moved && !canceled) remember(finished.table)
  }

  // Touch never starts a drag (see the pointerdown guard), so the up / cancel
  // handlers only have to end a mouse or pen drag.
  function onPointerUp () {
    finishDrag()
  }

  function onKeyDown (event) {
    if (drag === null || event.key !== 'Escape') return
    applyWidths(drag.table, drag.startWidths, drag.wide)
    tables.set(drag.table, { widths: drag.startWidths.slice(), wide: drag.wide })
    finishDrag(true)
  }

  function onWindowBlur () {
    finishDrag()
    setEdge(null)
  }

  const listened = [
    ['pointermove', onPointerMove, { passive: true }],
    ['pointerdown', onPointerDown, { passive: false }],
    ['pointerup', onPointerUp],
    ['pointercancel', onPointerUp],
    ['keydown', onKeyDown]
  ]
  for (const [type, listener, options] of listened) doc.addEventListener(type, listener, options)
  if (win && typeof win.addEventListener === 'function') win.addEventListener('blur', onWindowBlur)
  startMemory()

  return function dispose () {
    for (const [type, listener, options] of listened) doc.removeEventListener(type, listener, options)
    if (win && typeof win.removeEventListener === 'function') win.removeEventListener('blur', onWindowBlur)
    for (const table of [...tables.keys()]) release(table)
    if (observer !== null) observer.disconnect()
    observer = null
    if (mutationObserver !== null) mutationObserver.disconnect()
    mutationObserver = null
    observed.clear()
    tables.clear()
    edgeCell = null
    if (drag !== null && drag.wrapper !== null) drag.wrapper.removeAttribute(DRAG_ATTR)
    drag = null
    lastPress = null
  }
}
