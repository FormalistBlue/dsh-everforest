/**
 * Development-only Everforest debug overlay (a `shell.overlay` occupant).
 *
 * The panel mirrors the Settings page — Appearance preference and the six
 * palette strengths — as a small floating window on top of the main UI, so a
 * developer can flip through the palettes without opening Settings every time.
 * It writes through the exact same store actions as the Settings page, so
 * first-paint cache, Host persistence, cross-window broadcast and the DSH
 * Appearance write behave identically. Color mode has no control here either:
 * it is a shipped default since 2026-10-24, not a switch.
 *
 * **This module never ships.** `scripts/build.mjs` includes it only when run
 * with `--dev` (`npm run build:dev`); the production build leaves the file out
 * of `client.js` and strips the matching `// @dev-only:` blocks out of
 * `src/client-entry.js`. Keeping the code out of the published artifact is the
 * point: no dead panel code, no extra DOM, no locale keys in the npm package.
 * For that reason the copy here is hard-coded Chinese-first instead of using
 * the locale service: a developer tool must render even when `locale` failed
 * to mount, and it must not enlarge the shipped dictionaries.
 *
 * The component is authored without JSX and without importing React, exactly
 * like `src/settings-page.js`: the client entry injects `{ React, h, store }`,
 * which also lets `node --test` render it with a tiny mock React.
 */

import { DEFAULT_STATE, FOREGROUNDS, RAMPS, STRENGTHS } from './palette.js'

/** Slot identity inside `shell.overlay` (asserted by the dev-build tests). */
export const DEV_PANEL_ID = 'everforest-dev'

/** `localStorage` key holding the panel position and collapsed state. */
export const DEV_PANEL_STORAGE_KEY = 'dsh-everforest/dev-panel/v1'

/** Frame-wide z-index: the panel sits above the app's own overlays. */
const PANEL_Z_INDEX = 2147481000

/** Estimated expanded size, used only to place the panel at the bottom-right. */
const PANEL_WIDTH = 268
const PANEL_HEIGHT = 308

/** Color schemes in display order (dark group first, then light). */
const GROUP_SCHEMES = ['dark', 'light']

/** Appearance preferences in DSH's own order (Light, Dark, Follow system). */
const APPEARANCE_OPTIONS = ['light', 'dark', 'system']

/** Fallback strength order, used when the palette module is not readable. */
const FALLBACK_STRENGTHS = ['hard', 'medium', 'soft']

/** Short chip labels, keyed by strength (dev tool copy, never localized). */
const STRENGTH_LABELS = { hard: '硬', medium: '中', soft: '柔' }

/** Scheme labels, keyed by DSH color scheme. */
const SCHEME_LABELS = { dark: '深色', light: '浅色' }

/** Appearance labels, keyed by DSH appearance preference. */
const APPEARANCE_LABELS = { light: '浅色', dark: '深色', system: '跟随' }

/** Accessibility names for the numbered Appearance options. */
const APPEARANCE_ARIA = { light: '浅色外观', dark: '深色外观', system: '跟随系统外观' }

/**
 * Stylesheet for the panel.
 *
 * Interface colors come from the `--dsw-*` design tokens (with neutral
 * fallbacks); the only literal colors are the palette swatch backgrounds, which
 * are Everforest data, not chrome.
 */
export const DEV_PANEL_STYLES = `
.everforest-dev {
  position: fixed;
  z-index: ${PANEL_Z_INDEX};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: ${PANEL_WIDTH}px;
  max-height: calc(100vh - 24px);
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .45));
  border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-2, #ffffff));
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .32);
  font-family: var(--dsw-font-family, inherit);
  font-size: 12px;
  line-height: 18px;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}
.everforest-dev-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, .25));
  cursor: move;
  touch-action: none;
}
.everforest-dev-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
}
.everforest-dev-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.everforest-dev-badge {
  flex: none;
  padding: 0 5px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .35));
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
  letter-spacing: .04em;
}
.everforest-dev-icon-button {
  flex: none;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 4px);
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  line-height: 20px;
  text-align: center;
}
.everforest-dev-icon-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.everforest-dev-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, .18));
}
.everforest-dev-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.everforest-dev-row-label {
  flex: none;
  width: 40px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.everforest-dev-segment,
.everforest-dev-chips {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  min-width: 0;
}
.everforest-dev-segment-button {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 2px 0;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .35));
  border-radius: var(--dsw-radius-sm, 4px);
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}
.everforest-dev-segment-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.everforest-dev-segment-button[aria-pressed='true'] {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.everforest-dev-chip {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 3px 0;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .35));
  border-radius: var(--dsw-radius-sm, 4px);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}
.everforest-dev-chip[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
}
.everforest-dev-swatch {
  display: inline-block;
  flex: none;
  width: 10px;
  height: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 2px;
}
.everforest-dev-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
}
.everforest-dev-current {
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
}
.everforest-dev-meta {
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
}
.everforest-dev-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.everforest-dev-reset {
  flex: none;
  margin: 0;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .35));
  border-radius: var(--dsw-radius-sm, 4px);
  background: none;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 16px;
}
.everforest-dev-reset:hover {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.everforest-dev-hint {
  flex: 1 1 auto;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 14px;
  text-align: right;
}
.everforest-dev-fab {
  position: fixed;
  z-index: ${PANEL_Z_INDEX};
  box-sizing: border-box;
  width: 38px;
  height: 38px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, .45));
  border-radius: 50%;
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-2, #ffffff));
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 6px 20px rgba(0, 0, 0, .28);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  pointer-events: auto;
}
.everforest-dev-fab:hover {
  border-color: var(--dsw-alias-brand-primary);
}
.everforest-dev button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
`

/**
 * Resolve the storage object to use (same defensive pattern as `src/state.js`).
 * @param {Storage | undefined} storage
 * @returns {Storage | null}
 */
function resolveStorage(storage) {
  if (storage !== undefined && storage !== null) return storage
  try {
    const candidate = globalThis.localStorage
    return candidate && typeof candidate.getItem === 'function' ? candidate : null
  } catch {
    return null
  }
}

/** Viewport dimensions, tolerant of a DOM-less (unit test) run. */
function viewport() {
  if (typeof window !== 'undefined') {
    const width = Number(window.innerWidth)
    const height = Number(window.innerHeight)
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height }
    }
  }
  return { width: 1280, height: 800 }
}

/** Keep a floating panel inside the viewport (allowing a narrow drag margin). */
function clampPosition(left, top) {
  const { width, height } = viewport()
  return {
    left: Math.min(Math.max(4, left), Math.max(4, width - 80)),
    top: Math.min(Math.max(4, top), Math.max(4, height - 40)),
  }
}

/** Bottom-right placement for a fresh panel, leaving the frame's own padding. */
function defaultPosition() {
  const { width, height } = viewport()
  return clampPosition(width - PANEL_WIDTH - 20, height - PANEL_HEIGHT - 20)
}

/**
 * Read the persisted panel placement.
 *
 * A missing, unreadable or malformed payload falls back to the default
 * bottom-right spot; every read is clamped, so a panel saved on a large screen
 * is still visible on a smaller one.
 *
 * @param {Storage | null} storage
 * @returns {{ left: number, top: number, collapsed: boolean }}
 */
function readPanelUi(storage) {
  const fallback = { ...defaultPosition(), collapsed: false }
  if (storage === null) return fallback
  let raw = null
  try {
    raw = storage.getItem(DEV_PANEL_STORAGE_KEY)
  } catch {
    return fallback
  }
  if (typeof raw !== 'string' || raw === '') return fallback
  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback
  const left = Number(parsed.left)
  const top = Number(parsed.top)
  if (!Number.isFinite(left) || !Number.isFinite(top)) return fallback
  return { ...clampPosition(left, top), collapsed: parsed.collapsed === true }
}

/** Persist the panel placement; a failing write never breaks the panel. */
function writePanelUi(storage, ui) {
  if (storage === null) return
  try {
    storage.setItem(DEV_PANEL_STORAGE_KEY, JSON.stringify({
      left: ui.left,
      top: ui.top,
      collapsed: ui.collapsed === true,
    }))
  } catch {
    // Private mode / quota: the panel still works for this session.
  }
}

/**
 * Build the dev panel component.
 *
 * @param {{ React: object, h?: Function, store?: object, storage?: Storage }} dependencies
 *   `React` is the client's React namespace, `h` its `createElement`, `store`
 *   the same store the Settings page receives and `storage` an override used by
 *   tests (defaults to `globalThis.localStorage`).
 * @returns {Function} a hook component with no props, ready for
 *   `slots.register({ name: 'shell.overlay', id: DEV_PANEL_ID }, Component)`.
 */
export function createDevPanel(dependencies) {
  const deps = dependencies && typeof dependencies === 'object' ? dependencies : {}
  const React = deps.React
  if (!React || typeof React.createElement !== 'function') {
    throw new TypeError('[everforest] createDevPanel needs a React-like object with createElement')
  }
  const h = typeof deps.h === 'function' ? deps.h : React.createElement
  const storage = resolveStorage(deps.storage)
  const store = deps.store && typeof deps.store === 'object' ? deps.store : null

  /** The palette strengths in hard → medium → soft order. */
  function strengthList() {
    const provided = Array.isArray(STRENGTHS) ? STRENGTHS : null
    if (provided && FALLBACK_STRENGTHS.every((strength) => provided.includes(strength))) {
      return provided.filter((strength) => FALLBACK_STRENGTHS.includes(strength))
    }
    return FALLBACK_STRENGTHS.slice()
  }

  /** Default Enchanted pairing (light hard / dark soft) used for fallbacks. */
  function defaultPair() {
    const strengths = strengthList()
    const provided = DEFAULT_STATE && typeof DEFAULT_STATE === 'object' ? DEFAULT_STATE : {}
    return {
      light: strengths.includes(provided.light) ? provided.light : 'hard',
      dark: strengths.includes(provided.dark) ? provided.dark : 'soft',
    }
  }

  /**
   * Read a legal state out of a store snapshot (defensive: the panel must never
   * take down the plugin if a host hands it an unexpected shape).
   * @param {object | undefined} snapshot
   */
  function stateFromSnapshot(snapshot) {
    const raw = snapshot && typeof snapshot === 'object' && snapshot.state && typeof snapshot.state === 'object'
      ? snapshot.state
      : {}
    const strengths = strengthList()
    const fallback = defaultPair()
    return {
      light: strengths.includes(raw.light) ? raw.light : fallback.light,
      dark: strengths.includes(raw.dark) ? raw.dark : fallback.dark,
    }
  }

  /** Read the DSH Appearance snapshot (fixed preference + resolved scheme). */
  function themeFromSnapshot(snapshot) {
    const theme = snapshot && typeof snapshot === 'object' && snapshot.theme && typeof snapshot.theme === 'object'
      ? snapshot.theme
      : {}
    const preference = theme.preference === 'light' || theme.preference === 'dark' || theme.preference === 'system'
      ? theme.preference
      : 'system'
    const active = theme.active && typeof theme.active === 'object' ? theme.active : {}
    const colorScheme = active.colorScheme === 'light' || active.colorScheme === 'dark'
      ? active.colorScheme
      : preference === 'light' ? 'light' : 'dark'
    return { preference, colorScheme }
  }

  /** Snapshot selector with a `useState`/`useEffect` fallback for old embeds. */
  function useSnapshot() {
    if (!store || typeof store.getSnapshot !== 'function') {
      return {
        state: { light: defaultPair().light, dark: defaultPair().dark },
        theme: { preference: 'system', active: { colorScheme: 'dark' } },
      }
    }
    if (typeof React.useSyncExternalStore === 'function' && typeof store.subscribe === 'function') {
      return React.useSyncExternalStore(store.subscribe, store.getSnapshot)
    }
    const [snapshot, setSnapshot] = React.useState(() => store.getSnapshot())
    React.useEffect(() => {
      if (typeof store.subscribe !== 'function') return undefined
      setSnapshot(store.getSnapshot())
      return store.subscribe(() => setSnapshot(store.getSnapshot()))
    }, [])
    return snapshot
  }

  /** The five preview colors of one palette, ordered bg0 → bg2 → fg → accent. */
  function chipColors(scheme, strength) {
    const ramps = RAMPS && typeof RAMPS === 'object' ? RAMPS : {}
    const schemeRamps = ramps[scheme] && typeof ramps[scheme] === 'object' ? ramps[scheme] : {}
    const ramp = schemeRamps[strength] && typeof schemeRamps[strength] === 'object' ? schemeRamps[strength] : {}
    const foregrounds = FOREGROUNDS && typeof FOREGROUNDS === 'object' ? FOREGROUNDS : {}
    const fg = foregrounds[scheme] && typeof foregrounds[scheme] === 'object' ? foregrounds[scheme] : {}
    return {
      background: typeof ramp.bg0 === 'string' ? ramp.bg0 : undefined,
      color: typeof fg.fg === 'string' ? fg.fg : undefined,
    }
  }

  /** Call a store action, ignoring hosts without that action (defensive). */
  function callStore(action, ...args) {
    if (!store || typeof store[action] !== 'function') return
    try {
      store[action](...args)
    } catch (error) {
      console.warn(`[everforest] dev panel ${action} failed`, error)
    }
  }

  /**
   * The panel. Renders the same actions as the Settings page, with a compact
   * layout and a header that drags the panel around; placement and the
   * collapsed state are remembered per browser.
   */
  function DevPanel() {
    const [ui, setUi] = React.useState(() => readPanelUi(storage))
    // Mirror the latest placement for pointer handlers (state updates are
    // asynchronous, a drag needs the current origin on every move).
    const uiRef = typeof React.useRef === 'function' ? React.useRef(ui) : { current: ui }
    if (uiRef.current === null || uiRef.current === undefined) uiRef.current = ui
    const snapshot = useSnapshot()
    const state = stateFromSnapshot(snapshot)
    const theme = themeFromSnapshot(snapshot)
    const strengths = strengthList()

    /** Update the placement state and (optionally) persist it. */
    function updateUi(next, persist) {
      const clamped = { ...next, ...clampPosition(next.left, next.top) }
      uiRef.current = clamped
      setUi(clamped)
      if (persist) writePanelUi(storage, clamped)
    }

    /** Collapse the panel into the small round button. */
    function collapse() {
      updateUi({ ...uiRef.current, collapsed: true }, true)
    }

    /** Expand the panel again. */
    function expand() {
      updateUi({ ...uiRef.current, collapsed: false }, true)
    }

    /**
     * Drag the panel by its header. Pointer events keep mouse, pen and touch
     * on one code path; listeners live only for the duration of one drag.
     */
    function beginDrag(event) {
      const target = event && event.target
      if (target && typeof target.closest === 'function' && target.closest('button')) return
      if (!event || typeof event.clientX !== 'number') return
      const origin = uiRef.current
      const startX = event.clientX
      const startY = event.clientY
      if (typeof event.preventDefault === 'function') event.preventDefault()

      const onMove = (moveEvent) => {
        const left = origin.left + (moveEvent.clientX - startX)
        const top = origin.top + (moveEvent.clientY - startY)
        updateUi({ ...uiRef.current, left, top }, false)
      }
      const onUp = () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
        }
        writePanelUi(storage, uiRef.current)
      }

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      }
    }

    /** One appearance option (segmented control). */
    function renderAppearanceOption(preference) {
      const selected = theme.preference === preference
      return h('button', {
        key: preference,
        type: 'button',
        className: 'everforest-dev-segment-button',
        'aria-pressed': selected ? 'true' : 'false',
        'aria-label': APPEARANCE_ARIA[preference],
        'data-preference': preference,
        onClick: () => callStore('setPreference', preference),
      }, APPEARANCE_LABELS[preference])
    }

    /** One palette chip: swatch background + strength label + selected ring. */
    function renderChip(scheme, strength) {
      const selected = state[scheme] === strength
      const colors = chipColors(scheme, strength)
      const style = {}
      if (colors.background !== undefined) style.backgroundColor = colors.background
      if (colors.color !== undefined) style.color = colors.color
      return h('button', {
        key: scheme + '-' + strength,
        type: 'button',
        className: 'everforest-dev-chip',
        style,
        'aria-pressed': selected ? 'true' : 'false',
        'aria-label': SCHEME_LABELS[scheme] + (STRENGTH_LABELS[strength] ?? strength),
        'data-scheme': scheme,
        'data-strength': strength,
        onClick: () => callStore('select', scheme, strength),
      }, STRENGTH_LABELS[strength] ?? strength)
    }

    /** One scheme row: label followed by the three strength chips. */
    function renderGroup(scheme) {
      return h('div', {
        key: 'group-' + scheme,
        className: 'everforest-dev-row',
      }, [
        h('span', { key: 'label', className: 'everforest-dev-row-label' }, SCHEME_LABELS[scheme]),
        h('div', {
          key: 'chips',
          className: 'everforest-dev-chips',
          role: 'group',
          'aria-label': SCHEME_LABELS[scheme] + '调色板',
        }, strengths.map((strength) => renderChip(scheme, strength))),
      ])
    }

    /** Appearance + the two palette groups. */
    function renderSettings() {
      return h('div', { key: 'settings', className: 'everforest-dev-section' }, [
        h('div', { key: 'appearance', className: 'everforest-dev-row' }, [
          h('span', { key: 'label', className: 'everforest-dev-row-label' }, '外观'),
          h('div', {
            key: 'options',
            className: 'everforest-dev-segment',
            role: 'group',
            'aria-label': '外观 Appearance',
          }, APPEARANCE_OPTIONS.map((preference) => renderAppearanceOption(preference))),
        ]),
        ...GROUP_SCHEMES.map((scheme) => renderGroup(scheme)),
      ])
    }

    /** Current state summary, reset action and the dev-build hint. */
    function renderFooter() {
      const summary = SCHEME_LABELS.dark + ' ' + (STRENGTH_LABELS[state.dark] ?? state.dark)
        + ' · ' + SCHEME_LABELS.light + ' ' + (STRENGTH_LABELS[state.light] ?? state.light)
      const meta = '外观 ' + APPEARANCE_LABELS[theme.preference]
        + ' · 实际 ' + SCHEME_LABELS[theme.colorScheme]
      return h('div', { key: 'footer', className: 'everforest-dev-footer' }, [
        h('span', { key: 'current', className: 'everforest-dev-current' }, summary),
        h('span', { key: 'meta', className: 'everforest-dev-meta' }, meta),
        h('div', { key: 'actions', className: 'everforest-dev-actions' }, [
          h('button', {
            key: 'reset',
            type: 'button',
            className: 'everforest-dev-reset',
            onClick: () => callStore('reset'),
          }, '恢复默认'),
          h('span', { key: 'hint', className: 'everforest-dev-hint' }, 'DEV 构建'),
        ]),
      ])
    }

    /**
     * Inline structural style, shared by the expanded panel and the collapsed
     * button.
     *
     * The visual styling lives in {@link DEV_PANEL_STYLES}, but `position`,
     * `left` / `top`, the stacking order and `pointer-events` stay inline on
     * purpose: this is a dev overlay inside the shell's click-through
     * `shell.overlay` layer, so a stylesheet that is missing for even one
     * render must not drop the panel into the document flow (`position:
     * static` at the top-left corner) or inherit `pointer-events: none` and
     * become impossible to click. That exact failure happened when the
     * collapsed state rendered without its `<style>` element (2026-10-24), so
     * the stylesheet is now mounted in both states and these four properties
     * are belt-and-braces inline.
     */
    function frameStyle() {
      return {
        position: 'fixed',
        left: ui.left + 'px',
        top: ui.top + 'px',
        zIndex: PANEL_Z_INDEX,
        pointerEvents: 'auto',
      }
    }

    // The stylesheet is returned in BOTH states: it used to live inside the
    // expanded tree, so collapsing unmounted it and the bare <button> fell back
    // to normal flow in the top-left corner of the click-through layer.
    const stylesheet = h('style', { key: 'everforest-dev-styles' }, DEV_PANEL_STYLES)

    if (ui.collapsed === true) {
      return [
        stylesheet,
        h('button', {
          key: 'everforest-dev-fab',
          type: 'button',
          className: 'everforest-dev-fab',
          style: frameStyle(),
          title: '打开 Everforest 调试面板',
          'aria-label': '打开 Everforest 调试面板',
          'data-dev-panel': DEV_PANEL_ID,
          'data-collapsed': 'true',
          onClick: expand,
        }, 'EF'),
      ]
    }

    return [
      stylesheet,
      h('div', {
        key: 'everforest-dev-panel',
        className: 'everforest-dev',
        style: frameStyle(),
        'data-dev-panel': DEV_PANEL_ID,
        'data-collapsed': 'false',
      }, [
        h('div', { key: 'header', className: 'everforest-dev-header', onPointerDown: beginDrag }, [
          h('span', { key: 'dot', className: 'everforest-dev-dot', 'aria-hidden': 'true' }),
          h('span', { key: 'title', className: 'everforest-dev-title' }, 'Everforest'),
          h('span', { key: 'badge', className: 'everforest-dev-badge' }, 'DEV'),
          h('button', {
            key: 'collapse',
            type: 'button',
            className: 'everforest-dev-icon-button',
            'aria-label': '收起调试面板',
            title: '收起',
            onClick: collapse,
          }, '—'),
        ]),
        renderSettings(),
        renderFooter(),
      ]),
    ]
  }

  return DevPanel
}
