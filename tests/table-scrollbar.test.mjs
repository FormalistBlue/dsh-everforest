import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  HOVER_SCROLLBAR_INSET,
  REST_SCROLLBAR_INSET,
  SCROLLBAR_GROW_MS,
  SCROLLBAR_INSET_VARIABLE,
  installTableScrollbarHover,
  isScrollbarPoint,
  scrollbarInsetAt
} from '../src/table-scrollbar.js'

/** One fake wrapper: an object with the geometry / style surface the module uses. */
function makeWrapper (overrides = {}) {
  const styleValues = new Map()
  const wrapper = {
    style: {
      setProperty: (name, value) => styleValues.set(name, value),
      removeProperty: (name) => styleValues.delete(name)
    },
    styleValues,
    offsetHeight: 40,
    clientHeight: 30,
    clientWidth: 300,
    scrollWidth: 600,
    markdownVariant: null,
    rect: { left: 100, right: 400, top: 160, bottom: 200 },
    getBoundingClientRect () { return this.rect },
    closest (selector) {
      return selector === '[class*="markdown"]' ? wrapper.markdown : null
    },
    markdown: {
      getAttribute: () => wrapper.markdownVariant
    }
  }
  Object.assign(wrapper, overrides)
  return wrapper
}

/** A pointer target whose `closest` resolves to `wrapper`. */
function targetFor (wrapper) {
  return {
    closest: (selector) => (selector === '[class*="tableScroll"]' ? wrapper : null)
  }
}

/** Fake document / window with a manual clock and frame queue. */
function makeHarness ({ reducedMotion = false } = {}) {
  const documentListeners = new Map()
  const windowListeners = new Map()
  const frames = []
  let time = 0
  const document = {
    addEventListener (type, listener) {
      const set = documentListeners.get(type) ?? new Set()
      documentListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener (type, listener) {
      documentListeners.get(type)?.delete(listener)
    }
  }
  const window = {
    performance: { now: () => time },
    requestAnimationFrame (callback) {
      frames.push(callback)
      return frames.length
    },
    cancelAnimationFrame (handle) {
      frames[handle - 1] = null
    },
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener (type, listener) {
      const set = windowListeners.get(type) ?? new Set()
      windowListeners.set(type, set)
      set.add(listener)
    },
    removeEventListener (type, listener) {
      windowListeners.get(type)?.delete(listener)
    }
  }
  const harness = {
    document,
    window,
    documentListeners,
    windowListeners,
    dispatch (type, event) {
      for (const listener of documentListeners.get(type) ?? []) listener(event)
    },
    dispatchWindow (type) {
      for (const listener of windowListeners.get(type) ?? []) listener()
    },
    /** Advance the clock and run the frame callbacks queued for this frame. */
    frame (ms) {
      time += ms
      const queued = frames.splice(0, frames.length)
      for (const callback of queued) if (typeof callback === 'function') callback()
    },
    get time () { return time }
  }
  return harness
}

/** The inset currently written on a wrapper, or null when at rest (no style). */
function insetOf (wrapper) {
  const value = wrapper.styleValues.get(SCROLLBAR_INSET_VARIABLE)
  return value === undefined ? null : Number.parseFloat(value)
}

/** A pointer event over the wrapper's horizontal bar (bar spans bottom 10px). */
function moveEvent (wrapper, { y = 195, x = 200, pointerType = 'mouse' } = {}) {
  return { target: targetFor(wrapper), clientX: x, clientY: y, pointerType }
}

test('scrollbar animation constants are one contract', () => {
  assert.equal(SCROLLBAR_INSET_VARIABLE, '--everforest-table-scrollbar-inset')
  assert.equal(REST_SCROLLBAR_INSET, 5)
  assert.equal(HOVER_SCROLLBAR_INSET, 0)
  assert.equal(SCROLLBAR_GROW_MS, 160)
})

test('scrollbarInsetAt eases from the resting inset to the hovered one', () => {
  assert.equal(scrollbarInsetAt(REST_SCROLLBAR_INSET, HOVER_SCROLLBAR_INSET, 0), 5)
  assert.equal(scrollbarInsetAt(REST_SCROLLBAR_INSET, HOVER_SCROLLBAR_INSET, 1), 0)
  // Ease-out cubic: at the halfway point the inset is already near the target.
  assert.equal(scrollbarInsetAt(5, 0, 0.5), 0.625)
  // Progress outside 0..1 is clamped, never extrapolated.
  assert.equal(scrollbarInsetAt(5, 0, -1), 5)
  assert.equal(scrollbarInsetAt(5, 0, 2), 0)
  // Monotonically shrinking.
  let previous = 5
  for (let step = 1; step <= 10; step += 1) {
    const value = scrollbarInsetAt(5, 0, step / 10)
    assert.ok(value <= previous, `inset grew at ${step / 10}`)
    previous = value
  }
})

test('isScrollbarPoint recognises the bar strip and nothing else', () => {
  const rect = { left: 100, right: 400, bottom: 200 }
  // Bar spans [200 - 10, 200].
  assert.equal(isScrollbarPoint(rect, 10, 200, 195), true)
  assert.equal(isScrollbarPoint(rect, 10, 100, 190), true, 'left edge of the bar is inside')
  assert.equal(isScrollbarPoint(rect, 10, 400, 200), true, 'bottom-right corner is inside')
  assert.equal(isScrollbarPoint(rect, 10, 200, 189), false, 'above the bar')
  assert.equal(isScrollbarPoint(rect, 10, 200, 201), false, 'below the wrapper')
  assert.equal(isScrollbarPoint(rect, 10, 99, 195), false, 'left of the wrapper')
  assert.equal(isScrollbarPoint(rect, 10, 401, 195), false, 'right of the wrapper')
  assert.equal(isScrollbarPoint(rect, 0, 200, 195), false, 'no bar, no hit')
})

test('installTableScrollbarHover is inert without a document', () => {
  const dispose = installTableScrollbarHover({})
  assert.equal(typeof dispose, 'function')
  assert.doesNotThrow(() => dispose())
})

test('installTableScrollbarHover registers document listeners and removes them on dispose', () => {
  const harness = makeHarness()
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })
  assert.deepEqual([...harness.documentListeners.keys()].sort(), ['pointerleave', 'pointermove'])
  assert.deepEqual([...harness.windowListeners.keys()], ['blur'])
  dispose()
  for (const listeners of harness.documentListeners.values()) assert.equal(listeners.size, 0)
  for (const listeners of harness.windowListeners.values()) assert.equal(listeners.size, 0)
  assert.doesNotThrow(() => dispose())
})

test('hovering the bar animates the inset to zero and leaving animates it back', () => {
  const harness = makeHarness()
  const wrapper = makeWrapper()
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  // Hovering the bar starts a leg; the first frame paints an eased middle value.
  harness.dispatch('pointermove', moveEvent(wrapper))
  assert.equal(insetOf(wrapper), null, 'nothing is painted before the first frame')
  harness.frame(80)
  const middle = insetOf(wrapper)
  assert.ok(middle !== null && middle > 0 && middle < REST_SCROLLBAR_INSET, `middle inset ${middle}`)

  // The repeating pointer moves that a real hover produces must not restart it.
  harness.dispatch('pointermove', moveEvent(wrapper))
  harness.frame(80)
  assert.equal(insetOf(wrapper), HOVER_SCROLLBAR_INSET, 'the leg finished on schedule')

  // Pointer off the bar: animate the inset back, then drop the inline style.
  harness.dispatch('pointermove', moveEvent(wrapper, { y: 100 }))
  harness.frame(80)
  assert.ok(insetOf(wrapper) > 0, 'the shrink leg started')
  harness.frame(80)
  assert.equal(insetOf(wrapper), null, 'the resting value is expressed by removing the property')

  dispose()
})

test('leaving mid-grow retargets from the painted value instead of snapping', () => {
  const harness = makeHarness()
  const wrapper = makeWrapper()
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  harness.dispatch('pointermove', moveEvent(wrapper))
  harness.frame(80)
  const grown = insetOf(wrapper)
  assert.ok(grown !== null && grown < REST_SCROLLBAR_INSET)

  harness.dispatch('pointermove', moveEvent(wrapper, { y: 100 }))
  harness.frame(80)
  const shrinking = insetOf(wrapper)
  assert.ok(shrinking !== null && shrinking > grown, `expected an increase from ${grown}, got ${shrinking}`)
  harness.frame(80)
  assert.equal(insetOf(wrapper), null)
  dispose()
})

test('touch, non-scrolling wrappers and the compact variant never animate', () => {
  const harness = makeHarness()
  const wrapper = makeWrapper()
  const scrolling = makeWrapper({ scrollWidth: 300 })
  const compact = makeWrapper({ markdownVariant: 'compact' })
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  harness.dispatch('pointermove', moveEvent(wrapper, { pointerType: 'touch' }))
  harness.frame(80)
  assert.equal(insetOf(wrapper), null, 'touch has no hover')

  harness.dispatch('pointermove', moveEvent(scrolling))
  harness.frame(80)
  assert.equal(insetOf(scrolling), null, 'a wrapper without horizontal overflow has no bar')

  harness.dispatch('pointermove', moveEvent(compact))
  harness.frame(80)
  assert.equal(insetOf(compact), null, 'the compact markdown variant is out of scope')
  dispose()
})

test('reduced motion and a missing frame clock settle without animating', () => {
  const reduced = makeHarness({ reducedMotion: true })
  const wrapper = makeWrapper()
  const disposeReduced = installTableScrollbarHover({ document: reduced.document, window: reduced.window })
  reduced.dispatch('pointermove', moveEvent(wrapper))
  assert.equal(insetOf(wrapper), HOVER_SCROLLBAR_INSET, 'reduced motion jumps to the hovered inset')
  reduced.dispatch('pointermove', moveEvent(wrapper, { y: 100 }))
  assert.equal(insetOf(wrapper), null, 'reduced motion jumps back to rest')
  disposeReduced()

  // No requestAnimationFrame (a minimal runtime): the same jump, no frame loop.
  const harness = makeHarness()
  const bareWindow = { matchMedia: () => ({ matches: false }) }
  const bare = makeWrapper()
  const disposeBare = installTableScrollbarHover({ document: harness.document, window: bareWindow })
  harness.dispatch('pointermove', moveEvent(bare))
  assert.equal(insetOf(bare), HOVER_SCROLLBAR_INSET, 'without rAF the hover inset is applied at once')
  harness.dispatch('pointermove', moveEvent(bare, { y: 100 }))
  assert.equal(insetOf(bare), null)
  disposeBare()
})

test('pointerleave and window blur collapse the open bar', () => {
  const harness = makeHarness()
  const wrapper = makeWrapper()
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  harness.dispatch('pointermove', moveEvent(wrapper))
  harness.frame(SCROLLBAR_GROW_MS)
  assert.equal(insetOf(wrapper), HOVER_SCROLLBAR_INSET)

  harness.dispatch('pointerleave', {})
  harness.frame(SCROLLBAR_GROW_MS)
  assert.equal(insetOf(wrapper), null, 'document pointerleave collapses')

  harness.dispatch('pointermove', moveEvent(wrapper))
  harness.frame(SCROLLBAR_GROW_MS)
  harness.dispatchWindow('blur')
  harness.frame(SCROLLBAR_GROW_MS)
  assert.equal(insetOf(wrapper), null, 'window blur collapses')
  dispose()
})

test('a second wrapper takes over and the first one returns to rest', () => {
  const harness = makeHarness()
  const first = makeWrapper()
  const second = makeWrapper({ rect: { left: 100, right: 400, top: 260, bottom: 300 } })
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  harness.dispatch('pointermove', moveEvent(first))
  harness.frame(SCROLLBAR_GROW_MS)
  assert.equal(insetOf(first), HOVER_SCROLLBAR_INSET)

  harness.dispatch('pointermove', moveEvent(second, { y: 295 }))
  assert.equal(insetOf(first), null, 'the previous wrapper is reset as soon as the new one is aimed at')
  harness.frame(SCROLLBAR_GROW_MS)
  assert.equal(insetOf(second), HOVER_SCROLLBAR_INSET)
  dispose()
})

test('dispose removes the inline inset and cancels the frame loop', () => {
  const harness = makeHarness()
  const wrapper = makeWrapper()
  const dispose = installTableScrollbarHover({ document: harness.document, window: harness.window })

  harness.dispatch('pointermove', moveEvent(wrapper))
  harness.frame(80)
  assert.ok(insetOf(wrapper) !== null)
  dispose()
  assert.equal(insetOf(wrapper), null, 'the wrapper is back on the stylesheet resting inset')
  assert.doesNotThrow(() => harness.frame(80))
})
