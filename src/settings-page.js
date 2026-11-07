/**
 * Everforest Settings page (`settings.section` occupant).
 *
 * The page is built without JSX and without importing React: the client entry
 * injects `{ React, h, palette }` through `createSettingsComponent`, so the
 * same source runs inside the DSH client bundle (where `react` is supplied by
 * the module loader) and in plain Node tests (where a tiny mock React is
 * enough). Nothing here requires a `@deepseek-ai/*` package.
 *
 * The page shows an Appearance control — a day/night switch re-skinned from the
 * Uiverse "jolly-chicken-91" switch (MIT, see THIRD_PARTY_NOTICES.md) with
 * Everforest palette colours, plus a "Follow system" chip that keeps DSH's third
 * preference reachable — followed by two groups of three strength cards (Dark,
 * default Soft; Light, default Hard). Each card previews the five signature
 * colors of its palette: bg0, bg1, bg2, fg and header-aqua. Selecting a card
 * persists the choice (through the injected store) and, when it belongs to the
 * other color scheme, also switches DSH Appearance; the switch fixes
 * DSH Appearance to light/dark and the chip switches it back to `system`
 * without touching the palette strengths. Color mode has no control here: since
 * 2026-10-24 it ships as a default feature (see `src/color-mode.js`).
 * Explanatory copy is deliberately absent: DSH's own Appearance row does not
 * show any either, and the user's 2026-10-23 screenshot review asked to remove
 * it here as well.
 *
 * Styling uses only `--dsw-*` design tokens for interface colors. The palette
 * colors in the preview stripes are Everforest data, supplied inline by the
 * injected palette module (artwork, not chrome).
 */

/**
 * Stylesheet for the Settings page.
 *
 * Exported as a string so the client entry can install it as a plain
 * `<style data-plugin="dsh-everforest">` element (installed bundles have no
 * `styles.insert` helper) and remove it again on unload.
 */
export const SETTINGS_STYLES = `
.everforest-page {
  /* One hairline width for every border in this page, matching DSH's own
   * .5px solid settings cards / inputs / outline buttons. Selection changes the
   * border colour only — it must never thicken the outline (2026-10-24: the
   * selected strength cards used a 1px inset ring on top of the 1px border and
   * read as 2px next to the borders of the other controls). */
  --everforest-border-width: .5px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 8px;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family, inherit);
  font-size: 14px;
  line-height: 22px;
}
.everforest-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.everforest-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}
.everforest-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
}
.everforest-group-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}
.everforest-appearance-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
/* Day/night switch: an Everforest-coloured re-skin of the Uiverse
 * "jolly-chicken-91" switch (MIT, RiccardoRapelli — see THIRD_PARTY_NOTICES).
 * The artwork colours are Everforest palette data supplied inline by the
 * component (the --everforest-switch-* custom properties), never literals in
 * this stylesheet. */
.everforest-appearance-switch {
  position: relative;
  box-sizing: border-box;
  display: inline-block;
  flex: none;
  width: 60px;
  height: 34px;
  margin: 0;
  padding: 0;
  border: var(--everforest-border-width) solid var(--dsw-alias-border-l4);
  border-radius: 34px;
  background: none;
  font: inherit;
  cursor: pointer;
}
.everforest-appearance-switch:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.everforest-appearance-track {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: 34px;
  background-color: var(--everforest-switch-day-track);
  transition: background-color .4s;
}
.everforest-appearance-switch[aria-checked='true'] .everforest-appearance-track {
  background-color: var(--everforest-switch-night-track);
}
.everforest-appearance-orb {
  position: absolute;
  left: 4px;
  bottom: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--everforest-switch-sun);
  transition: transform .4s, background-color .4s;
}
.everforest-appearance-switch[aria-checked='true'] .everforest-appearance-orb {
  transform: translateX(26px);
  background-color: var(--everforest-switch-moon);
  animation: everforest-switch-turn .6s ease-in-out both;
}
.everforest-appearance-moon-dot {
  position: absolute;
  z-index: 4;
  opacity: 0;
  transition: opacity .4s;
  fill: var(--everforest-switch-crater);
}
.everforest-appearance-switch[aria-checked='true'] .everforest-appearance-moon-dot {
  opacity: 1;
}
.everforest-appearance-dot-1 { left: 10px; top: 3px; width: 6px; height: 6px; }
.everforest-appearance-dot-2 { left: 2px; top: 10px; width: 10px; height: 10px; }
.everforest-appearance-dot-3 { left: 16px; top: 18px; width: 3px; height: 3px; }
.everforest-appearance-ray {
  position: absolute;
  z-index: -1;
  opacity: .1;
  fill: var(--everforest-switch-ray);
}
.everforest-appearance-ray-1 { left: -8px; top: -8px; width: 43px; height: 43px; }
.everforest-appearance-ray-2 { left: -50%; top: -50%; width: 55px; height: 55px; }
.everforest-appearance-ray-3 { left: -18px; top: -18px; width: 60px; height: 60px; }
.everforest-appearance-cloud {
  position: absolute;
  animation: everforest-switch-cloud 6s infinite;
}
.everforest-appearance-cloud-light { fill: var(--everforest-switch-cloud); }
.everforest-appearance-cloud-shade {
  fill: var(--everforest-switch-cloud-shade);
  animation-delay: 1s;
}
.everforest-appearance-cloud-1 { left: 30px; top: 15px; width: 40px; }
.everforest-appearance-cloud-2 { left: 44px; top: 10px; width: 20px; }
.everforest-appearance-cloud-3 { left: 18px; top: 24px; width: 30px; }
.everforest-appearance-cloud-4 { left: 36px; top: 18px; width: 40px; }
.everforest-appearance-cloud-5 { left: 48px; top: 14px; width: 20px; }
.everforest-appearance-cloud-6 { left: 22px; top: 26px; width: 30px; }
.everforest-appearance-stars {
  transform: translateY(-32px);
  opacity: 0;
  transition: transform .4s, opacity .4s;
}
.everforest-appearance-switch[aria-checked='true'] .everforest-appearance-stars {
  transform: translateY(0);
  opacity: 1;
}
.everforest-appearance-star {
  position: absolute;
  fill: var(--everforest-switch-star);
  animation: everforest-switch-twinkle 2s infinite;
}
.everforest-appearance-star-1 { width: 20px; top: 2px; left: 3px; animation-delay: .3s; }
.everforest-appearance-star-2 { width: 6px; top: 16px; left: 3px; }
.everforest-appearance-star-3 { width: 12px; top: 20px; left: 10px; animation-delay: .6s; }
.everforest-appearance-star-4 { width: 18px; top: 0; left: 18px; animation-delay: 1.3s; }
.everforest-appearance-system {
  flex: none;
  margin: 0;
  padding: 6px 14px;
  border: var(--everforest-border-width) solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  background: none;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
}
.everforest-appearance-system:hover:not([aria-pressed='true']) {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.everforest-appearance-system[aria-pressed='true'] {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-module-platform);
}
.everforest-appearance-system:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
@keyframes everforest-switch-turn {
  from { transform: translateX(26px) rotate(0deg); }
  to { transform: translateX(26px) rotate(360deg); }
}
@keyframes everforest-switch-cloud {
  0% { transform: translateX(0); }
  40% { transform: translateX(4px); }
  80% { transform: translateX(-4px); }
  100% { transform: translateX(0); }
}
@keyframes everforest-switch-twinkle {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  80% { transform: scale(.8); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .everforest-appearance-track,
  .everforest-appearance-orb,
  .everforest-appearance-moon-dot,
  .everforest-appearance-stars {
    transition: none;
  }
  .everforest-appearance-orb,
  .everforest-appearance-cloud,
  .everforest-appearance-star {
    animation: none;
  }
}
.everforest-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 520px) {
  .everforest-cards {
    grid-template-columns: 1fr;
  }
}
.everforest-card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 12px;
  border: var(--everforest-border-width) solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2));
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2));
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color .12s ease, background-color .12s ease;
}
.everforest-card:hover {
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
}
.everforest-card[aria-pressed='true'] {
  border-color: var(--dsw-alias-brand-primary);
}
.everforest-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.everforest-swatch {
  display: flex;
  height: 30px;
  overflow: hidden;
  border: var(--everforest-border-width) solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
}
.everforest-swatch-segment {
  flex: 1 1 0;
  min-width: 0;
}
.everforest-card-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
  font-size: 13px;
  line-height: 18px;
}
.everforest-card-mark {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
}
.everforest-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 14px 0;
  border-top: var(--everforest-border-width) solid var(--dsw-alias-border-l2);
  border-bottom: var(--everforest-border-width) solid var(--dsw-alias-border-l2);
}
.everforest-current-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.everforest-current-main {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
}
.everforest-current-meta {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.everforest-reset {
  flex: none;
  margin: 0;
  padding: 6px 14px;
  border: var(--everforest-border-width) solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  background: none;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
}
.everforest-reset:hover {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.everforest-reset:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.everforest-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`

/** Color schemes in display order (dark group first, then light). */
const GROUP_SCHEMES = ['dark', 'light']

/**
 * Fallback colours of the day/night switch artwork, used when the palette module
 * is not readable. These are palette1 values, not interface chrome: the day side
 * takes the light scheme's accent blue / yellow / canvas and the night side the
 * dark scheme's deepest canvas, cream foreground and grey.
 * @type {Record<string, string>}
 */
const FALLBACK_SWITCH_ART = {
  dayTrack: '#3A94C5',
  sun: '#DFA000',
  nightTrack: '#1E2326',
  moon: '#D3C6AA',
  crater: '#859289',
  cloud: '#FFFBEF',
  cloudShade: '#D3C6AA',
  star: '#D3C6AA',
  ray: '#FFFBEF',
}

/** Fallback strength order, used when the palette module is not yet readable. */
const FALLBACK_STRENGTHS = ['hard', 'medium', 'soft']

/** Used when the page is mounted without a store (should not happen in DSH). */
const EMPTY_SNAPSHOT = {
  state: { light: 'hard', dark: 'soft' },
  theme: { preference: 'system', active: { colorScheme: 'dark' } },
}

/** No-op store used only when no store was injected. */
const EMPTY_STORE = {
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: () => () => {},
  select: () => {},
  reset: () => {},
  setPreference: () => {},
}

/**
 * Expand `{name}` placeholders.
 *
 * The real locale service expands parameters itself; this helper also covers a
 * fallback translator that only maps keys to strings and ignores parameters.
 * Unknown placeholders are kept verbatim so missing data is visible in tests.
 *
 * @param {unknown} template
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
function formatTemplate(template, params) {
  const text = typeof template === 'string' ? template : String(template ?? '')
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ))
}

/**
 * Build the Settings page component.
 *
 * @param {{ React: object, h: Function, palette: object }} dependencies
 *   `React` is the client's React 18 namespace, `h` is `React.createElement`
 *   (both must be injected: this file never imports React), and `palette` is
 *   the `src/palette.js` module namespace.
 * @returns {(props: { t?: Function, store?: object }) => object}
 */
export function createSettingsComponent(dependencies) {
  const deps = dependencies && typeof dependencies === 'object' ? dependencies : {}
  const React = deps.React
  const palette = deps.palette && typeof deps.palette === 'object' ? deps.palette : {}
  if (!React || typeof React.createElement !== 'function') {
    throw new TypeError('[everforest] createSettingsComponent needs a React-like object with createElement')
  }
  const h = typeof deps.h === 'function' ? deps.h : React.createElement

  /** Strengths to display, hard → medium → soft. */
  function strengthList() {
    const provided = Array.isArray(palette.STRENGTHS) ? palette.STRENGTHS : null
    if (provided && FALLBACK_STRENGTHS.every((strength) => provided.includes(strength))) {
      return provided.filter((strength) => FALLBACK_STRENGTHS.includes(strength))
    }
    return FALLBACK_STRENGTHS.slice()
  }

  /** Default Enchanted pairing: light hard, dark soft. */
  function defaultPair() {
    const strengths = strengthList()
    const provided = palette.DEFAULT_STATE && typeof palette.DEFAULT_STATE === 'object'
      ? palette.DEFAULT_STATE
      : {}
    return {
      light: strengths.includes(provided.light) ? provided.light : 'hard',
      dark: strengths.includes(provided.dark) ? provided.dark : 'soft',
    }
  }

  /**
   * Read a legal state out of a store snapshot.
   *
   * Only the two strengths matter to this page; the retired `colorMode` flag of
   * a 0.4.x snapshot is ignored, and a missing/hostile field falls back to the
   * shipped default like the cache and Host normalizers do.
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

  /**
   * Read the DSH Appearance snapshot: the fixed preference plus the scheme that
   * is actually active after `system` resolution.
   * @param {object | undefined} snapshot
   */
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

  /**
   * The day/night switch artwork colours, read from the injected palette module.
   *
   * The switch is a mode control, not a palette preview: its two halves always
   * show the light scheme's day (accent blue sky, amber sun) and the dark
   * scheme's night (deepest canvas, cream moon, grey craters), independent of
   * the selected strength. Missing palette data falls back to the same
   * palette1 values so a bare mount still renders.
   * @returns {Record<string, string>} CSS custom-property values for the switch.
   */
  function switchArtwork() {
    const foregrounds = palette.FOREGROUNDS && typeof palette.FOREGROUNDS === 'object' ? palette.FOREGROUNDS : {}
    const ramps = palette.RAMPS && typeof palette.RAMPS === 'object' ? palette.RAMPS : {}
    const lightFg = foregrounds.light && typeof foregrounds.light === 'object' ? foregrounds.light : {}
    const darkFg = foregrounds.dark && typeof foregrounds.dark === 'object' ? foregrounds.dark : {}
    const lightHard = ramps.light && typeof ramps.light === 'object' && ramps.light.hard && typeof ramps.light.hard === 'object'
      ? ramps.light.hard
      : {}
    const darkHard = ramps.dark && typeof ramps.dark === 'object' && ramps.dark.hard && typeof ramps.dark.hard === 'object'
      ? ramps.dark.hard
      : {}
    return {
      dayTrack: lightFg.blue ?? FALLBACK_SWITCH_ART.dayTrack,
      sun: lightFg.yellow ?? FALLBACK_SWITCH_ART.sun,
      nightTrack: darkHard.bgDim ?? FALLBACK_SWITCH_ART.nightTrack,
      moon: darkFg.fg ?? FALLBACK_SWITCH_ART.moon,
      crater: darkFg.grey1 ?? FALLBACK_SWITCH_ART.crater,
      cloud: lightHard.bg0 ?? FALLBACK_SWITCH_ART.cloud,
      cloudShade: darkFg.fg ?? FALLBACK_SWITCH_ART.cloudShade,
      star: darkFg.fg ?? FALLBACK_SWITCH_ART.star,
      ray: lightHard.bg0 ?? FALLBACK_SWITCH_ART.ray,
    }
  }

  /** Resolve an injected store, falling back to an empty one. */
  function resolveStore(store) {
    if (
      store
      && typeof store === 'object'
      && typeof store.getSnapshot === 'function'
      && typeof store.subscribe === 'function'
    ) {
      return store
    }
    return EMPTY_STORE
  }

  /** The five preview colors of one palette: bg0, bg1, bg2, fg, the accent aqua. */
  function swatchColors(scheme, strength) {
    const ramps = palette.RAMPS && typeof palette.RAMPS === 'object' ? palette.RAMPS : {}
    const schemeRamps = ramps[scheme] && typeof ramps[scheme] === 'object' ? ramps[scheme] : {}
    const ramp = schemeRamps[strength] && typeof schemeRamps[strength] === 'object' ? schemeRamps[strength] : {}
    const foregrounds = palette.FOREGROUNDS && typeof palette.FOREGROUNDS === 'object' ? palette.FOREGROUNDS : {}
    const fg = foregrounds[scheme] && typeof foregrounds[scheme] === 'object' ? foregrounds[scheme] : {}
    return [ramp.bg0, ramp.bg1, ramp.bg2, fg.fg, fg.aqua]
  }

  /**
   * Subscribe to the store snapshot.
   *
   * React 18's `useSyncExternalStore` is preferred. It may be missing from
   * older embeddings, so a `useState` + `useEffect` fallback keeps the page
   * working there too.
   * @param {object} store
   */
  function useSnapshot(store) {
    if (typeof React.useSyncExternalStore === 'function') {
      return React.useSyncExternalStore(store.subscribe, store.getSnapshot)
    }
    const [snapshot, setSnapshot] = React.useState(() => store.getSnapshot())
    React.useEffect(() => {
      let mounted = true
      const update = () => {
        if (mounted) setSnapshot(store.getSnapshot())
      }
      setSnapshot(store.getSnapshot())
      const unsubscribe = typeof store.subscribe === 'function' ? store.subscribe(update) : undefined
      return () => {
        mounted = false
        if (typeof unsubscribe === 'function') unsubscribe()
      }
    }, [store])
    return snapshot
  }

  /**
   * The settings page.
   * @param {{ t?: Function, store?: object }} props - slot props: `t` (bound
   *   translator) and `store` (injected by the client entry); standard owner
   *   props such as `close` are ignored.
   */
  function Component(props) {
    const inject = props && typeof props === 'object' ? props : {}
    const translate = typeof inject.t === 'function' ? inject.t : (key) => String(key)
    const store = resolveStore(inject.store)
    const snapshot = useSnapshot(store)
    const state = stateFromSnapshot(snapshot)
    const theme = themeFromSnapshot(snapshot)
    const strengths = strengthList()

    /** Translate one key, expanding `{name}` parameters. */
    function t(key, params) {
      return formatTemplate(translate(key), params)
    }

    /** One palette card (button with a five-segment swatch). */
    function renderCard(scheme, strength) {
      const selected = state[scheme] === strength
      const groupLabel = t('group.' + scheme)
      const strengthLabel = t('strength.' + strength)
      const colors = swatchColors(scheme, strength)
      const segments = colors.map((color, index) => h('span', {
        key: 'segment-' + index,
        className: 'everforest-swatch-segment',
        style: color ? { backgroundColor: color } : undefined,
      }))
      return h('button', {
        key: scheme + '-' + strength,
        type: 'button',
        className: selected ? 'everforest-card everforest-card-selected' : 'everforest-card',
        'aria-pressed': selected ? 'true' : 'false',
        'aria-label': t('aria.card', { scheme: groupLabel, strength: strengthLabel }),
        'data-scheme': scheme,
        'data-strength': strength,
        onClick: () => {
          if (typeof store.select === 'function') store.select(scheme, strength)
        },
      }, [
        h('span', {
          key: 'swatch',
          className: 'everforest-swatch',
          'aria-hidden': 'true',
        }, segments),
        h('span', { key: 'label', className: 'everforest-card-label' }, [
          h('span', { key: 'name', className: 'everforest-card-name' }, strengthLabel),
          selected
            ? h('span', { key: 'mark', className: 'everforest-card-mark', 'aria-hidden': 'true' })
            : null,
        ]),
      ])
    }

    /**
     * One decorative SVG of the switch scene: a 100×100 circle, or the 20×20
     * four-point star path. Fill and position come from the stylesheet.
     */
    function renderSwitchSvg(kind, index, className) {
      const isStar = kind === 'star'
      return h('svg', {
        key: className + '-' + index,
        className,
        viewBox: isStar ? '0 0 20 20' : '0 0 100 100',
        'aria-hidden': 'true',
      }, isStar
        ? h('path', { d: 'M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z' })
        : h('circle', { cx: 50, cy: 50, r: 50 }))
    }

    /**
     * The day/night switch: a native `<button role="switch">` whose sun/moon
     * scene is the Everforest-adapted Uiverse switch. `aria-checked` mirrors the
     * scheme that is actually showing, so `system` still reports the resolved
     * side; toggling always fixes DSH Appearance to light/dark.
     */
    function renderAppearanceSwitch() {
      const isDark = theme.colorScheme === 'dark'
      const art = switchArtwork()
      const style = {
        // Everforest palette data, supplied inline: the stylesheet only uses it.
        '--everforest-switch-day-track': art.dayTrack,
        '--everforest-switch-night-track': art.nightTrack,
        '--everforest-switch-sun': art.sun,
        '--everforest-switch-moon': art.moon,
        '--everforest-switch-crater': art.crater,
        '--everforest-switch-cloud': art.cloud,
        '--everforest-switch-cloud-shade': art.cloudShade,
        '--everforest-switch-star': art.star,
        '--everforest-switch-ray': art.ray,
      }
      const moonDots = [1, 2, 3].map((index) => renderSwitchSvg(
        'dot', index, 'everforest-appearance-moon-dot everforest-appearance-dot-' + index,
      ))
      const rays = [1, 2, 3].map((index) => renderSwitchSvg(
        'ray', index, 'everforest-appearance-ray everforest-appearance-ray-' + index,
      ))
      const clouds = [1, 2, 3, 4, 5, 6].map((index) => renderSwitchSvg(
        'cloud', index,
        'everforest-appearance-cloud ' +
          (index <= 3 ? 'everforest-appearance-cloud-shade ' : 'everforest-appearance-cloud-light ') +
          'everforest-appearance-cloud-' + index,
      ))
      const stars = [1, 2, 3, 4].map((index) => renderSwitchSvg(
        'star', index, 'everforest-appearance-star everforest-appearance-star-' + index,
      ))
      return h('button', {
        key: 'switch',
        type: 'button',
        role: 'switch',
        className: 'everforest-appearance-switch',
        'aria-checked': isDark ? 'true' : 'false',
        'aria-label': t('appearance.switch'),
        style,
        onClick: () => {
          if (typeof store.setPreference === 'function') store.setPreference(isDark ? 'light' : 'dark')
        },
      }, h('span', {
        key: 'track',
        className: 'everforest-appearance-track',
        'aria-hidden': 'true',
      }, [
        h('span', { key: 'orb', className: 'everforest-appearance-orb' }, [
          ...moonDots,
          ...rays,
          ...clouds,
        ]),
        h('span', { key: 'stars', className: 'everforest-appearance-stars', 'aria-hidden': 'true' }, stars),
      ]))
    }

    /** The "Follow system" choice, kept beside the switch. */
    function renderAppearanceSystem() {
      const selected = theme.preference === 'system'
      return h('button', {
        key: 'system',
        type: 'button',
        className: 'everforest-appearance-system',
        'aria-pressed': selected ? 'true' : 'false',
        onClick: () => {
          if (typeof store.setPreference === 'function') store.setPreference('system')
        },
      }, t('appearance.system'))
    }

    /**
     * Appearance control: one day/night switch plus a "Follow system" chip.
     * The switch always fixes DSH Appearance; the chip returns it to following
     * the OS, so all three DSH preferences stay reachable from this page.
     */
    function renderAppearance() {
      const headingId = 'everforest-appearance-title'
      return h('section', {
        key: 'appearance',
        className: 'everforest-group everforest-appearance',
        'aria-labelledby': headingId,
      }, [
        h('h3', { key: 'heading', id: headingId, className: 'everforest-group-title' }, t('appearance.title')),
        h('div', {
          key: 'controls',
          className: 'everforest-appearance-row',
        }, [renderAppearanceSwitch(), renderAppearanceSystem()]),
      ])
    }

    /** One scheme group: heading + three strength cards. */
    function renderGroup(scheme) {
      const headingId = 'everforest-group-' + scheme
      const groupLabel = t('group.' + scheme)
      return h('section', {
        key: 'group-' + scheme,
        className: 'everforest-group',
        'aria-labelledby': headingId,
      }, [
        h('h3', { key: 'heading', id: headingId, className: 'everforest-group-title' }, groupLabel),
        h('div', {
          key: 'cards',
          className: 'everforest-cards',
          role: 'group',
          'aria-label': t('aria.group', { scheme: groupLabel }),
        }, strengths.map((strength) => renderCard(scheme, strength))),
      ])
    }

    /** Current pairing, actual appearance, and the restore-defaults action. */
    function renderCurrent() {
      const darkLabel = t('group.dark') + ' ' + t('strength.' + state.dark)
      const lightLabel = t('group.light') + ' ' + t('strength.' + state.light)
      const summary = t('current.summary', { dark: darkLabel, light: lightLabel })
      let meta = t('current.active') + ': ' + t('group.' + theme.colorScheme)
      if (theme.preference === 'system') meta += ' · ' + t('current.system')
      return h('div', {
        key: 'current',
        className: 'everforest-current',
        // A plain <div> cannot be named by `aria-label`; the group role makes
        // the label land in the accessibility tree as the row's group name.
        role: 'group',
        'aria-label': t('current.label'),
      }, [
        h('div', { key: 'text', className: 'everforest-current-text' }, [
          h('p', { key: 'summary', className: 'everforest-current-main' }, summary),
          h('p', { key: 'meta', className: 'everforest-current-meta' }, meta),
        ]),
        h('button', {
          key: 'reset',
          type: 'button',
          className: 'everforest-reset',
          onClick: () => {
            if (typeof store.reset === 'function') store.reset()
          },
        }, t('reset')),
      ])
    }

    return h('div', { className: 'everforest-page' }, [
      h('header', { key: 'header', className: 'everforest-header' }, [
        h('h2', { key: 'title', className: 'everforest-title' }, t('nav.title')),
      ]),
      renderAppearance(),
      GROUP_SCHEMES.map((scheme) => renderGroup(scheme)),
      renderCurrent(),
    ])
  }

  return Component
}
