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
 *    (`useSyncExternalStore`) and that persists the chosen strengths through
 *    DSH's Host settings form (`ctx.configForms`, see `src/durable.js`). The
 *    choice lives in the active profile's `cordis.patch.yml` and is shared by
 *    every browser of that profile; the browser's `localStorage` copy is only a
 *    first-paint cache and the fallback for a host that serves no settings form
 *    (pre-0.3.0). A 0.2.x cache still holding a real choice is seeded into the
 *    Host once, on the first load after the upgrade;
 *  - the **color mode**, a shipped default feature since 2026-10-24 (no
 *    switch): `data-everforest-*` attributes on `<html>` plus one
 *    `<style data-plugin-css="dsh-everforest/color-mode">` element carrying the
 *    selector-scoped CSS from `src/color-mode.js`. Both are installed
 *    independently of the Settings UI, so the mode keeps working when
 *    `slots` / `locale` never arrive; the token layer is untouched, the mode is
 *    content-layer CSS on top.
 *  - a small always-on `::selection` stylesheet (`src/selection.js`) that paints
 *    browser text selection with the current variant's `bg_visual` colour while
 *    keeping each element's own text colour; DSH declares the document-selection
 *    token but never reads it (2026-10-24).
 *
 * The override disposer returned by `overrideTokens` is NOT tied to the plugin
 * fiber (the layer lives on the root ThemeRuntime), so the layer is created
 * inside `ctx.effect` and released explicitly on plugin unload. The same holds
 * for the injected `<style>` elements and the locale dictionaries.
 *
 * `theme` is the only hard dependency (the token layer must apply even if the
 * settings UI is unavailable). `slots` / `locale` / `configForms` are waited
 * for through `ctx.inject`, so a profile that provides them later still gets the
 * Settings page / durable persistence instead of silently losing it. The
 * `configForms` injection is deliberately soft: an older host that does not
 * provide the service must not hold the whole Client plugin pending.
 */

import { DEFAULT_STATE, FOREGROUNDS, RAMPS, STRENGTHS } from './palette.js'
import { COLOR_MODE_ATTRS, colorModeDataset, colorModeStyles } from './color-mode.js'
import { selectionStyles } from './selection.js'
import { activeSessionStyles } from './active-session.js'
import { SELF_CHECK_TOKENS, tokensFor } from './tokens.js'
import { readState, readStoredState, STORAGE_KEY, writeState } from './state.js'
import {
  bootHintState,
  ENTRY_ID,
  hasUserLayer,
  shouldSeed,
  stateFromHost,
  statesEqual,
  stateToSetOps,
  stateToUnsetOps,
} from './durable.js'
import { EN, NS, ZH } from './locale.js'
import { SETTINGS_STYLES, createSettingsComponent } from './settings-page.js'
import {
  createThemeSpotlight,
  resolveSchemePreference,
  themeSpotlightStyles,
} from './theme-spotlight.js'
// @dev-only:start
import { createDevPanel } from './dev-panel.js'
// @dev-only:end

const PACKAGE_ID = 'dsh-everforest'
const LOG_PREFIX = '[everforest]'

/** The override layer's identity inside ThemeRuntime. */
export const name = PACKAGE_ID

/** `theme` is the only hard dependency; the Settings UI waits for slots/locale. */
export const inject = ['theme']

/**
 * The state this document should start from, resolved the same way the Host
 * boot row paints the first frame: the `localStorage` cache supplies the
 * strengths, the Host-backed pair the row published on
 * `window.__EVERFOREST_BOOT__` overrides them when present, and everything else
 * falls back to the shipped default. Using the hint (instead of `readState()`
 * alone) is what keeps a fresh browser profile from flashing the default before
 * the asynchronous `configForms` snapshot arrives.
 *
 * @returns {{ light: string, dark: string }}
 */
function initialState() {
  const cached = readState()
  try {
    if (typeof window !== 'undefined') {
      const hint = bootHintState(window.__EVERFOREST_BOOT__)
      if (hint !== null) return { light: hint.light, dark: hint.dark }
    }
  } catch {
    // A host without the boot row: the cache already holds everything.
  }
  return cached
}

/**
 * Mount the plugin.
 * @param {import('cordis').Context} ctx
 */
export function apply(ctx) {
  const React = require('react')
  const h = React.createElement

  let state = initialState()
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
   * Mirror the palette pair (and the color-mode scope anchor) onto `<html>` as
   * data attributes.
   *
   * `colorModeDataset()` returns every attribute in one object, so changing a
   * strength is one write; the injected stylesheet is scoped under
   * `html[data-everforest-color-mode="on"]`, which this version always sets — the
   * mode is a shipped default, not a toggle. A missing attribute in the dataset
   * is removed rather than left stale. DOM-less contexts (unit tests, SSR) are
   * tolerated.
   */
  function applyStateAttributes() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (!root || typeof root.setAttribute !== 'function') return
    const dataset = colorModeDataset(state)
    for (const attribute of Object.values(COLOR_MODE_ATTRS)) {
      const value = dataset[attribute]
      if (typeof value === 'string') root.setAttribute(attribute, value)
      else if (typeof root.removeAttribute === 'function') root.removeAttribute(attribute)
    }
  }

  /** The strength pair currently stacked onto ThemeRuntime (`null` before mount). */
  let layerPair = null

  /**
   * Replace this plugin's override layer and the `<html>` attributes.
   *
   * `overrideTokens` treats a repeated call for the same source as a full
   * replacement and re-stacks it on top, so the previous disposer becomes a
   * no-op and the new one is kept for unload. The token sheet only depends on
   * the strength pair, so a call that leaves the pair untouched still refreshes
   * the `<html>` attributes but does not re-stack the layer: the color mode is
   * selector-scoped CSS on top, never a token change.
   */
  function applyLayer() {
    if (layerPair === null || layerPair.light !== state.light || layerPair.dark !== state.dark) {
      layerPair = { light: state.light, dark: state.dark }
      layerDispose = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(layerPair))
    }
    applyStateAttributes()
  }

  /* ------------------------------------------------------------------ *
   * 0. Spotlight reveal for light <-> dark
   *
   * The grey mid-fade of a colour interpolation is not acceptable for a scheme
   * switch, so a scheme change uses the View Transitions circular-reveal pattern
   * instead (the one rspress uses for its appearance toggle): the old palette is
   * snapshotted, the new palette is painted inside the transition callback, and
   * `clip-path: circle()` grows out of the pointer position. Text is always
   * either on the old or on the new palette — never halfway between them.
   *
   * Every switch that should animate must be wrapped at the call site, because
   * the old snapshot only exists inside the `startViewTransition` callback:
   *   - this plugin's own controls (`select` / `setPreference`) wrap the call;
   *   - DSH's own Appearance row calls `theme.setTheme(id)` on the ThemeRuntime
   *     instance, so wrapping that instance method is the interception point.
   * Changes DSH applies without such a call (OS scheme flip while following the
   * system, Host broadcasts from another browser) cannot be wrapped after the
   * fact; they stay instant. Instant is the fallback everywhere View Transitions
   * or the clip-path animation is unavailable.
   * ------------------------------------------------------------------ */

  const spotlight = createThemeSpotlight({
    document: typeof document === 'undefined' ? undefined : document,
  })

  ctx.effect(() => () => spotlight.dispose(), 'everforest: theme spotlight unload')

  // 0a. Pseudo-element stylesheet that disables the UA cross-fade.
  ctx.effect(() => {
    if (typeof document === 'undefined' || !document.head) return undefined
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE_ID
    tag.dataset.pluginCss = PACKAGE_ID + '/theme-spotlight'
    tag.textContent = themeSpotlightStyles()
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'everforest: theme spotlight styles')

  // 0b. Remember the click position: the reveal grows out of it.
  const stopTrackingOrigin = spotlight.trackOrigin()
  ctx.effect(() => () => {
    if (typeof stopTrackingOrigin === 'function') stopTrackingOrigin()
  }, 'everforest: theme spotlight origin')

  // 0c. Wrap `theme.setTheme` on the service instance so DSH's own
  // Appearance row gets the reveal too (its injected callback closes over the
  // same ThemeRuntime instance). A direct wrapper is safe to remove again: the
  // own property is deleted, falling back to the class method.
  ctx.effect(() => {
    const themeService = ctx.theme
    const original = themeService && themeService.setTheme
    if (typeof original !== 'function') return undefined
    const hadOwnMethod = Object.prototype.hasOwnProperty.call(themeService, 'setTheme')
    function setThemeWithSpotlight(id) {
      const receiver = this === undefined || this === null ? themeService : this
      // Only known preferences can be resolved; anything else keeps the
      // service's own validation and synchronous throw.
      if (spotlight.running || (id !== 'light' && id !== 'dark' && id !== 'system')) {
        return original.call(receiver, id)
      }
      let current = null
      try {
        current = ctx.theme.getTheme().active.colorScheme
      } catch {
        current = null
      }
      const target = resolveSchemePreference(id)
      if (target === null || target === current || !spotlight.supported) {
        return original.call(receiver, id)
      }
      return spotlight.run(() => original.call(receiver, id))
    }
    try {
      themeService.setTheme = setThemeWithSpotlight
    } catch (error) {
      console.warn(`${LOG_PREFIX} could not wrap the theme service; DSH's own Appearance row stays instant`, error)
      return undefined
    }
    return () => {
      if (themeService.setTheme !== setThemeWithSpotlight) return
      if (hadOwnMethod) themeService.setTheme = original
      else delete themeService.setTheme
    }
  }, 'everforest: theme spotlight service wrap')

  // 1. Token layer, created with the client module and owned by our effect.
  ctx.effect(() => {
    applyLayer()
    return () => {
      layerDispose?.()
      layerDispose = null
      layerPair = null
    }
  }, 'everforest: token layer')

  // 1b. Color-mode stylesheet. Installed independently of the Settings UI so
  // the mode keeps working when `slots` / `locale` are absent or arrive later.
  // The CSS is static and every rule is scoped under
  // `html[data-everforest-color-mode="on"]`, the attribute `applyLayer()`
  // always writes: color mode is a shipped default, not a toggle, and it never
  // touches the token layer.
  ctx.effect(() => {
    if (typeof document === 'undefined' || !document.head) return undefined
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE_ID
    tag.dataset.pluginCss = PACKAGE_ID + '/color-mode'
    tag.textContent = colorModeStyles()
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'everforest: color mode styles')

  // 1c. Text-selection stylesheet. DSH declares
  // `--dsw-alias-bg-document-selection` but never reads it with a `::selection`
  // rule (verified against the installed 0.2.1-rc.3 bundles), so without this
  // the browser's native blue wins (2026-10-24 user report). Always-on and
  // independent of the color mode: the six rules only need the strength
  // attributes the layer above writes on <html> plus DSH's own
  // `body[data-ds-dark-theme]` flag.
  ctx.effect(() => {
    if (typeof document === 'undefined' || !document.head) return undefined
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE_ID
    tag.dataset.pluginCss = PACKAGE_ID + '/selection'
    tag.textContent = selectionStyles()
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'everforest: selection styles')

  // 1d. Active-session stylesheet. DSH paints the selected workspace row with
  // the same `interactive-bg-hover` token as hover, which in Everforest's ramps
  // is only a ~2.6 L* step from the sidebar — the open session is hard to find
  // (2026-10-24 user report). No dedicated token exists, so one rule on the
  // row's stable `aria-selected` anchor paints a palette-blue surface. Also
  // always-on and color-mode independent: this is navigation, not content.
  ctx.effect(() => {
    if (typeof document === 'undefined' || !document.head) return undefined
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE_ID
    tag.dataset.pluginCss = PACKAGE_ID + '/active-session'
    tag.textContent = activeSessionStyles()
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'everforest: active session styles')

  // Keep the Settings page's "current" row in sync with DSH's Appearance and
  // font changes. `theme/change` also fires for font changes, so listeners must
  // stay idempotent: `notify` only invalidates the snapshot and re-renders.
  ctx.effect(() => {
    const off = ctx.on('theme/change', notify)
    return () => off?.()
  }, 'everforest: theme snapshot refresh')

  // Keep every same-origin window on the same strengths. `localStorage` is
  // shared per origin, but each window holds its own copy in memory and the
  // browser only announces writes through `storage` events — which are never
  // delivered to the writing document. Without this listener a second window
  // keeps a stale copy, and the next card click there writes the stale value
  // back over the other window's choice (a silent lost update). The event also
  // fires with `key === null` when another window calls `clear()`.
  //
  // Since 0.3.0 the Host document is the authority across browsers, and this
  // listener stays for the two cases the broadcast cannot cover: same-origin
  // windows before the settings snapshot arrives, and a host with no settings
  // form at all (localStorage remains the whole store there).
  ctx.effect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const next = readState()
      if (next.light === state.light && next.dark === state.dark) return
      state = next
      applyLayer()
      notify()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      if (typeof window.removeEventListener === 'function') window.removeEventListener('storage', onStorage)
    }
  }, 'everforest: cross-window sync')

  // 2. Durable persistence through DSH's Host settings form.
  //
  // The form is addressed by the profile entry id (`ENTRY_ID`, a contract with
  // cordis.patch.yml) and is owned by the shared `dsh-client-ui-settings`
  // service. `ctx.inject` is intentionally soft: on a host without the service
  // the callback never fires and the plugin keeps working from localStorage;
  // declaring it in the module-level `inject` array would instead hold the
  // whole Client plugin pending forever.
  let form = null
  let seedCompleted = false
  let refusedWarned = false
  /**
   * A user choice made before the settings form was ready (`'set'` / `'unset'`).
   * The form's initial snapshot is asynchronous; without this queue a click in
   * that window would be silently dropped (or overwritten by the first adopt),
   * which is the one moment a user can reach the page faster than the Host.
   */
  let queuedWrite = null
  /**
   * Host mutations this Client has sent but whose answer has not settled.
   *
   * The form mirror only folds a write's answer when the promise resolves, so
   * while a write is in flight the snapshot still shows the *previous* document
   * (`user: {}` for a first choice). "Restore defaults" must not trust that
   * snapshot alone: it has to queue the `unset` behind the in-flight `set`,
   * otherwise the set lands afterwards and the reset is silently lost until the
   * user clicks again. The form controller serializes writes on its own, so
   * ordering is guaranteed once both are queued.
   */
  let writesInFlight = 0

  /** Mark one Host mutation as started; returns an idempotent settle callback. */
  function beginWrite() {
    writesInFlight += 1
    let settled = false
    return () => {
      if (settled) return
      settled = true
      writesInFlight = Math.max(0, writesInFlight - 1)
    }
  }

  /** The form's current snapshot, or null while unbound/throwing. */
  function hostSnapshot() {
    if (form === null) return null
    try {
      const snapshot = form.getSnapshot()
      return snapshot !== null && typeof snapshot === 'object' ? snapshot : null
    } catch {
      return null
    }
  }

  function warnRefusedOnce() {
    if (refusedWarned) return
    refusedWarned = true
    console.warn(`${LOG_PREFIX} the Host refused the strength write (another browser or a lock changed it); using the Host value`)
  }

  /**
   * Make a Host-reported state the current one and refresh the first-paint
   * cache. Writes the cache even when the state did not change: a fresh browser
   * profile that booted from the Host value needs a cache entry so its next
   * reload can paint before the Host payload is consulted.
   */
  function adoptHostState(hostState) {
    if (statesEqual(hostState, state)) {
      writeState(state)
      return
    }
    state = { light: hostState.light, dark: hostState.dark }
    writeState(state)
    applyLayer()
    notify()
  }

  /**
   * Send one atomic mutation to the Host document and settle its answer.
   *
   * A refusal (revision conflict from another browser, locked/higher-priority
   * patch layer) makes the controller re-read the document before it resolves
   * `false`; adopting that fresh snapshot is the correct recovery — the value
   * the Host never accepted must not stick locally.
   *
   * @param {Array<object>} ops - `set` / `unset` form operations.
   * @param {string} failureMessage - warning suffix when the wire call throws.
   */
  function writeToHost(ops, failureMessage) {
    const settle = beginWrite()
    try {
      Promise.resolve(form.mutate(ops))
        .then((accepted) => {
          settle()
          if (accepted) return
          warnRefusedOnce()
          syncFromHost()
        })
        .catch((error) => {
          settle()
          console.warn(`${LOG_PREFIX} ${failureMessage}`, error)
        })
    } catch (error) {
      settle()
      console.warn(`${LOG_PREFIX} ${failureMessage}`, error)
    }
  }

  /** Seed a pre-0.3.0 cache choice into the Host document (one-shot migration). */
  function seedHost(snapshot) {
    const settle = beginWrite()
    try {
      Promise.resolve(form.mutate(stateToSetOps(state), snapshot.revision))
        .then((accepted) => {
          settle()
          if (!accepted) syncFromHost()
        })
        .catch((error) => {
          settle()
          console.warn(`${LOG_PREFIX} could not migrate the saved palette choice to the Host; localStorage keeps it`, error)
        })
    } catch (error) {
      settle()
      console.warn(`${LOG_PREFIX} could not migrate the saved palette choice to the Host; localStorage keeps it`, error)
    }
  }

  /** Persist the current state after a user choice, queueing it while not ready. */
  function persistChoice() {
    const snapshot = hostSnapshot()
    if (form === null || snapshot === null || snapshot.status !== 'ready') {
      queuedWrite = 'set'
      return
    }
    if (snapshot.writable === false) return
    writeToHost(stateToSetOps(state), 'the palette choice was not saved to the Host; it applies to this session')
  }

  /** Clear the Host override after "restore defaults" so the row disappears. */
  function persistReset() {
    const snapshot = hostSnapshot()
    if (form === null || snapshot === null || snapshot.status !== 'ready') {
      queuedWrite = 'unset'
      return
    }
    if (snapshot.writable === false) return
    // A still-in-flight `set` has not been folded into the mirror yet, so it
    // looks like "no user layer". Queueing the unset behind it is required:
    // the controller serializes writes, so the pair ends at the inherited
    // defaults instead of losing the reset to the later-committed set.
    if (!hasUserLayer(snapshot.user) && writesInFlight === 0) return
    writeToHost(stateToUnsetOps(), 'the saved palette choice was not cleared on the Host; the local reset still applies')
  }

  /** Apply a choice queued while the form was still loading. */
  function flushQueuedWrite(snapshot) {
    const kind = queuedWrite
    queuedWrite = null
    seedCompleted = true
    if (snapshot.writable === false) return
    if (kind === 'unset') {
      if (hasUserLayer(snapshot.user) || writesInFlight > 0) {
        writeToHost(stateToUnsetOps(), 'the saved palette choice was not cleared on the Host; the local reset still applies')
      }
      return
    }
    writeToHost(stateToSetOps(state), 'the palette choice was not saved to the Host; it applies to this session')
  }

  /**
   * Resolve the Host document into local state.
   *
   * Called on every form snapshot change (so a write in another browser is
   * adopted immediately) and once when the form binds. Precedence:
   *
   *  0. a local user choice was made before the snapshot existed → push it;
   *  1. a Host-stored choice is the authority → adopt it (both strengths);
   *  2. no Host choice yet but a real older cache choice exists (non-default
   *     strengths) → seed the Host once and keep the cached state;
   *  3. no Host choice and nothing worth seeding → adopt the Host's effective
   *     value (the shipped defaults).
   */
  function syncFromHost() {
    const snapshot = hostSnapshot()
    if (snapshot === null || snapshot.status !== 'ready') return
    if (queuedWrite !== null) {
      flushQueuedWrite(snapshot)
      return
    }
    if (hasUserLayer(snapshot.user)) {
      seedCompleted = true
      adoptHostState(stateFromHost(snapshot.value))
      return
    }
    if (!seedCompleted && shouldSeed(snapshot.user, readStoredState())) {
      seedCompleted = true
      seedHost(snapshot)
      return
    }
    seedCompleted = true
    adoptHostState(stateFromHost(snapshot.value))
  }

  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['configForms'], (formsCtx) => {
        let unsubscribe = null
        try {
          const bound = formsCtx.configForms.get(ENTRY_ID)
          form = bound
          if (typeof bound.subscribe === 'function') unsubscribe = bound.subscribe(syncFromHost)
          syncFromHost()
        } catch (error) {
          form = null
          console.warn(`${LOG_PREFIX} the Host settings form is unavailable; the palette choice stays localStorage-only`, error)
          return undefined
        }
        return () => {
          if (typeof unsubscribe === 'function') unsubscribe()
          form = null
        }
      })
    } catch (error) {
      console.warn(`${LOG_PREFIX} could not wait for the Host settings form; the palette choice stays localStorage-only`, error)
    }
  }

  // 3. Settings page stores the user's palette state: the per-scheme strength
  // choice. Writes update the local state and the first-paint cache
  // synchronously (so the choice survives a restart even when the Host write is
  // slow or refused), then go to the Host document as the durable,
  // cross-browser store — both fields in one mutation.
  function select(scheme, strength) {
    if (scheme !== 'light' && scheme !== 'dark') return
    if (!STRENGTHS.includes(strength)) return
    const next = { light: state.light, dark: state.dark, [scheme]: strength }
    const changed = next.light !== state.light || next.dark !== state.dark
    const schemeChanging = ctx.theme.getTheme().active.colorScheme !== scheme
    state = next
    writeState(state)
    if (schemeChanging) {
      // A card from the other scheme group is one spotlight: the token re-stack
      // for the clicked scheme is invisible until the scheme flips, so both the
      // re-stack and the Appearance write fit in one transition callback. When
      // View Transitions cannot run, `run` switches synchronously instead; no
      // other path colour-fades. The new scheme always grows out of the click
      // point; the old snapshot stays underneath (clipping the old frame
      // instead flashes the light page at teardown, see theme-spotlight.js).
      spotlight.run(() => {
        if (changed) applyLayer()
        ctx.theme.setTheme(scheme)
      })
    } else if (changed) {
      // Same-scheme strength change (soft / medium / hard): swap the tokens
      // instantly — the colour fade was removed on request (2026-10-24).
      applyLayer()
    }
    notify()
    persistChoice()
    // The Appearance preference is written inside the spotlight callback above
    // for a cross-scheme card; this is the durable Host-backed preference write
    // (shared by every authenticated browser, and `system` becomes a fixed
    // light/dark choice) — the Settings page copy says so.
  }

  function reset() {
    const next = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }
    const changed = next.light !== state.light || next.dark !== state.dark
    state = next
    writeState(state)
    if (changed) applyLayer()
    notify()
    persistReset()
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
    // `theme.setTheme` is wrapped for the spotlight, so a resolved scheme change
    // gets its reveal here (and DSH's own Appearance row gets the same one).
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

  // 4. Settings page, locale dictionaries and the page stylesheet. These need
  // the optional `slots` / `locale` services. They are normally already present
  // when the module materializes (`ctx.get` is the sanctioned optional access,
  // and the returned proxy stays bound to this plugin's context so registrations
  // are disposed on unload). If a profile activates the UI services later, the
  // `ctx.inject` fallback waits for them instead of losing the page silently.
  //
  // The page is prepared once (dictionaries / stylesheet / component) and then
  // registered. `settingsUiMounted` is set only after registration returns: a
  // synchronous failure must leave it false, otherwise the `ctx.inject`
  // fallback below is skipped and this session never gets the page.
  let settingsUiMounted = false
  let settingsUiPrepared = false
  let settingsUiSection = null
  const setupSettingsUi = () => {
    if (settingsUiMounted) return
    const locale = ctx.get('locale')
    const slots = ctx.get('slots')
    if (!locale || !slots) return

    if (!settingsUiPrepared) {
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
      settingsUiSection = { options, Section }
      settingsUiPrepared = true
    }

    // Registration is the last fallible step: only a success here counts as
    // mounted, so a throw keeps the retry path open.
    slots.inject('settings.section', () => slots.register(settingsUiSection.options, settingsUiSection.Section))
    settingsUiMounted = true
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
// @dev-only:start

  // 6. Development-only debug panel. The whole block — and the
  // `src/dev-panel.js` module it imports — exists only in the `--dev` bundle
  // (`npm run build:dev`); the production build strips both from `client.js`,
  // so a published artifact carries neither the panel code nor its DOM. The
  // panel mounts into the frame-wide `shell.overlay` slot (a click-through
  // floating layer owned by the shell) and reuses the same `store` as the
  // Settings page, so it stays in sync with it, the Host document and every
  // other browser of the profile.
  const setupDevPanel = () => {
    const devSlots = ctx.get('slots')
    if (!devSlots) return
    const DevPanel = createDevPanel({ React, h, store })
    const register = () => devSlots.register(
      { name: 'shell.overlay', id: 'everforest-dev', order: 100 },
      DevPanel,
    )
    ctx.effect(() => {
      const dispose = devSlots.inject('shell.overlay', register)
      return () => dispose?.()
    }, 'everforest: dev panel')
  }
  try {
    if (ctx.get('slots')) setupDevPanel()
    else if (typeof ctx.inject === 'function') ctx.inject(['slots'], () => setupDevPanel())
  } catch (error) {
    console.warn(`${LOG_PREFIX} dev panel setup failed; the theme still applies`, error)
  }
// @dev-only:end

  // 5. Cheap upgrade guard: if DSH renamed its token sheets, warn once instead
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
