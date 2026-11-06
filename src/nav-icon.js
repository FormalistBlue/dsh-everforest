// Everforest's own glyph in the Settings navigation.
//
// DSH 0.2.2 added the official `settings.section.icon` slot. The settings shell
// renders one `<button>` per `settings.section` entry; for each row it renders
// this slot filtered by the section id (`{ only: row.id }`) and keeps its own
// gear when no icon is registered for that id. The component receives
// `{ size, active }` and is wrapped by the shell in an `aria-hidden` icon span,
// so the glyph only has to paint a square SVG in `currentColor`.
//
// Before 0.2.2 there was no icon field or slot: the plugin claimed the nav row
// after it rendered and hid the shell gear with a `::before` mask. That DOM hack
// is gone — 0.2.2 changed the row structure (the gear now sits inside a
// `span.navIcon`), which made the old rule paint a second glyph next to the
// gear. On older hosts (0.2.1-rc.x) the icon slot never materializes and the row
// keeps the shell's default gear; the theme itself is unaffected.
//
// The glyph is the pine from the package icon (`icon.svg`), reduced to a
// single-colour 16px mark. Painting with `currentColor` means the normal /
// hover / selected states and light↔dark switches need no extra code.
//
// This module only builds the component: the registration (whose id must equal
// the `settings.section` id) lives in `src/client-entry.js`, next to the page it
// decorates.

/** The slot the settings shell declares for per-section navigation icons. */
export const NAV_ICON_SLOT = 'settings.section.icon'

/** The pine mark's path, scaled to a 16px viewBox (from the package icon). */
export const NAV_GLYPH_PATH = 'M8 1.2 3.4 7.6h2.1L2.2 12.4h4.4v2.4h2.8v-2.4h4.4L10.5 7.6h2.1z'

/**
 * Build the settings-navigation icon component.
 *
 * @param {{ h: (type: string, props?: object, ...children: unknown[]) => unknown }} options
 *   `h` is the host React's `createElement`; the Client bundle resolves React at
 *   runtime through `require('react')` and passes its `createElement` in.
 * @returns {(props?: { size?: number, active?: boolean }) => unknown}
 */
export function createSettingsNavIcon ({ h } = {}) {
  if (typeof h !== 'function') throw new TypeError('createSettingsNavIcon: h must be a function')
  return function SettingsNavIcon ({ size = 16 } = {}) {
    const edge = Number.isFinite(size) && size > 0 ? size : 16
    return h(
      'svg',
      {
        width: edge,
        height: edge,
        viewBox: '0 0 16 16',
        fill: 'currentColor',
        'aria-hidden': 'true',
        focusable: 'false'
      },
      h('path', { d: NAV_GLYPH_PATH })
    )
  }
}
