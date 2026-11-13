// Everforest "workspace folder name" colour + weight for the DSH sidebar.
//
// DSH paints every workspace (project) row title with `label-primary`
// (ui-workspace `Rows` CSS module: `.projectRow { color: var(--dsw-alias-label-primary) }`
// with `.title` inheriting it), and gives only the *active* folder glyph the
// business accent (`.folderActive`). 2026-11-08 user requests: "工作区的每个目录
// 名称也用绿色显示" and, after the first guarded version looked too olive, "浅色
// 目录名称还是用原绿色" — the names use the palette accent verbatim, not a
// deepened variant. The 2026-11-08 third pass briefly used the background green
// `statusline1`; the same-day review (the user compared the two upstream
// greens) settled the *text* roles on the foreground `green`: folder names and
// the conversation title use `green`, while selected / active *backgrounds*
// (session row, menu selection, primary buttons) keep `statusline1`.
//
// The colour is the scheme's `fg.green` — upstream's *foreground* green
// ("Function Names, Method Names, Strings, Characters, Search Highlights"), the
// colour Everforest uses for green text. It is deliberately not `statusline1`:
// upstream defines that one as a *background* ("Menu Selection Background, Tab
// Line Label Background (active), Status Line Mode Indicator"), which in the
// light scheme is the lighter `#93B259` while the text green is `#8DA101`. In
// the dark schemes both are `#A7C080`, so the split only changes the light
// schemes. 2026-11-08 review: the user compared the two greens and confirmed
// the text one is deeper, which is exactly this split.
//
// 2026-11-13 user request (this pass): "帮我把文字加粗吧，如果是选中的打开了
// 工作区下的对话，那么这个工作区的图标也变成全绿色" — two additions:
//   1. the folder name is rendered at weight 600 (the title is 14px/20px, so
//      600 is the UI-semibold DSH uses for emphasis without changing
//      the row's metrics — line-height stays 20px, so the 34px row is intact);
//   2. the folder glyph of the workspace that contains the open session is
//      painted with the same text green. DSH already marks that row with its
//      own `folderActive` class (`.folderActive { color:
//      var(--dsw-alias-state-business-primary) }`, where `active =
//      containsCurrentDescendant || (expanded && containsCurrent)`), but that
//      token is the *accent* `statusline1` — the lighter `#93B259` in the light
//      schemes. Re-inking the active glyph with `fg.green` makes the icon and
//      the bold name read as one green (and keeps the dark schemes unchanged:
//      there both roles are `#A7C080`). The hook is the CSS-module class
//      substring `folderActive`, the same stable-local-name contract as
//      `projectText`.
//
// No contrast guard is applied: resting rows keep the dark schemes at
// 5.00–6.17:1 (WCAG AA) and the light schemes at 2.35–2.68:1; A7's 50% `bg4`
// hover wash makes the hovered row the weakest surface (dark 4.01–4.98:1, light
// 2.13–2.47:1). The measured values are pinned in `docs/reference/contrast.md`
// §2h (G18) instead of being corrected away. The active folder glyph is a
// decorative marker (the bold name carries the text information), so G18 keeps
// covering the text only; the glyph reuses the same measured green.
//
// The selector uses only stable hooks: `[role="treeitem"]` + the
// `data-row-key="workspace:…"` prefix DSH uses for project rows (the same
// contract `src/active-session.js` relies on), plus the CSS-module class
// substrings `projectText` / `folderActive` (DSH hashes the prefix, keeps the
// local name — verified against the installed 0.2.2-rc.1 bundle). The hover
// chevron / folder glyphs are siblings of that text cell and keep their own
// colours; only the active workspace's glyph is re-inked.
//
// Always-on and independent of the color mode: like the active-session band this
// is navigation chrome, not markdown content colouring.

import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from './palette.js'
import { COLOR_MODE_ATTRS } from './color-mode.js'

/** The workspace (project) rows of the sidebar tree. */
export const WORKSPACE_ROW = '[role="treeitem"][data-row-key^="workspace:"]'

/** The row's title cell: `projectText` wraps the single `.title` span. */
export const WORKSPACE_LABEL = `${WORKSPACE_ROW} [class*="projectText"]`

/**
 * The folder glyph DSH marks as "this workspace contains the open session":
 * `clsx(slot, folder, active && folderActive)` in the installed bundle. The
 * class prefix is hashed, the local name is stable.
 */
export const WORKSPACE_ACTIVE_FOLDER = `${WORKSPACE_ROW} [class*="folderActive"]`

/**
 * The folder-name weight the 2026-11-13 request adds. 600 is the UI-semibold
 * step: the title inherits it through `projectText`, its 20px line-height does
 * not change, and the 34px project row keeps its metrics.
 */
export const WORKSPACE_LABEL_FONT_WEIGHT = 600

/**
 * Measured resting-row floor of the dark schemes: the unmodified text green on
 * the sidebar is 5.00–6.17:1, a *bona fide* WCAG AA pair, so the gate demands AA
 * for the resting row (a resting-row regression below 4.5:1 is a real
 * legibility regression, not the documented hover trade-off).
 */
export const WORKSPACE_LABEL_DARK_RESTING_CONTRAST = 4.5

/**
 * Documented hover floor of the dark schemes: A7's 50% `bg4` hover wash drops
 * the green to 4.01–4.98:1. The user asked for the accent verbatim, so the gate
 * pins the measured hover minimum instead of requiring a guarded hue.
 */
export const WORKSPACE_LABEL_DARK_HOVER_CONTRAST = 4.0

/**
 * Measured resting-row floor of the light schemes: the palette text green on the
 * cream sidebar is 2.35–2.68:1 (the light palette offers no deeper text green
 * without leaving the upstream colour), so the gate pins 2.3.
 */
export const WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST = 2.3

/**
 * Documented hover floor of the light schemes (2.13–2.47:1; light·soft on the
 * hover fill is the weakest). The user asked for upstream's text green verbatim,
 * so the gate pins the measured hover minimum instead of requiring a guarded 3:1
 * hue.
 */
export const WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST = 2.1

/**
 * The folder-name colour of one variant: the palette `green` (foreground text
 * green), untouched.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string} opaque `#RRGGBB`.
 */
function workspaceLabelFor (scheme, strength) {
  return resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme].fg.green
}

/**
 * The six folder-name colours, keyed by `${scheme}-${strength}`. The active
 * folder glyph uses the same role, so this map drives both rules.
 * @returns {Record<string, string>} keyed `light-hard` … `dark-soft`.
 */
export function workspaceLabelRoles () {
  const roles = {}
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      roles[`${scheme}-${strength}`] = workspaceLabelFor(scheme, strength)
    }
  }
  return roles
}

/**
 * The variant scope for one scheme + strength, shared by both rules.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @returns {string}
 */
function workspaceScope (scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

/**
 * The folder-name rule of one variant: colour plus the 2026-11-13 semibold.
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} color
 * @returns {string}
 */
function workspaceLabelRule (scheme, strength, color) {
  return `${workspaceScope(scheme, strength)} ${WORKSPACE_LABEL} {\n  color: ${color};\n  font-weight: ${WORKSPACE_LABEL_FONT_WEIGHT};\n}`
}

/**
 * The active-folder rule of one variant: the workspace that contains the open
 * session gets the same text green as its name. (DSH's own `.folderActive`
 * paints `statusline1`, the lighter accent green in the light schemes.)
 * @param {'light' | 'dark'} scheme
 * @param {'hard' | 'medium' | 'soft'} strength
 * @param {string} color
 * @returns {string}
 */
function workspaceActiveFolderRule (scheme, strength, color) {
  return `${workspaceScope(scheme, strength)} ${WORKSPACE_ACTIVE_FOLDER} {\n  color: ${color};\n}`
}

/**
 * The complete workspace folder-name stylesheet: six variants × two rules
 * (name + active folder glyph).
 * @returns {string}
 */
export function workspaceLabelStyles () {
  const roles = workspaceLabelRoles()
  return SCHEMES
    .flatMap((scheme) => STRENGTHS.flatMap((strength) => {
      const color = roles[`${scheme}-${strength}`]
      return [
        workspaceLabelRule(scheme, strength, color),
        workspaceActiveFolderRule(scheme, strength, color)
      ]
    }))
    .join('\n\n')
}

/**
 * The number of CSS rules the sheet emits (asserted by the unit tests and
 * documented in design §22.3).
 */
export const WORKSPACE_LABEL_RULES_PER_VARIANT = 2
