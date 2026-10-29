// Animated hover growth for the chat table's horizontal scrollbar.
//
// The color-mode stylesheet reserves a 10px track and paints the resting thumb
// as a 5px pill by insetting a transparent bottom border
// (`border-bottom: var(--everforest-table-scrollbar-inset, 5px)`). The pill
// should grow to the full 10px while the pointer is on the scrollbar, but
// Chromium never runs a CSS transition or animation on a scrollbar
// pseudo-element: a 10s `transition` on `::-webkit-scrollbar-thumb` is parsed
// (the computed `transition` property shows it) yet no Web Animation starts and
// the paint jumps straight to the end state (verified 2026-10-29). So the
// transition has to be driven frame by frame from here:
//
//   - pointer events over the *native* scrollbar are delivered to the scrollbar's
//     element, so a document-level `pointermove` can tell that the pointer sits
//     on a table's horizontal bar (hit = bottom `offsetHeight - clientHeight` px),
//   - a custom property set inline on the wrapper is inherited by its scrollbar
//     pseudo-element, so writing the inset every frame repaints the thumb at an
//     intermediate height.
//
// Blink rounds a scrollbar part's border width to whole CSS pixels, so at DPR 1
// the growth is the six paint states 5 → 4 → … → 0 px (pill 5 → 10px); that is
// the smoothest this platform renders, and the duration only spreads those six
// states over time. The animation never touches layout: the track height is
// constant, so the table and the content below it do not move.

/** Custom property the color-mode sheet reads for the thumb's bottom inset. */
export const SCROLLBAR_INSET_VARIABLE = '--everforest-table-scrollbar-inset'

/** Inset (px) of the resting 5px pill inside the 10px track. */
export const REST_SCROLLBAR_INSET = 5

/** Inset (px) while the pointer is on the scrollbar: the pill fills the track. */
export const HOVER_SCROLLBAR_INSET = 0

/** One animation leg (grow or shrink), in ms. */
export const SCROLLBAR_GROW_MS = 160

/** The table scroll wrapper, the same selector the color-mode sheet uses. */
const FRAME_SELECTOR = '[class*="tableScroll"]'

/** The markdown content container, the scope the color-mode sheet applies in. */
const MARKDOWN_SELECTOR = '[class*="markdown"]'

/**
 * Ease-out cubic: a quick start and a gentle settle, so the growth reads as a
 * reaction to the pointer instead of a linear slide.
 * @param {number} t - clamped progress 0..1
 * @returns {number}
 */
function easeOutCubic (t) {
  const inverse = 1 - t
  return 1 - inverse * inverse * inverse
}

/**
 * The inset at `progress` of a move from `from` to `to`, eased and clamped.
 * Exposed for tests; the controller only feeds it the animation clock.
 * @param {number} from - inset at progress 0, in px
 * @param {number} to - inset at progress 1, in px
 * @param {number} progress - 0..1 (values outside are clamped)
 * @returns {number}
 */
export function scrollbarInsetAt (from, to, progress) {
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress
  return from + (to - from) * easeOutCubic(clamped)
}

/**
 * Whether a viewport point lies on a wrapper's horizontal scrollbar.
 * Exposed for tests.
 * @param {{ left: number, right: number, bottom: number }} rect - wrapper box
 * @param {number} thickness - `offsetHeight - clientHeight` (0 without a bar)
 * @param {number} clientX - pointer viewport x
 * @param {number} clientY - pointer viewport y
 * @returns {boolean}
 */
export function isScrollbarPoint (rect, thickness, clientX, clientY) {
  if (!(thickness > 0)) return false
  if (clientX < rect.left || clientX > rect.right) return false
  return clientY >= rect.bottom - thickness && clientY <= rect.bottom
}

/**
 * Install the animated scrollbar hover on a document.
 *
 * The returned disposer removes every listener and the inline inset, leaving
 * every table on the stylesheet's resting 5px pill. A fresh call after a plugin
 * reload starts from empty state, exactly like the first install.
 *
 * @param {{ document?: Document, window?: Window }} [options]
 * @returns {() => void}
 */
export function installTableScrollbarHover (options = {}) {
  const doc = options.document
  if (!doc || typeof doc.addEventListener !== 'function') return () => {}
  const win = options.window || (typeof window === 'undefined' ? undefined : window)

  const requestFrame = win && typeof win.requestAnimationFrame === 'function'
    ? (callback) => win.requestAnimationFrame(callback)
    : null
  const cancelFrame = win && typeof win.cancelAnimationFrame === 'function'
    ? (handle) => win.cancelAnimationFrame(handle)
    : null
  const clock = win && win.performance && typeof win.performance.now === 'function'
    ? () => win.performance.now()
    : () => Date.now()
  const prefersReducedMotion = () => {
    if (!win || typeof win.matchMedia !== 'function') return false
    try {
      return win.matchMedia('(prefers-reduced-motion: reduce)').matches === true
    } catch {
      return false
    }
  }

  /** Wrapper carrying the inline inset (also the one being animated). */
  let shown = null
  /** Inset currently painted on `shown`, in px. */
  let shownInset = REST_SCROLLBAR_INSET
  /** Inset the controller is aiming at, in px (resting unless hovered). */
  let goal = REST_SCROLLBAR_INSET
  /** The leg in flight: `{ from, to, startedAt }`, or null when settled. */
  let leg = null
  let frame = 0

  /**
   * Write the inset onto `element`; the resting value is expressed by removing
   * the property, so an untouched table carries no inline style at all.
   * @param {Element} element
   * @param {number} value - inset in px
   */
  function paint (element, value) {
    if (value >= REST_SCROLLBAR_INSET) {
      element.style.removeProperty(SCROLLBAR_INSET_VARIABLE)
      return
    }
    element.style.setProperty(SCROLLBAR_INSET_VARIABLE, `${Math.round(value * 100) / 100}px`)
  }

  /** Cancel a pending frame, if any. */
  function stopFrame () {
    if (frame !== 0) {
      if (cancelFrame !== null) cancelFrame(frame)
      frame = 0
    }
  }

  /** Settle on the leg's target and drop the animation. */
  function finishLeg () {
    if (leg === null) return
    const target = leg.to
    leg = null
    goal = target
    shownInset = target
    paint(shown, target)
    if (target >= REST_SCROLLBAR_INSET) shown = null
  }

  /** One animation frame: paint the eased inset or settle. */
  function tick () {
    frame = 0
    if (leg === null || shown === null) return
    const progress = (clock() - leg.startedAt) / SCROLLBAR_GROW_MS
    if (progress >= 1) {
      finishLeg()
      return
    }
    shownInset = scrollbarInsetAt(leg.from, leg.to, progress)
    paint(shown, shownInset)
    frame = requestFrame(tick)
  }

  /**
   * Aim `element` at `inset`. Repeating the same goal (every pointer move over
   * the bar does) is a no-op, so continuous movement cannot restart the leg; a
   * *different* target starts from the currently painted value, so reversing
   * mid-grow is smooth.
   * @param {Element} element - wrapper to paint on
   * @param {number} inset - target inset in px
   */
  function moveTo (element, inset) {
    if (element !== shown) {
      if (shown !== null) paint(shown, REST_SCROLLBAR_INSET)
      stopFrame()
      shown = element
      shownInset = REST_SCROLLBAR_INSET
      goal = REST_SCROLLBAR_INSET
    }
    if (inset === goal) return
    goal = inset
    stopFrame()
    if (requestFrame === null || prefersReducedMotion()) {
      leg = null
      shownInset = inset
      paint(shown, inset)
      if (inset >= REST_SCROLLBAR_INSET) {
        shown = null
        goal = REST_SCROLLBAR_INSET
      }
      return
    }
    leg = { from: shownInset, to: inset, startedAt: clock() }
    frame = requestFrame(tick)
  }

  /** Full collapse of whatever is expanded. */
  function collapse () {
    if (shown === null) return
    moveTo(shown, REST_SCROLLBAR_INSET)
  }

  /**
   * The table wrapper under the pointer, if the pointer is on its horizontal
   * scrollbar. Requires real horizontal overflow: fractional layout can make
   * `offsetHeight - clientHeight` 1–2px even without a bar, and a fill table
   * must never react.
   * @param {PointerEvent} event
   * @returns {Element | null}
   */
  function hitWrapper (event) {
    const target = event.target
    if (!target || typeof target.closest !== 'function') return null
    const element = target.closest(FRAME_SELECTOR)
    if (element === null) return null
    const markdown = element.closest(MARKDOWN_SELECTOR)
    if (markdown === null || markdown.getAttribute('data-markdown-variant') === 'compact') return null
    if (!(element.scrollWidth > element.clientWidth)) return null
    const thickness = element.offsetHeight - element.clientHeight
    const rect = element.getBoundingClientRect()
    return isScrollbarPoint(rect, thickness, event.clientX, event.clientY) ? element : null
  }

  function onPointerMove (event) {
    if (event.pointerType === 'touch') return
    const hit = hitWrapper(event)
    if (hit === null) collapse()
    else moveTo(hit, HOVER_SCROLLBAR_INSET)
  }

  function onPointerLeave () {
    collapse()
  }

  function onWindowBlur () {
    collapse()
  }

  const listened = [
    ['pointermove', onPointerMove, { passive: true }],
    ['pointerleave', onPointerLeave, { passive: true }]
  ]
  for (const [type, listener, listenerOptions] of listened) doc.addEventListener(type, listener, listenerOptions)
  if (win && typeof win.addEventListener === 'function') win.addEventListener('blur', onWindowBlur)

  return function dispose () {
    for (const [type, listener, listenerOptions] of listened) doc.removeEventListener(type, listener, listenerOptions)
    if (win && typeof win.removeEventListener === 'function') win.removeEventListener('blur', onWindowBlur)
    stopFrame()
    leg = null
    if (shown !== null) shown.style.removeProperty(SCROLLBAR_INSET_VARIABLE)
    shown = null
    shownInset = REST_SCROLLBAR_INSET
    goal = REST_SCROLLBAR_INSET
  }
}
