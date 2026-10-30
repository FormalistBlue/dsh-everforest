// Everforest's own glyph in the Settings navigation.
//
// `settings.section` projects only `id` / `order` / `label`, and the settings
// shell (`@deepseek-ai/dsh-client-ui-settings-general`) picks the nav glyph from
// a closed table of section ids, handing every other section — every plugin
// section, this one included — its own gear (`navIcon()` in `SettingsRoot`).
// There is no icon field to pass, so the row is claimed after it renders: once
// the dialog mounts, the button whose visible label is this plugin's own
// localized section label is marked, and CSS hides the shell's gear and draws
// the real glyph in the same 16px slot. `dshmarket` and `dsh-notify-me` solve
// it the same way.
//
// Why a mask instead of replacing the `<svg>`: the glyph then inherits
// `currentColor` from the row, so the normal / hover / active states and a
// light↔dark theme switch need no extra code. The mark is a standalone SVG
// painted opaque black — a mask reads its alpha only, so the colour always
// comes from `background-color: currentColor`.
//
// Scope, deliberately narrow:
//
// - only the row whose visible text equals this plugin's own localized section
//   label is marked; no shell structure is touched and an empty label matches
//   nothing (a not-yet-resolved locale must not mark the whole nav);
// - the marker attributes and the one stylesheet belong to the caller's
//   `ctx.effect`, so unload removes them with the fiber;
// - the label is re-read on every sync, so a locale switch re-claims the row and
//   the glyph never disagrees with the row it belongs to;
// - if a future DSH grows an `icon` field on `settings.section`, delete this
//   module and its call in `src/client-entry.js`.
//
// The glyph is the pine from the package icon (`icon.svg`), reduced to a
// single-colour mark so it stays legible at 16px.

/** Marks the one nav row this plugin owns. */
export const NAV_ICON_MARKER = 'data-everforest-nav-icon'

/**
 * The nav rows of the settings dialog. The shell renders each
 * `settings.section` entry as a `<button>` inside the panel's `<nav>`; the panel
 * is the `[role="dialog"]` element in `SettingsPanel`.
 */
export const NAV_ROW_SELECTOR = '[role="dialog"] nav button'

/**
 * The pine mark as a standalone SVG for a CSS `mask-image`.
 *
 * The same two-tier pine the package icon draws over its forest ridge, scaled
 * to the navigation's 16px slot. Painted pure black on purpose: a mask reads
 * alpha only, and the visible colour comes from `currentColor`.
 */
export const NAV_GLYPH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#000">'
  + '<path d="M8 1.2 3.4 7.6h2.1L2.2 12.4h4.4v2.4h2.8v-2.4h4.4L10.5 7.6h2.1z"/></svg>'

/**
 * The mask URL for the mark (encoded at runtime, never hand-escaped).
 * @param {string} [svg] - standalone SVG source; defaults to `NAV_GLYPH_SVG`
 * @returns {string} a `data:image/svg+xml,` URL usable in `mask-image`
 */
export function navGlyphMaskUrl (svg = NAV_GLYPH_SVG) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Stylesheet for the marked row: hide the shell's gear, draw the mark in its
 * slot with the row's own colour.
 * @param {string} [maskUrl] - mask URL; defaults to `navGlyphMaskUrl()`
 * @returns {string}
 */
export function navGlyphStyles (maskUrl = navGlyphMaskUrl()) {
  return [
    `[${NAV_ICON_MARKER}] > svg { display: none; }`,
    `[${NAV_ICON_MARKER}]::before {`,
    '  content: \'\';',
    '  flex: none;',
    '  width: 16px;',
    '  height: 16px;',
    '  background-color: currentColor;',
    `  -webkit-mask-image: url("${maskUrl}");`,
    `  mask-image: url("${maskUrl}");`,
    '  -webkit-mask-repeat: no-repeat;',
    '  mask-repeat: no-repeat;',
    '  -webkit-mask-position: center;',
    '  mask-position: center;',
    '  -webkit-mask-size: 16px 16px;',
    '  mask-size: 16px 16px;',
    '}'
  ].join('\n')
}

/**
 * Whether a rendered nav row is this plugin's own.
 *
 * Pure, and the only decision this feature makes: the row whose visible text is
 * the section label the shell is currently projecting. An empty label matches
 * nothing — a locale that has not resolved yet must not mark the whole nav.
 * @param {string | null | undefined} rowText - `textContent` of a nav button
 * @param {string | null | undefined} wantedLabel - current section label
 * @returns {boolean}
 */
export function isOwnNavRow (rowText, wantedLabel) {
  const wanted = String(wantedLabel ?? '').trim()
  if (wanted.length === 0) return false
  return String(rowText ?? '').trim() === wanted
}

/**
 * Install the settings-nav glyph on a document.
 *
 * The returned disposer disconnects the observer, removes every marker
 * attribute and the stylesheet, leaving the shell's gear exactly as it renders
 * without this plugin. A missing DOM (`document`, `document.body`, or
 * `MutationObserver` — e.g. a non-browser host or a bare test harness) makes
 * this a no-op rather than a failure: the theme must keep working.
 *
 * @param {{ document?: Document, resolveLabel?: () => string }} [options]
 *   `resolveLabel` is this plugin's current section label; it is re-read on
 *   every sync so a locale switch re-claims the row.
 * @returns {() => void}
 */
export function installSettingsNavIcon (options = {}) {
  const doc = options.document ?? (typeof document === 'undefined' ? undefined : document)
  const resolveLabel = options.resolveLabel
  if (!doc || typeof resolveLabel !== 'function') return () => {}
  if (typeof doc.createElement !== 'function' || !doc.head || !doc.body) return () => {}
  if (typeof doc.querySelectorAll !== 'function') return () => {}
  if (typeof MutationObserver !== 'function') return () => {}
  if (typeof queueMicrotask !== 'function') return () => {}

  const tag = doc.createElement('style')
  tag.dataset.plugin = 'dsh-everforest'
  tag.dataset.pluginCss = 'everforest/settings-nav-icon'
  tag.textContent = navGlyphStyles()
  doc.head.appendChild(tag)

  let disposed = false
  let scheduled = false

  /** Mark exactly the row carrying this plugin's current label. */
  function sync () {
    scheduled = false
    if (disposed) return
    const wanted = String(resolveLabel() ?? '').trim()
    for (const row of doc.querySelectorAll(NAV_ROW_SELECTOR)) {
      if (isOwnNavRow(row.textContent, wanted)) row.setAttribute(NAV_ICON_MARKER, '')
      else row.removeAttribute(NAV_ICON_MARKER)
    }
  }

  /** Coalesce a burst of mutations (a whole dialog mounts in one task). */
  function schedule () {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(sync)
  }

  sync()
  const observer = new MutationObserver(schedule)
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true })

  return function dispose () {
    disposed = true
    observer.disconnect()
    for (const row of doc.querySelectorAll(`[${NAV_ICON_MARKER}]`)) {
      row.removeAttribute(NAV_ICON_MARKER)
    }
    tag.remove()
  }
}
