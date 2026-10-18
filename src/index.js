/**
 * Browser half of the dsh-everforest bundle.
 *
 * Everything the plugin does lives here:
 *
 *  - a token override layer (`ctx.theme.overrideTokens('dsh-everforest', …)`)
 *    that stacks the six Everforest palettes over the built-in `--dsw-*` and
 *    `--shiki-*` token sheets; each entry carries both a light and a dark value
 *    so DSH's own Appearance switch (light / dark / system) keeps working;
 *  - the Settings page (`settings.section`) with the palette pickers and the
 *    Appearance control (`follow system` / `dark` / `light`, which writes the
 *    same global preference as DSH's own Appearance switch);
 *  - a small observable store that the page subscribes to
 *    (`useSyncExternalStore`) and that persists the chosen strengths in
 *    `localStorage` (key `dsh-everforest/v1`).
 *
 * The override disposer returned by `overrideTokens` is NOT tied to the plugin
 * fiber (the layer lives on the root ThemeRuntime), so the layer is created
 * inside `ctx.effect` and released explicitly on plugin unload. The same holds
 * for the injected `<style>` element and the locale dictionaries.
 *
 * `theme` is the only hard dependency (the token layer must apply even if the
 * settings UI is unavailable). `slots` and `locale` are waited for through
 * `ctx.inject`, so a profile that provides them later still gets the Settings
 * page instead of silently losing it.
 */

import { DEFAULT_STATE, FOREGROUNDS, RAMPS, STRENGTHS } from './palette.js'
import { SELF_CHECK_TOKENS, tokensFor } from './tokens.js'
import { readState, writeState } from './state.js'
import { EN, NS, ZH } from './locale.js'
import { SETTINGS_STYLES, createSettingsComponent } from './settings-page.js'

const PACKAGE_ID = 'dsh-everforest'
const LOG_PREFIX = '[everforest]'

/** The override layer's identity inside ThemeRuntime. */
export const name = PACKAGE_ID

/** `theme` is the only hard dependency; the Settings UI waits for slots/locale. */
export const inject = ['theme']

/**
 * Mount the plugin.
 * @param {import('cordis').Context} ctx
 */
export function apply(ctx) {
  const React = require('react')
  const h = React.createElement

  let state = readState()
  let layerDispose = null
  let cachedSnapshot = null
  const listeners = new Set()

  function notify() {
    cachedSnapshot = null
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.warn(`${LOG_PREFIX} settings store listener failed`, error)
      }
    }
  }

  function getSnapshot() {
    if (cachedSnapshot === null) {
      cachedSnapshot = {
        state: { light: state.light, dark: state.dark },
        theme: ctx.theme.getTheme(),
      }
    }
    return cachedSnapshot
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /**
   * Replace this plugin's override layer. `overrideTokens` treats a repeated
   * call for the same source as a full replacement and re-stacks it on top, so
   * the previous disposer becomes a no-op and the new one is kept for unload.
   */
  function applyLayer() {
    layerDispose = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state))
  }

  // 1. Token layer, created with the client module and owned by our effect.
  ctx.effect(() => {
    applyLayer()
    return () => {
      layerDispose?.()
      layerDispose = null
    }
  }, 'everforest: token layer')

  // Keep the Settings page's "current" row in sync with DSH's Appearance and
  // font changes. `theme/change` also fires for font changes, so listeners must
  // stay idempotent: `notify` only invalidates the snapshot and re-renders.
  ctx.effect(() => {
    const off = ctx.on('theme/change', notify)
    return () => off?.()
  }, 'everforest: theme snapshot refresh')

  // 2. Settings page stores the user's per-scheme strength choice. Writes are
  // synchronous localStorage writes so the choice survives a restart; when
  // storage is unavailable the choice still applies for this session.
  function select(scheme, strength) {
    if (scheme !== 'light' && scheme !== 'dark') return
    if (!STRENGTHS.includes(strength)) return
    const next = { light: state.light, dark: state.dark, [scheme]: strength }
    const changed = next.light !== state.light || next.dark !== state.dark
    state = next
    writeState(state)
    if (changed) applyLayer()
    notify()
    // Picking a card from the other scheme group also switches DSH's
    // Appearance preference so the user sees the result immediately. This is a
    // durable Host-backed preference write (shared by every authenticated
    // browser, and `system` becomes a fixed light/dark choice) — the Settings
    // page copy says so.
    if (ctx.theme.getTheme().active.colorScheme !== scheme) ctx.theme.setTheme(scheme)
  }

  function reset() {
    const next = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
    const changed = next.light !== state.light || next.dark !== state.dark
    state = next
    writeState(state)
    if (changed) applyLayer()
    notify()
  }

  /**
   * Write DSH's Appearance preference: `system` restores OS following, while
   * `light` / `dark` fix a side. This is the same global, Host-backed setting
   * DSH's own Appearance switch owns — the plugin does not store it separately.
   * `theme/change` refreshes the page, and calling `notify` as well keeps the
   * control responsive if a host does not emit on a no-op write.
   *
   * @param {string} preference - `system`, `light` or `dark`; anything else is ignored.
   */
  function setPreference(preference) {
    if (preference !== 'system' && preference !== 'light' && preference !== 'dark') return
    try {
      ctx.theme.setTheme(preference)
    } catch (error) {
      console.warn(`${LOG_PREFIX} could not write the Appearance preference`, error)
      return
    }
    notify()
  }

  const store = {
    getSnapshot,
    subscribe,
    select,
    reset,
    setPreference,
  }

  // 3. Settings page, locale dictionaries and the page stylesheet. These need
  // the optional `slots` / `locale` services. They are normally already present
  // when the module materializes (`ctx.get` is the sanctioned optional access,
  // and the returned proxy stays bound to this plugin's context so registrations
  // are disposed on unload). If a profile activates the UI services later, the
  // `ctx.inject` fallback waits for them instead of losing the page silently.
  let settingsUiMounted = false
  const setupSettingsUi = () => {
    if (settingsUiMounted) return
    const locale = ctx.get('locale')
    const slots = ctx.get('slots')
    if (!locale || !slots) return
    settingsUiMounted = true

    ctx.effect(() => locale.register(NS, { zh: ZH, en: EN }), 'everforest: dictionaries')
    const t = locale.bind(NS)

    // A plain `<style data-plugin>` element: the model-authored `styles.insert`
    // helper does not exist for installed bundles. Removing it in the cleanup
    // keeps unload clean.
    ctx.effect(() => {
      if (typeof document === 'undefined' || !document.head) return undefined
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE_ID
      tag.dataset.pluginCss = PACKAGE_ID
      tag.textContent = SETTINGS_STYLES
      document.head.appendChild(tag)
      return () => tag.remove()
    }, 'everforest: settings styles')

    const Section = createSettingsComponent({
      React,
      h,
      palette: { DEFAULT_STATE, FOREGROUNDS, RAMPS, STRENGTHS },
    })
    const options = {
      name: 'settings.section',
      id: 'everforest',
      order: 25,
      label: () => t('nav.title'),
      locale: NS,
      inject: () => ({ t, store }),
    }
    slots.inject('settings.section', () => slots.register(options, Section))
  }

  try {
    setupSettingsUi()
  } catch (error) {
    console.warn(`${LOG_PREFIX} settings UI setup failed; the theme still applies`, error)
  }
  if (!settingsUiMounted && typeof ctx.inject === 'function') {
    try {
      ctx.inject(['slots', 'locale'], () => {
        try {
          setupSettingsUi()
        } catch (error) {
          console.warn(`${LOG_PREFIX} settings UI setup failed after services arrived`, error)
        }
      })
    } catch (error) {
      console.warn(`${LOG_PREFIX} could not wait for slots/locale; the Settings page is skipped`, error)
    }
  } else if (!settingsUiMounted) {
    console.warn(`${LOG_PREFIX} slots/locale are unavailable; the Settings page is skipped (the theme still applies)`)
  }

  // 4. Cheap upgrade guard: if DSH renamed its token sheets, warn once instead
  // of failing. The override layer degrades to native colors for missing names.
  function runSelfCheck() {
    if (typeof document === 'undefined' || !document.body) return
    const computed = getComputedStyle(document.body)
    const missing = SELF_CHECK_TOKENS.filter((token) => computed.getPropertyValue(token).trim() === '')
    if (missing.length > 0) {
      console.warn(
        `${LOG_PREFIX} ${missing.length} DSH theme token(s) did not resolve; this DSH version may have `
        + `renamed them, so those surfaces keep native colors: ${missing.join(', ')}`,
      )
    }
  }

  ctx.effect(() => {
    const timer = setTimeout(runSelfCheck, 0)
    return () => clearTimeout(timer)
  }, 'everforest: token self-check')
}
