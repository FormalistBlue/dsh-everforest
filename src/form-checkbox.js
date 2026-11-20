// Everforest paint for DSH's native form checkbox (the risk-confirmation dialog
// and any other `Checkbox` built from the same component).
//
// 2026-11-20 report (crop of the 「确认启用完全权限？」 dialog, green box with a
// black tick): 「浅色模式下对话里面的勾勾没问题了，这里看到还是黑色的」. The surface is
// the shared `Checkbox`: a `_checkbox` label wrapping a native
// `<input type="checkbox">`, with DSH setting only
// `accent-color: var(--dsw-alias-brand-primary)` and letting Chromium paint the
// control. Chromium derives the glyph from the accent's luminance — measured in
// the shared debug Chrome at 40px, `#93B259` and `#A7C080` both get a BLACK
// check and only a dark accent (`#4F6B2F`) flips it to white — so a light-green
// accent can never carry a cream tick through `accent-color`; the glyph has to
// be drawn.
//
// This sheet therefore draws the box the way the markdown task list is drawn
// (`src/color-mode.js`): an accent hairline over a 10% tint when idle, the solid
// accent fill when checked, and the tick as a rotated border pair in
// `--dsw-alias-bg-base` — the scheme canvas, i.e. the cream in the light schemes
// and the deep slate in the dark ones. That is exactly the pair the task list
// carries after design §51 and the question composer after §41, so the three
// checkboxes read as one control family. The accent is `brand-primary` =
// `statusline1` (`#93B259` / `#A7C080`), the same green those two use.
//
// Anchors are DSH's `_checkbox` / `_acknowledgement` local-name fragments (the
// same `[class*="_…"]` approach as `_bubble` / `_checkbox`), never the hashed
// module prefix. The selector ends in `input[type="checkbox"]`, so the question
// composer's own box (a span) and the markdown task list (no `_checkbox`
// ancestor) are untouched; the onboarding card uses a hidden input plus its own
// SVG indicator, which `[class*="_checkbox"]` does not match either.
//
// The module is a pure ESM source: no DOM, no state. `scripts/build.mjs`
// bundles it into `client.js`; `src/client-entry.js` owns the `<style>` element.

/**
 * Every native form checkbox of the shared `Checkbox` component, plus the
 * risk-confirmation dialog's `_acknowledgement` label (which may only carry that
 * local name). `input[type="checkbox"]` keeps the markdown task list and the
 * question composer out.
 */
export const FORM_CHECKBOX = ':is([class*="_checkbox"], [class*="_acknowledgement"]) input[type="checkbox"]'

/** The checked box: solid accent fill and the canvas tick. */
export const FORM_CHECKBOX_CHECKED = `${FORM_CHECKBOX}:checked`

/** Keyboard focus ring; `appearance: none` removes the native one. */
export const FORM_CHECKBOX_FOCUS = `${FORM_CHECKBOX}:focus-visible`

/** The complete form-checkbox stylesheet: one rule per state, no variants. */
export function formCheckboxStyles () {
  return [
    `${FORM_CHECKBOX} {`,
    '  -webkit-appearance: none;',
    '  appearance: none;',
    '  box-sizing: border-box;',
    '  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 68%, transparent);',
    '  border-radius: 4px;',
    '  background-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);',
    '  position: relative;',
    '  cursor: pointer;',
    '}',
    '',
    `${FORM_CHECKBOX_CHECKED} {`,
    '  border-color: var(--dsw-alias-brand-primary);',
    '  background-color: var(--dsw-alias-brand-primary);',
    '}',
    '',
    `${FORM_CHECKBOX_CHECKED}::after {`,
    '  content: "";',
    '  position: absolute;',
    '  left: 50%;',
    '  top: 50%;',
    '  width: 4px;',
    '  height: 8px;',
    '  border: solid var(--dsw-alias-bg-base);',
    '  border-width: 0 1.5px 1.5px 0;',
    '  transform: translate(-50%, -58%) rotate(42deg);',
    '}',
    '',
    `${FORM_CHECKBOX_FOCUS} {`,
    '  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));',
    '  outline-offset: 2px;',
    '}',
    ''
  ].join('\n')
}
