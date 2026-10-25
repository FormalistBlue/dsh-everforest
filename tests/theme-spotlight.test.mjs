/**
 * Unit tests for `src/theme-spotlight.js`: the pseudo-element stylesheet, the
 * preference resolver, the OS-flip gate, and the View Transitions controller
 * (reveal start, origin tracking — pointer or forced centre — z-order
 * attribute, fallbacks and cleanup).
 *
 * The real DSH integration (wrapping `theme.setTheme` and `theme.publish`, the
 * settings page path) is covered by `tests/integration.test.mjs`.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  SPOTLIGHT_DURATION_MS,
  createThemeSpotlight,
  resolveSchemePreference,
  shouldRevealSystemFlip,
  themeSpotlightStyles,
} from '../src/theme-spotlight.js'

/**
 * Fake document with the pieces the controller uses: the `animate()` call
 * (recorded, with the pseudo-element), pointer listeners, a viewport and a
 * scripted `startViewTransition`.
 */
function createFakeDocument({ transitions = [], width = 1000, height = 800 } = {}) {
  const listeners = new Map()
  const animations = []
  const documentElement = {
    animate(keyframes, options) {
      animations.push({ keyframes, options })
      return { cancel() {}, finished: Promise.resolve() }
    },
  }
  const doc = {
    animations,
    transitions,
    documentElement,
    defaultView: { innerWidth: width, innerHeight: height },
    addEventListener: (type, listener) => {
      listeners.set(type, listener)
    },
    removeEventListener: (type) => {
      listeners.delete(type)
    },
    fire: (type, event) => listeners.get(type)?.(event),
    startViewTransition: (callback) => {
      const transition = {
        callback,
        ready: null,
        finished: null,
        resolveReady: null,
        resolveFinished: null,
      }
      transition.ready = new Promise((resolve) => {
        transition.resolveReady = resolve
      })
      transition.finished = new Promise((resolve) => {
        transition.resolveFinished = resolve
      })
      transitions.push(transition)
      return transition
    },
  }
  return doc
}

/** Fake timer clock shared by the controllers under test. */
function createClock() {
  let now = 0
  let sequence = 0
  const timers = new Map()
  return {
    get pending() {
      return timers.size
    },
    schedule(callback, ms) {
      const handle = ++sequence
      timers.set(handle, { callback, due: now + ms })
      return handle
    },
    cancel(handle) {
      timers.delete(handle)
    },
    advance(ms) {
      now += ms
      for (const [handle, timer] of [...timers.entries()].sort((left, right) => left[1].due - right[1].due)) {
        if (timer.due > now) continue
        timers.delete(handle)
        timer.callback()
      }
    },
  }
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

test('stylesheet disables the UA cross-fade and keeps the new snapshot on top', () => {
  const css = themeSpotlightStyles()
  assert.match(css, /::view-transition-old\(root\)/)
  assert.match(css, /::view-transition-new\(root\)/)
  assert.match(css, /animation: none;/)
  assert.match(css, /mix-blend-mode: normal;/)
  assert.match(css, /::view-transition-old\(root\) \{ z-index: 1; \}/)
  assert.match(css, /::view-transition-new\(root\) \{ z-index: 9999; \}/)
  // The reveal only ever clips the new frame; the old frame is not animated, so
  // no z-order swap keyed on a per-run attribute is needed.
  assert.doesNotMatch(css, /html\[/)
  // The reveal motion itself is a Web Animations clip-path animation started
  // from `run()`; the stylesheet only removes the UA cross-fade.
  assert.doesNotMatch(css, /@keyframes/)
})

test('resolveSchemePreference follows light/dark/system', () => {
  assert.equal(resolveSchemePreference('light'), 'light')
  assert.equal(resolveSchemePreference('dark'), 'dark')
  assert.equal(resolveSchemePreference('system', { matchMedia: () => ({ matches: true }) }), 'dark')
  assert.equal(resolveSchemePreference('system', { matchMedia: () => ({ matches: false }) }), 'light')
  assert.equal(resolveSchemePreference('system', {}), null)
  assert.equal(resolveSchemePreference('system', { matchMedia: () => { throw new Error('blocked') } }), null)
  assert.equal(resolveSchemePreference('unknown'), null)
})

test('shouldRevealSystemFlip accepts only an OS flip under an existing system preference', () => {
  const previous = { preference: 'system', active: { colorScheme: 'dark' } }
  const osLight = { matchMedia: () => ({ matches: false }) }
  const osDark = { matchMedia: () => ({ matches: true }) }

  // The OS flipped while the preference was already `system`: the old frame is
  // still on screen here, so this publish must go through the reveal.
  assert.equal(shouldRevealSystemFlip(previous, 'system', osLight), true)
  // Same OS scheme: nothing to animate.
  assert.equal(shouldRevealSystemFlip(previous, 'system', osDark), false)
  // A Host broadcast changing the preference reports a new resolved scheme too,
  // but its old preference was fixed, so it keeps the documented instant path.
  assert.equal(shouldRevealSystemFlip({ preference: 'dark', active: { colorScheme: 'dark' } }, 'system', osLight), false)
  // Not following the system after the change: never our animation.
  assert.equal(shouldRevealSystemFlip(previous, 'light', osLight), false)
  // The host cannot answer the media query: stay instant.
  assert.equal(shouldRevealSystemFlip(previous, 'system', {}), false)
  assert.equal(shouldRevealSystemFlip(previous, 'system', { matchMedia: () => { throw new Error('blocked') } }), false)
  // Defensive: no previous snapshot / no resolvable scheme.
  assert.equal(shouldRevealSystemFlip(null, 'system', osLight), false)
  assert.equal(shouldRevealSystemFlip({ preference: 'system' }, 'system', osLight), false)
})

test('run() falls back to a synchronous switch when View Transitions are unavailable', () => {
  const doc = createFakeDocument()
  delete doc.startViewTransition // pre-Chromium-111 / unsupported host
  const clock = createClock()
  const controller = createThemeSpotlight({ document: doc, schedule: clock.schedule, cancel: clock.cancel })
  let changed = 0
  assert.equal(controller.supported, false)
  assert.equal(controller.run(() => { changed += 1 }), false)
  assert.equal(changed, 1)
  assert.equal(controller.running, false)
  assert.equal(doc.transitions.length, 0)
})

test('run() honours reduced motion', () => {
  const doc = createFakeDocument()
  const controller = createThemeSpotlight({
    document: doc,
    reducedMotion: () => true,
    schedule: () => 1,
    cancel: () => {},
  })
  let changed = 0
  assert.equal(controller.run(() => { changed += 1 }), false)
  assert.equal(changed, 1)
  assert.equal(doc.transitions.length, 0, 'a view transition was started despite reduced motion')
})

test('run() snapshots the old frame, paints the change, then animates the reveal', async () => {
  const doc = createFakeDocument()
  const clock = createClock()
  const controller = createThemeSpotlight({ document: doc, schedule: clock.schedule, cancel: clock.cancel })
  assert.equal(controller.supported, true)

  let changed = 0
  assert.equal(controller.run(() => { changed += 1 }), true)
  assert.equal(controller.running, true)
  // The change runs inside the transition callback, not before it.
  assert.equal(changed, 0)
  assert.equal(doc.transitions.length, 1)
  doc.transitions[0].callback()
  assert.equal(changed, 1)

  doc.transitions[0].resolveReady()
  await flushMicrotasks()
  assert.equal(doc.animations.length, 1)
  const [animation] = doc.animations
  assert.match(String(animation.keyframes.clipPath[0]), /^circle\(0px at 500px 400px\)$/)
  assert.match(String(animation.keyframes.clipPath[1]), /^circle\(640\.31\d*px at 500px 400px\)$/)
  assert.equal(animation.options.pseudoElement, '::view-transition-new(root)')
  assert.equal(animation.options.duration, SPOTLIGHT_DURATION_MS)
  assert.equal(animation.options.easing, 'ease-in')

  doc.transitions[0].resolveFinished()
  await flushMicrotasks()
  assert.equal(controller.running, false)
  assert.equal(clock.pending, 0)
})

test('run() grows the new frame from the pointer position in both directions', async () => {
  const doc = createFakeDocument()
  const clock = createClock()
  const controller = createThemeSpotlight({ document: doc, schedule: clock.schedule, cancel: clock.cancel })
  const stopTracking = controller.trackOrigin()
  doc.fire('pointerdown', { clientX: 120, clientY: 80 })

  controller.run(() => {})
  doc.transitions[0].callback()
  doc.transitions[0].resolveReady()
  await flushMicrotasks()
  const [animation] = doc.animations
  // The same layering serves light -> dark and dark -> light: clipping the old
  // snapshot instead flashes it unclipped for a frame when the View Transition
  // tears down, which is exactly the light->dark white flash this fixed.
  assert.match(String(animation.keyframes.clipPath[0]), /^circle\(0px at 120px 80px\)$/)
  assert.match(String(animation.keyframes.clipPath[1]), /^circle\(1137\.01\d*px at 120px 80px\)$/)
  assert.equal(animation.options.pseudoElement, '::view-transition-new(root)')

  stopTracking()
  doc.transitions[0].resolveFinished()
  await flushMicrotasks()
})

test('run() can ignore a stale pointer for changes that are not a click', async () => {
  const doc = createFakeDocument()
  const clock = createClock()
  const controller = createThemeSpotlight({ document: doc, schedule: clock.schedule, cancel: clock.cancel })
  const stopTracking = controller.trackOrigin()
  doc.fire('pointerdown', { clientX: 120, clientY: 80 })

  // The OS scheme flip is not a click: the pointer position may be minutes old,
  // so the reveal grows from the viewport centre instead.
  controller.run(() => {}, { origin: 'center' })
  doc.transitions[0].callback()
  doc.transitions[0].resolveReady()
  await flushMicrotasks()
  const [animation] = doc.animations
  assert.match(String(animation.keyframes.clipPath[0]), /^circle\(0px at 500px 400px\)$/)
  assert.match(String(animation.keyframes.clipPath[1]), /^circle\(640\.31\d*px at 500px 400px\)$/)

  stopTracking()
  doc.transitions[0].resolveFinished()
  await flushMicrotasks()
})

test('re-entrant run() switches synchronously without a second view transition', () => {
  const doc = createFakeDocument()
  const controller = createThemeSpotlight({ document: doc, schedule: () => 1, cancel: () => {} })
  controller.run(() => {})
  let changed = 0
  assert.equal(controller.run(() => { changed += 1 }), false)
  assert.equal(changed, 1)
  assert.equal(doc.transitions.length, 1)
  controller.dispose()
})

test('dispose() clears the pending bookkeeping', () => {
  const doc = createFakeDocument()
  const clock = createClock()
  const controller = createThemeSpotlight({ document: doc, schedule: clock.schedule, cancel: clock.cancel })
  controller.run(() => {})
  controller.dispose()
  assert.equal(controller.running, false)
  assert.equal(clock.pending, 0)
})

test('missing DOM is a no-op controller', () => {
  const controller = createThemeSpotlight({ document: undefined, schedule: () => 1, cancel: () => {} })
  assert.equal(controller.supported, false)
  let changed = 0
  assert.equal(controller.run(() => { changed += 1 }), false)
  assert.equal(changed, 1)
  assert.equal(controller.trackOrigin(), undefined)
  assert.doesNotThrow(() => controller.dispose())
})
