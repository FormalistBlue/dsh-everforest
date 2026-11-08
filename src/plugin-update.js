// Everforest treatment for DSH's plugin-update dialog (ui-plugin-manager).
//
// 2026-11-08 user report on the “更新 dsh-ops” dialog: the step rows read in the
// theme's info blue and the done badges look too pale. DSH renders the dialog
// body as `[data-plugin-update]` (a stable data hook), the outcome row as a
// `[role="status"]` div whose glyph carries `[data-tone]`, and one
// `<li data-state>` per step; a finished step gets a 20px dot filled with a 12%
// success tint and a bare label span that inherits the dialog ink. Those are the
// surfaces this module repaints:
//
//  - a finished step's label is the theme's green accent (the same green as the
//    dialog's 完成 button and the check glyph); a failed step keeps the semantic
//    red; every other state stays the primary ink;
//  - the done badge is filled solid with that green and the scheme canvas `bg0`
//    as ink (5.62–6.88:1 in the dark schemes), so the check reads as a badge
//    instead of a faint tint. The large outcome glyph (the 32px circle above
//    the steps) gets the same solid treatment.
//
// The green is the interaction accent `statusline1` (upstream: Menu Selection
// Background / Tab Line Label Background (active)) — the one green the theme
// paints every selected / active chrome surface with: dark `#A7C080` (= the
// semantic `fg.green`), light `#93B259` (the lighter green of the 完成 button
// and the selected session row, design §21 / §23). 2026-11-08 follow-up: the
// first version used `fg.green` (`#8DA101` in the light schemes) and the user
// asked the light dialog to use `#93B259` instead; the dark schemes are
// unchanged because both roles share `#A7C080` there. The light pairing is the
// palette's documented ceiling (1.95–2.26:1 text, 2.00–2.32:1 ink on the solid
// badge — the same trade-off as §2g / §2i / §2j).
//
// Selectors use the dialog's own stable hooks only (`data-plugin-update`,
// `data-state`, `role="status"`, `data-tone`), never a hashed CSS-module class.
// Always-on and independent of the color mode: the update dialog is chrome, not
// markdown content.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The update dialog body: DSH puts the update phase on this data hook. */
export const PLUGIN_UPDATE_BODY = '[data-plugin-update]'

/** One update step: DSH writes `done` / `failed` / `running` / `unknown`. */
export const UPDATE_STEP = `${PLUGIN_UPDATE_BODY} [data-state]`

/** The step label (the dot is the first span, the text the last one). */
export const UPDATE_STEP_LABEL = `${UPDATE_STEP} > span:last-child`

/** The step's round badge (the glyph container). */
export const UPDATE_STEP_DOT = `${UPDATE_STEP} > span:first-child`

/** The outcome row's large success glyph (the 32px circle). */
export const UPDATE_OUTCOME_GLYPH = `${PLUGIN_UPDATE_BODY} > [role="status"] > [data-tone="success"]`

/**
 * Minimum contrast the dark schemes keep for the green step text on the steps
 * surface (4.22–5.24:1 measured; dark·soft is the weakest).
 */
export const PLUGIN_UPDATE_TEXT_DARK_CONTRAST = 4.0

/**
 * Documented floor of the light schemes' green step text on the cream steps
 * surface (1.95–2.26:1; the palette has no darker `statusline1` than `#93B259`
 * and the user asked for that exact green).
 */
export const PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST = 1.9

/**
 * Minimum contrast the dark schemes keep for the canvas ink on the solid green
 * badge (5.62–6.88:1 measured).
 */
export const PLUGIN_UPDATE_BADGE_DARK_CONTRAST = 4.5

/**
 * Documented floor of the light schemes' canvas ink on the solid green badge
 * (2.00–2.32:1; the same cream-on-green pairing as the brand fill, §2g).
 */
export const PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST = 1.95

/**
 * The four role colours of one variant.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {{ green: string, red: string, ink: string, label: string }}
 */
function rolesFor (scheme, strength) {
  const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
  return {
    // The interaction accent, not `fg.green`: the light schemes must read
    // `#93B259` like the dialog's 完成 button (2026-11-08 follow-up); the dark
    // schemes keep `#A7C080`, where both roles are the same colour.
    green: palette.fg.statusline1,
    red: palette.fg.red,
    ink: palette.ramp.bg0,
    label: palette.fg.fg,
  }
}

/**
 * The four role colours of all six variants, keyed by `${scheme}-${strength}`.
 * @returns {Record<string, { green: string, red: string, ink: string, label: string }>}
 */
export function pluginUpdateRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = rolesFor(scheme, strength)
    }
  }
  return roles
}

/**
 * One variant's scope: the strength attribute the token layer writes on <html>
 * plus DSH's own dark-theme flag on <body>.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function scopeFor (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/**
 * One variant's five rules: base label ink, done label, failed label, solid
 * done badge, solid outcome glyph.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {{ green: string, red: string, ink: string, label: string }} roles
 * @returns {string}
 */
function pluginUpdateRules (scheme, strength, roles) {
  const scope = scopeFor(scheme, strength)
  const rule = (selector, body) => `${scope} ${selector} {\n  ${body}\n}`
  return [
    rule(UPDATE_STEP_LABEL, `color: ${roles.label};`),
    rule(`${UPDATE_STEP}[data-state="done"] > span:last-child`, `color: ${roles.green};`),
    rule(`${UPDATE_STEP}[data-state="failed"] > span:last-child`, `color: ${roles.red};`),
    rule(`${UPDATE_STEP}[data-state="done"] > span:first-child`, `background: ${roles.green};\n  color: ${roles.ink};`),
    rule(UPDATE_OUTCOME_GLYPH, `background: ${roles.green};\n  color: ${roles.ink};`),
  ].join('\n\n')
}

/**
 * The complete plugin-update dialog stylesheet (six variants × five rules).
 * @returns {string}
 */
export function pluginUpdateStyles () {
  const roles = pluginUpdateRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.map((strength) =>
      pluginUpdateRules(scheme, strength, roles[`${scheme}-${strength}`])))
    .join('\n\n')
}
