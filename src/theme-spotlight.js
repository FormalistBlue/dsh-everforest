// Spotlight theme switch for light <-> dark: the new palette is revealed by a
// circular clip-path growing out of the pointer position, with the old palette
// kept underneath as a static snapshot. This is the View Transitions API pattern
// used by rspress's appearance toggle (web-infra-dev/rspress#1270):
// `startViewTransition` snapshots the old frame, the change runs inside the
// callback, and `documentElement.animate` animates `clip-path` on the
// `::view-transition-new(root)` pseudo-element, which sits above
// `::view-transition-old(root)`.
//
// The reveal always grows the *new* frame. The mirror variant — putting the old
// frame on top and shrinking it into the click point — reads the same while the
// edge moves, but flashes at the end: when the clip animation finishes, the
// effect is dropped a frame or two before the View Transition removes its
// pseudo-element tree, so the clipped snapshot paints unclipped once. On a
// light -> dark switch that stray frame is the old *light* page over a dark
// page, i.e. a visible white flash (reproduced on the real UI: a full-light
// screencast frame between dark ones, 4 out of 5 runs). Growing the new frame is
// structurally immune: its unclipped state is the final state, so even a frame
// without the clip shows the destination palette. `fill: 'forwards'` is not
// enough on its own — Chromium can still paint one unclipped frame before the
// fill lands, so the layering is the fix, not the fill mode.
//
// Why not colour interpolation: fading every colour from light to dark passes
// through the point where text and canvas have equal luminance — measured
// ~1.01:1 mid-fade — which reads as a grey wash. A circular reveal never mixes
// the two palettes except on the moving edge, so text stays readable the whole
// time.
//
// The old frame can only be captured while the change happens inside the
// `startViewTransition` callback, so every switch that should animate has to be
// wrapped at the call site. `client-entry.js` wraps its own palette/Appearance
// actions and wraps `ctx.theme.setTheme` on the service instance, which is how
// DSH's own Appearance row is covered too. Changes that DSH applies without such
// a call (OS scheme flip while following the system, Host broadcasts) cannot be
// wrapped after the fact and stay instant — that is the deliberate fallback:
// no grey, just no animation.
//
// The controller is DOM-light and injectable so `node --test` can drive it.

/** Duration of the circular reveal, in milliseconds. */
export const SPOTLIGHT_DURATION_MS = 400

/** Easing of the reveal (the same curve as the rspress implementation). */
const SPOTLIGHT_EASING = 'ease-in'

/**
 * Whether the host asked for reduced motion. Never throws: a DOM-less context
 * (unit tests, SSR) or a host without `matchMedia` reads as "motion allowed",
 * exactly like a browser that never saw the media query.
 *
 * @param {object} [scope] - object carrying `matchMedia` (defaults to globalThis).
 * @returns {boolean}
 */
function prefersReducedMotion(scope = globalThis) {
  try {
    return typeof scope?.matchMedia === 'function'
      && scope.matchMedia('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    return false
  }
}

/**
 * The stylesheet installed once by the Client half.
 *
 * The user-agent cross-fade is disabled for both snapshots (a cross-fade still
 * passes through the grey midpoint); the reveal itself is the clip-path
 * animation started from `run()`. The frame that is clipped has to sit on top:
 * always the new frame here.
 *
 * @returns {string} CSS source.
 */
export function themeSpotlightStyles() {
  return `::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) { z-index: 1; }
::view-transition-new(root) { z-index: 9999; }`
}

/**
 * Resolve a DSH theme preference to the scheme it will paint. `system` follows
 * the current OS preference (the same media query `ThemeRuntime` uses).
 *
 * @param {string} preference - `light`, `dark` or `system`.
 * @param {object} [scope] - object carrying `matchMedia` (defaults to globalThis).
 * @returns {'light' | 'dark' | null} the painted scheme, or null when the host
 *   cannot answer (no `matchMedia` for `system`).
 */
export function resolveSchemePreference(preference, scope = globalThis) {
  if (preference === 'light' || preference === 'dark') return preference
  if (preference !== 'system') return null
  try {
    if (typeof scope?.matchMedia !== 'function') return null
    return scope.matchMedia('(prefers-color-scheme: dark)').matches === true ? 'dark' : 'light'
  } catch {
    return null
  }
}

/**
 * Create the spotlight controller.
 *
 * @param {object} [options]
 * @param {Document} [options.document] - host document; absent = no-op controller.
 * @param {() => boolean} [options.reducedMotion] - reduced-motion predicate.
 * @param {(callback: () => void, ms: number) => unknown} [options.schedule] - timer.
 * @param {(handle: unknown) => void} [options.cancel] - timer canceller.
 * @param {number} [options.durationMs] - reveal duration.
 * @returns {{
 *   supported: boolean,
 *   running: boolean,
 *   trackOrigin: () => (() => void) | undefined,
 *   run: (change: () => void) => boolean,
 *   dispose: () => void,
 * }}
 */
export function createThemeSpotlight({
  document: doc,
  reducedMotion = prefersReducedMotion,
  schedule = setTimeout,
  cancel = clearTimeout,
  durationMs = SPOTLIGHT_DURATION_MS,
} = {}) {
  const root = doc && doc.documentElement ? doc.documentElement : null
  const view = doc && doc.defaultView ? doc.defaultView : null
  let origin = null
  let running = false
  let timer = null

  function clearTimer() {
    if (timer === null) return
    try {
      cancel(timer)
    } catch {
      // No timers (SSR): nothing to cancel.
    }
    timer = null
  }

  /**
   * Close the spotlight bookkeeping after the transition settled. Also the
   * timer fallback for a skipped/failed transition (`finished` may never fire).
   */
  function finish() {
    if (!running) return
    running = false
    clearTimer()
  }

  /** Whether a reveal can run at all (View Transitions + clip-path animation). */
  function canRun() {
    if (root === null) return false
    if (typeof doc.startViewTransition !== 'function') return false
    if (typeof root.animate !== 'function') return false
    if (typeof reducedMotion === 'function' && reducedMotion()) return false
    return true
  }

  return {
    get supported() {
      return canRun()
    },
    get running() {
      return running
    },
    /**
     * Remember the last pointer position: the reveal grows out of it. A
     * capture-phase listener on the document works for every caller (this
     * plugin's controls and DSH's own Appearance row) without touching their
     * event handlers.
     *
     * @returns {(() => void) | undefined} disposer, when the DOM supports it.
     */
    trackOrigin() {
      if (!doc || typeof doc.addEventListener !== 'function') return undefined
      const onPointerDown = (event) => {
        if (typeof event?.clientX !== 'number' || typeof event?.clientY !== 'number') return
        origin = { x: event.clientX, y: event.clientY }
      }
      doc.addEventListener('pointerdown', onPointerDown, true)
      return () => doc.removeEventListener('pointerdown', onPointerDown, true)
    },
    /**
     * Run one theme change behind a circular reveal that grows the new scheme
     * from the pointer position.
     *
     * On unsupported hosts / reduced motion / re-entrancy the change still runs
     * synchronously (instant switch), so callers never lose a user action.
     *
     * @param {() => void} change - the synchronous palette switch.
     * @returns {boolean} whether a reveal was started.
     */
    run(change) {
      if (!canRun() || running) {
        // Re-entrant or unsupported: apply the change synchronously, but keep
        // `running` true for the duration so the colour-transition listener
        // (which would otherwise grey-fade the scheme switch) stays quiet.
        const wasRunning = running
        running = true
        try {
          change()
        } finally {
          running = wasRunning
        }
        return false
      }
      const width = view && Number.isFinite(view.innerWidth) ? view.innerWidth : 0
      const height = view && Number.isFinite(view.innerHeight) ? view.innerHeight : 0
      const point = origin && origin.x >= 0 && origin.y >= 0
        ? origin
        : { x: Math.round(width / 2), y: Math.round(height / 2) }
      running = true
      let transition
      try {
        transition = doc.startViewTransition(change)
      } catch {
        finish()
        change()
        return false
      }
      try {
        timer = schedule(finish, durationMs + 240)
      } catch {
        // No timers: `finished` still closes the bookkeeping.
      }
      try {
        transition.ready.then(() => {
          const endRadius = Math.hypot(
            Math.max(point.x, width - point.x),
            Math.max(point.y, height - point.y),
          )
          root.animate(
            {
              clipPath: [
                `circle(0px at ${point.x}px ${point.y}px)`,
                `circle(${endRadius}px at ${point.x}px ${point.y}px)`,
              ],
            },
            {
              duration: durationMs,
              easing: SPOTLIGHT_EASING,
              // The new frame is clipped; the old one is never animated. A
              // dropped effect at the end can only reveal the final palette
              // (the unclipped new frame), never the previous one.
              pseudoElement: '::view-transition-new(root)',
            },
          )
        }).catch(() => {})
      } catch {
        // A transition whose `ready` is unusable: the timer closes it.
      }
      try {
        transition.finished.then(finish, finish)
      } catch {
        // Same as above: the fallback timer owns the cleanup.
      }
      return true
    },
    /** Close bookkeeping immediately (plugin unload). */
    dispose() {
      finish()
    },
  }
}
