/**
 * Everforest Settings page (`settings.section` occupant).
 *
 * The page is built without JSX and without importing React: the client entry
 * injects `{ React, h, palette }` through `createSettingsComponent`, so the
 * same source runs inside the DSH client bundle (where `react` is supplied by
 * the module loader) and in plain Node tests (where a tiny mock React is
 * enough). Nothing here requires a `@deepseek-ai/*` package.
 *
 * The page shows an Appearance control — follow the system, or fix light/dark —
 * followed by two groups of three strength cards (Dark, default Soft; Light,
 * default Hard). Each card previews the five signature colors of its palette:
 * bg0, bg1, bg2, fg and header-aqua. Selecting a card persists the choice
 * (through the injected store) and, when it belongs to the other color scheme,
 * also switches DSH Appearance; the Appearance control switches it back to
 * `system` (or a fixed side) without touching the palette strengths, and the
 * hint copy spells both facts out.
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
.everforest-intro {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
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
.everforest-appearance-options {
  display: inline-flex;
  flex-wrap: wrap;
  align-self: flex-start;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-2);
}
.everforest-appearance-option {
  margin: 0;
  padding: 6px 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}
.everforest-appearance-option:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.everforest-appearance-option[aria-pressed='true'] {
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.everforest-appearance-option:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.everforest-appearance-note {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
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
  .everforest-appearance-options {
    display: flex;
    width: 100%;
    box-sizing: border-box;
  }
  .everforest-appearance-option {
    flex: 1 1 0;
    min-width: 0;
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
  border: 1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2));
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
  box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary);
}
.everforest-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.everforest-swatch {
  display: flex;
  height: 30px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
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
  border-top: .5px solid var(--dsw-alias-border-l2);
  border-bottom: .5px solid var(--dsw-alias-border-l2);
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
  border: 1px solid var(--dsw-alias-border-l3);
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
.everforest-hints {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.everforest-hint {
  margin: 0;
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

/** Appearance preferences in display order (mirrors DSH's own three-way switch). */
const APPEARANCE_OPTIONS = ['system', 'dark', 'light']

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
   * Read a legal `{ light, dark }` out of a store snapshot.
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

  /** The five preview colors of one palette: bg0, bg1, bg2, fg, header-aqua. */
  function swatchColors(scheme, strength) {
    const ramps = palette.RAMPS && typeof palette.RAMPS === 'object' ? palette.RAMPS : {}
    const schemeRamps = ramps[scheme] && typeof ramps[scheme] === 'object' ? ramps[scheme] : {}
    const ramp = schemeRamps[strength] && typeof schemeRamps[strength] === 'object' ? schemeRamps[strength] : {}
    const foregrounds = palette.FOREGROUNDS && typeof palette.FOREGROUNDS === 'object' ? palette.FOREGROUNDS : {}
    const fg = foregrounds[scheme] && typeof foregrounds[scheme] === 'object' ? foregrounds[scheme] : {}
    return [ramp.bg0, ramp.bg1, ramp.bg2, fg.fg, fg.headerAqua]
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

    /** One appearance-preference option: native button with `aria-pressed`. */
    function renderAppearanceOption(preference) {
      const selected = theme.preference === preference
      return h('button', {
        key: preference,
        type: 'button',
        className: selected
          ? 'everforest-appearance-option everforest-appearance-option-selected'
          : 'everforest-appearance-option',
        'aria-pressed': selected ? 'true' : 'false',
        'data-preference': preference,
        onClick: () => {
          if (typeof store.setPreference === 'function') store.setPreference(preference)
        },
      }, t('appearance.' + preference))
    }

    /**
     * Appearance control: follow the OS (`system`, DSH resolves the active
     * scheme) or fix light/dark. The note explains which one is in effect; the
     * actual scheme follows the OS while `system` is selected.
     */
    function renderAppearance() {
      const headingId = 'everforest-appearance-title'
      const schemeLabel = theme.preference === 'system'
        ? t('group.' + theme.colorScheme)
        : t('group.' + theme.preference)
      const note = theme.preference === 'system'
        ? t('appearance.systemActive', { scheme: schemeLabel })
        : t('appearance.fixed', { scheme: schemeLabel })
      return h('section', {
        key: 'appearance',
        className: 'everforest-group everforest-appearance',
        'aria-labelledby': headingId,
      }, [
        h('h3', { key: 'heading', id: headingId, className: 'everforest-group-title' }, t('appearance.title')),
        h('div', {
          key: 'options',
          className: 'everforest-appearance-options',
          role: 'group',
          'aria-label': t('appearance.label'),
        }, APPEARANCE_OPTIONS.map((preference) => renderAppearanceOption(preference))),
        h('p', { key: 'note', className: 'everforest-appearance-note' }, note),
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

    /** Why picking a card may change DSH Appearance, and where the choice lives. */
    function renderHints() {
      return h('ul', { key: 'hints', className: 'everforest-hints' }, [
        h('li', { key: 'scheme', className: 'everforest-hint' }, t('hint.scheme')),
        h('li', { key: 'storage', className: 'everforest-hint' }, t('hint.storage')),
      ])
    }

    return h('div', { className: 'everforest-page' }, [
      h('header', { key: 'header', className: 'everforest-header' }, [
        h('h2', { key: 'title', className: 'everforest-title' }, t('nav.title')),
        h('p', { key: 'intro', className: 'everforest-intro' }, t('intro')),
      ]),
      renderAppearance(),
      GROUP_SCHEMES.map((scheme) => renderGroup(scheme)),
      renderCurrent(),
      renderHints(),
    ])
  }

  return Component
}
