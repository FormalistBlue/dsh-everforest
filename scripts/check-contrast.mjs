#!/usr/bin/env node
/**
 * Verify the Everforest token overlay against WCAG 2.x contrast requirements and
 * write the human-readable report (docs/reference/contrast.md).
 *
 * Usage: node scripts/check-contrast.mjs [--check]
 *
 * Hard gates (failure -> exit 1, docs/design.md §4 + the 2026-10-18 colour audit):
 *   1. --dsw-alias-label-primary on bg-base / bg-layer-1 / bg-layer-2 >= 4.5:1,
 *      for all six variants (light/dark x hard/medium/soft).
 *   2. --shiki-foreground on --shiki-background >= 4.5:1 for all six variants.
 *   3. every covered colour value is a legal CSS colour; label-primary != bg-base.
 *   4. brand foreground (label-primary-foreground = bg0) on brand-primary
 *      (`statusline1`, the interaction accent) >= 1.95:1. Upstream Everforest
 *      cannot reach 4.5 and its own reference tab pairs cream ink with the same
 *      light green; since the 2026-11-08 third accent pass the fill is used
 *      verbatim, so the light schemes sit at 2.00-2.32:1 by construction
 *      (docs/reference/palette.md §5 deviation 9).
 *   5. the actual DSH pairings of --dsw-alias-label-primary-inverted (it is used as
 *      a CONTRAST ink, not as ink on a dark surface): against label-primary
 *      (sidebar build badge + brand wordmark) and button-contrast-fill
 *      (attachment remove button) >= 4.5:1.
 *   6. the sidebar surface stays perceptibly distinct from bg-base: DSH paints the
 *      sidebar column / Windows titlebar / content-card frame with
 *      --dsw-specific-sidebar-fill while the content card is bg-base, so equal
 *      values erase the boundary (2026-10-18 visual report). Boundary contrast
 *      must stay >= 1.02:1 for all six variants, and label-primary on the sidebar
 *      >= 4.5:1 (it is a text-bearing surface, checked in §3).
 *   7. the chat user-message bubble (--dsw-specific-bubble) stays perceptibly
 *      distinct from bg-base: it is painted on the chat canvas and carries
 *      label-primary ink as the token fallback (a scoped sheet inks it with a
 *      derived colour, see src/chat-bubble.js), so it needs both the 4.5:1 text
 *      gate (§3) and a boundary step >= 1.10:1 (2026-10-19 visual report: light
 *      bubbles blended into the background).
 *   8. the FileDiff added/deleted stripes (--dsw-alias-file-diff-*-bg) carry
 *      label-primary code text, so they are text-bearing surfaces too: >= 4.5:1
 *      for all six variants (2026-10-21 visual report: the dark·soft stripe was a
 *      light green band under near-white ink, and the gutter numbers sat at 2.1:1).
 *
 * Color mode ("中彩", src/color-mode.js) adds gates 9-16 for the six variants.
 * Enchanted-style rich-text roles: headings h1-h6, emphasis (strong+em),
 * inline-code text, internal file links, del/completed-task text, subtle
 * blockquote and table-row fills.
 *   9. colour-mode large headings h1-h4 on bg-base >= 3.0:1;
 *  10. colour-mode marker/quote/hr/check on bg-base >= 3.0:1;
 *  11. label-primary on the table-header band >= 4.5:1;
 *  12. label-primary on the table zebra stripe, the hovered row and the
 *      blockquote fill >= 4.5:1;
 *  13. label-primary on the session row warn/done fills (and their :hover
 *      variants) >= 4.5:1;
 *  14. colour-mode status dots on both bg-base and the sidebar fill >= 3.0:1;
 *  15. every colour-mode role value is a legal #RRGGBB colour;
 *  16. colour-mode accent text (h5/h6, emphasis, internal links, inline code)
 *      on every markdown surface it can sit on >= 3.0:1. 3:1 and not 4.5:1 is
 *      deliberate: light Everforest accents cannot reach 4.5:1 without becoming
 *      the ink colour (Enchanted itself paints them near 2.6:1); primary body
 *      text keeps 4.5:1 on all of those surfaces.
 *
 * The always-on workspace active-session surface (src/active-session.js) adds
 * gate 17 for the six variants:
 *  17. the active-row surface is the palette interaction accent `statusline1`
 *      with the scheme canvas `bg0` as ink (both legal #RRGGBB, no tint /
 *      opacity). The dark schemes keep the canvas ink >= 4.5:1 (5.62-6.88:1); in
 *      the light palette the cream ink on `statusline1` is soft by construction
 *      (2.00-2.32:1, the same pairing the reference tab uses), so the gate pins
 *      a documented 1.95 floor (design §15 / §23).
 *
 * The always-on workspace folder-name surface (src/workspace-labels.js) adds
 * gate 18, split because the resting row and its hover overlay carry different
 * documented guarantees:
 *  18. every workspace directory name is the palette **text green `green`**
 *      verbatim (legal #RRGGBB; upstream keeps `green` as the foreground text
 *      colour and `statusline1` as the lighter background green, so in the
 *      light schemes this is `#8DA101`, not `#93B259`).
 *      a. resting row: dark >= 4.5:1 (measured 5.00-6.17:1, a real WCAG AA
 *         pair; a resting regression below 4.5 is not the documented hover
 *         trade-off) and light >= 2.3:1 (measured 2.35-2.68:1);
 *      b. hovered row (A7's 50% `bg4` wash composited on the sidebar): dark
 *         >= 4.0:1 (measured 4.01-4.98:1, documented trade-off) and light
 *         >= 2.1:1 (measured 2.13-2.47:1, light·soft is the weakest).
 *
 * The always-on chrome accent surface (src/ui-accents.js) adds gate 19:
 *  19. a selected dropdown option (menu item / radio option, label + check) is
 *      a solid `statusline1` fill with the scheme canvas `bg0` as ink: dark ink
 *      >= 4.5:1 (5.62-6.88:1); light pinned to the measured 1.95 floor
 *      (2.00-2.32:1, design §23). The fill also has to stay >= 0.02 L* away from
 *      the menu card it is painted on. The option's nested cells restate their
 *      own colour tokens (leading icon `--dsw-alias-menu-icon`, label / second
 *      line / shortcuts under the `label-*` family), so the same ink is
 *      re-pointed onto those tokens for the selected option's subtree; the
 *      measured pairs do not change, only the parts that were left neutral on
 *      the band. The conversation title (`crumbCurrent`) used to be gated here
 *      as the text green; 2026-11-09 the user asked for it back to DSH's
 *      `label-primary` ("标题不需要绿色显示了"), so that surface no longer
 *      exists and its checks are gone.
 *
 * The always-on plugin-update dialog surface (src/plugin-update.js) adds gate 20:
 *  20. finished update steps read in the interaction accent `statusline1`
 *      (gated); failed ones read in the semantic `fg.red`, which is reported
 *      only (same policy as the other semantic state colours: measured
 *      2.66-3.82:1, no floor — the hue, not the contrast, carries "failed").
 *      The done badge and the outcome glyph are filled solid with that green
 *      and the scheme canvas `bg0` as ink. Dark: step text >= 4.0:1 on the
 *      steps panel (4.22-5.24:1) and the badge ink >= 4.5:1 (5.62-6.88:1).
 *      Light: pinned to the measured 1.9 / 1.95 floors (1.95-2.26:1 text,
 *      2.00-2.32:1 ink; the palette's cream-on-green ceiling, design §24).
 *
 * Report-only rows (secondary/tertiary text, links, semantic state colours, diff
 * markers and gutter numbers): upstream Everforest mutes these on purpose
 * (Enchanted does the same). They are reported with their numeric values; only
 * ratios below 1.5 are treated as a broken mapping (exit 1).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tokensFor, TOKEN_COVERAGE } from '../src/tokens.js'
import { colorModeRoles } from '../src/color-mode.js'
import { activeSessionRoles } from '../src/active-session.js'
import {
  workspaceLabelRoles,
  WORKSPACE_LABEL_DARK_HOVER_CONTRAST,
  WORKSPACE_LABEL_DARK_RESTING_CONTRAST,
  WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST,
  WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST
} from '../src/workspace-labels.js'
import {
  UI_ACCENT_DARK_INK_CONTRAST,
  UI_ACCENT_LIGHT_INK_CONTRAST,
  uiAccentRoles
} from '../src/ui-accents.js'
import {
  PLUGIN_UPDATE_BADGE_DARK_CONTRAST,
  PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST,
  PLUGIN_UPDATE_TEXT_DARK_CONTRAST,
  PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST,
  pluginUpdateRoles
} from '../src/plugin-update.js'
import { contrastRatio, hexToRgb, isHex, labLightness, mix, rgbToHex } from '../src/color.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const REPORT_PATH = join(REPO_ROOT, 'docs', 'reference', 'contrast.md')

const PRIMARY_THRESHOLD = 4.5
const BRAND_FOREGROUND_THRESHOLD = 1.95
const REPORT_FLOOR = 1.5
/** Color mode: coloured headings / decorations against bg-base. */
const COLOR_MODE_DECORATION_MIN = 3.0
/** Color mode: label-primary text on tinted bands, stripes and session rows. */
const COLOR_MODE_SURFACE_MIN = 4.5
/** Color mode: status dots, measured on bg-base and on the sidebar fill. */
const COLOR_MODE_DOT_MIN = 3.0
/** Minimum contrast between the sidebar surface and bg-base (column boundary). */
const SIDEBAR_BOUNDARY_MIN = 1.02
/** Minimum contrast between the chat bubble and bg-base (card boundary). */
const BUBBLE_BOUNDARY_MIN = 1.10
/**
 * The bubble boundary follows the same rule except light·soft: its canvas is
 * already 4.66:1 from the ink, so the raised direction trades luminance step for
 * a pale-sage hue instead of the previous near-white (2026-10-21 user report:
 * "聊天气泡框变成白色的了"). The hue difference carries the separation at 1.05.
 */
const BUBBLE_BOUNDARY_MIN_BY_VARIANT = { 'light-soft': 1.05 }
const VARIANTS = ['light-hard', 'light-medium', 'light-soft', 'dark-hard', 'dark-medium', 'dark-soft']

/** Core inventory tokens = covered minus the six auxiliary (gradient/material) ones. */
const AUXILIARY = new Set([
  '--dsw-menu-surface-fill',
  '--dsw-linear-gradient-think',
  '--dsw-linear-think-select',
  '--dsw-gradient-onboarding-violet-stops',
  '--dsw-gradient-onboarding-blue-stops',
  '--dsw-gradient-onboarding-cyan-stops'
])
/** Auxiliary tokens whose value is a gradient list rather than a single colour. */
const GRADIENT_AUXILIARY = new Set([
  '--dsw-linear-gradient-think',
  '--dsw-linear-think-select',
  '--dsw-gradient-onboarding-violet-stops',
  '--dsw-gradient-onboarding-blue-stops',
  '--dsw-gradient-onboarding-cyan-stops'
])
const CORE_TOKENS = TOKEN_COVERAGE.covered.filter((name) => !AUXILIARY.has(name))

/** Surfaces that carry `--dsw-alias-label-primary` text in the DSH UI. */
const TEXT_SURFACES = [
  // Entire sidebar column (nav rows, session titles, section headers).
  '--dsw-specific-sidebar-fill',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-bg-document-preview',
  '--dsw-alias-bg-module-platform',
  '--dsw-alias-bg-multi-select',
  '--dsw-alias-settings-card-fill',
  '--dsw-alias-markdown-code-block',
  '--dsw-alias-markdown-code-block-banner',
  '--dsw-alias-markdown-code-segment-selected',
  '--dsw-alias-markdown-code-segment-unselected',
  '--dsw-alias-markdown-inline-code',
  '--dsw-alias-markdown-citation',
  '--dsw-alias-markdown-placeholder',
  '--dsw-alias-markdown-tag',
  '--dsw-alias-button-elevated-fill',
  '--dsw-alias-button-floating-fill',
  '--dsw-alias-button-ghost-active-fill',
  '--dsw-alias-interactive-bg-hover-solid',
  '--dsw-alias-turn-trigger-bg',
  '--dsw-alias-menu-group-header-fill',
  '--dsw-menu-surface-fill',
  '--dsw-specific-menu',
  '--dsw-specific-bubble',
  '--dsw-specific-bubble-highlight',
  '--dsw-specific-input-major',
  '--dsw-specific-login-input',
  '--dsw-specific-selector',
  '--dsw-specific-tip',
  '--dsw-specific-sidebar-nav-item-active',
  '--dsw-alias-onboarding-card-fill',
  '--dsw-alias-onboarding-secondary-fill'
]

/**
 * FileDiff added / deleted stripes carry `label-primary` code text. They are
 * hard-gated like a text surface, except light·soft: its code canvas already
 * sits exactly on the 4.5:1 label gate, so a 4.5:1 stripe would be
 * indistinguishable from the canvas; the stripe is allowed 4.1:1 there to stay
 * visible (2026-10-21 user-approved trade-off, see §6.3).
 */
const DIFF_STRIPES = [
  '--dsw-alias-file-diff-added-bg',
  '--dsw-alias-file-diff-deleted-bg'
]
const DIFF_STRIPE_MIN = { 'light-soft': 4.1 }

/** Report-only measurements: [label, token, background token]. */
const REPORT_PAIRS = [
  ['label-secondary', '--dsw-alias-label-secondary', '--dsw-alias-bg-base'],
  ['label-secondary / layer-1', '--dsw-alias-label-secondary', '--dsw-alias-bg-layer-1'],
  ['label-secondary / layer-2', '--dsw-alias-label-secondary', '--dsw-alias-bg-layer-2'],
  ['label-secondary / layer-3', '--dsw-alias-label-secondary', '--dsw-alias-bg-layer-3'],
  ['label-tertiary', '--dsw-alias-label-tertiary', '--dsw-alias-bg-base'],
  ['link', '--dsw-alias-link', '--dsw-alias-bg-base'],
  ['state-success', '--dsw-alias-state-success-primary', '--dsw-alias-bg-base'],
  ['state-warn', '--dsw-alias-state-warn-primary', '--dsw-alias-bg-base'],
  ['state-error', '--dsw-alias-state-error-primary', '--dsw-alias-bg-base'],
  ['state-business', '--dsw-alias-state-business-primary', '--dsw-alias-bg-base'],
  ['state-warn-label', '--dsw-alias-state-warn-label', '--dsw-alias-bg-base'],
  ['diff-added-marker', '--dsw-alias-file-diff-added-marker', '--dsw-alias-file-diff-added-bg'],
  ['diff-deleted-marker', '--dsw-alias-file-diff-deleted-marker', '--dsw-alias-file-diff-deleted-bg'],
  ['diff-added-number', '--dsw-alias-file-diff-added-marker', '--dsw-alias-file-diff-added-gutter'],
  ['diff-deleted-number', '--dsw-alias-file-diff-deleted-marker', '--dsw-alias-file-diff-deleted-gutter'],
  ['toast-label (inverted)', '--dsw-alias-toast-label', '--dsw-alias-toast-bg'],
  ['primary-foreground (brand)', '--dsw-alias-label-primary-foreground', '--dsw-alias-brand-primary']
]

/**
 * Real DSH pairings of `--dsw-alias-label-primary-inverted`, taken from the
 * installed 0.2.1-rc.2 / rc.3 client CSS. This token is a contrast ink (it must invert
 * against the scheme ink), so it is hard-gated against its real partners instead
 * of being paired with the dark toast/tooltip surfaces.
 * [label, foreground token, background token, threshold]
 */
const INVERTED_PAIRS = [
  [
    'attachment remove button: label-primary-inverted on button-contrast-fill',
    '--dsw-alias-label-primary-inverted',
    '--dsw-alias-button-contrast-fill',
    4.5
  ],
  [
    'sidebar build badge + brand wordmark: label-primary-inverted on label-primary ink',
    '--dsw-alias-label-primary-inverted',
    '--dsw-alias-label-primary',
    4.5
  ]
]

/**
 * Native DSH light-theme reference values from the ui-theme sheets (used only to
 * show that the upstream semantic colours are equally low-contrast on white).
 * [label, foreground, background]
 */
const NATIVE_REFERENCES = [
  ['label-secondary (native)', '#61666b', '#ffffff'],
  ['label-tertiary (native)', '#81858c', '#ffffff'],
  ['link / state-business (native)', '#4176e6', '#ffffff'],
  ['state-success (native)', '#22c55e', '#ffffff'],
  ['state-warn (native)', '#f59e0b', '#ffffff'],
  ['state-error (native)', '#ec1313', '#ffffff'],
  ['diff added marker (native)', '#01a241', '#e6f4e7'],
  ['diff deleted marker (native)', '#ba2723', '#fce6e2']
]

/**
 * Contrast of `foreground` on `background`, flattening translucent colours over
 * `underlay` first (CSS alpha compositing; everything the DSH UI puts behind
 * these tokens ultimately sits on bg-base).
 */
function contrastOn (foreground, background, underlay) {
  const backgroundRgba = hexToRgb(background)
  const flatBackground = backgroundRgba.a < 1 ? mix(underlay, background, backgroundRgba.a) : background
  const foregroundRgba = hexToRgb(foreground)
  const flatForeground = foregroundRgba.a < 1 ? mix(flatBackground, foreground, foregroundRgba.a) : foreground
  return contrastRatio(flatForeground, flatBackground)
}

/** Build the six variant overlays + scheme getter. */
function variantStates () {
  return VARIANTS.map((variant) => {
    const [scheme, strength] = variant.split('-')
    const state = { light: 'hard', dark: 'soft', [scheme]: strength }
    const overlay = tokensFor(state)
    return {
      variant,
      scheme,
      strength,
      get: (name) => {
        const pair = overlay[name]
        if (!pair) throw new Error(`missing token ${name}`)
        return pair[scheme]
      }
    }
  })
}

const LEGAL_HEX = /^#[0-9a-f]{3,8}$/i
const LEGAL_RGB = /^rgba?\(\s*\d/i
const LEGAL_COLOR_MIX = /^color-mix\(in srgb, #[0-9a-f]{3,8} \d+(\.\d+)?%, transparent\)$/i

function isLegalColor (value) {
  return LEGAL_HEX.test(value) || LEGAL_RGB.test(value) || LEGAL_COLOR_MIX.test(value)
}

function isGradient (value) {
  return /^linear-gradient\(/i.test(value) || /^#[0-9a-f]{3,8} \d+(\.\d+)?%(, #[0-9a-f]{3,8}( \d+(\.\d+)?%)?)+$/i.test(value)
}

const failures = []
const reportIssues = []
const states = variantStates()
const failuresByKey = new Map()

function recordFailure (key, message) {
  if (!failuresByKey.has(key)) {
    failuresByKey.set(key, message)
    failures.push(message)
  }
}

/* ---- Gate 3: value validity (all core tokens, both schemes) --------------- */
for (const variant of states) {
  for (const name of CORE_TOKENS) {
    const value = variant.get(name)
    if (!isLegalColor(value)) recordFailure(`color:${name}:${variant.scheme}`, `token ${name} (${variant.scheme}) is not a legal CSS colour: ${value}`)
  }
}
// Auxiliary tokens must still produce legal colours / gradient-shaped values.
for (const variant of states) {
  for (const name of AUXILIARY) {
    const value = variant.get(name)
    const ok = GRADIENT_AUXILIARY.has(name)
      ? (name.startsWith('--dsw-linear') ? /^linear-gradient\(/i.test(value) : isGradient(value))
      : isLegalColor(value)
    if (!ok) recordFailure(`aux:${name}:${variant.scheme}`, `auxiliary token ${name} (${variant.scheme}) has an unexpected value: ${value}`)
  }
}

/* ---- Gate 1 / 2 / 3b / 4 per variant ------------------------------------- */
const gateRows = []
for (const variant of states) {
  const primary = variant.get('--dsw-alias-label-primary')
  const base = variant.get('--dsw-alias-bg-base')
  const layer1 = variant.get('--dsw-alias-bg-layer-1')
  const layer2 = variant.get('--dsw-alias-bg-layer-2')
  const shikiFg = variant.get('--shiki-foreground')
  const shikiBg = variant.get('--shiki-background')
  const brandBg = variant.get('--dsw-alias-brand-primary')
  const brandFg = variant.get('--dsw-alias-label-primary-foreground')
  const sidebar = variant.get('--dsw-specific-sidebar-fill')
  const bubble = variant.get('--dsw-specific-bubble')
  const baseRatio = contrastRatio(primary, base)
  const layer1Ratio = contrastRatio(primary, layer1)
  const layer2Ratio = contrastRatio(primary, layer2)
  const shikiRatio = contrastRatio(shikiFg, shikiBg)
  const brandRatio = contrastRatio(brandFg, brandBg)
  const sidebarBoundaryRatio = contrastRatio(sidebar, base)
  const bubbleBoundaryRatio = contrastRatio(bubble, base)
  const bubbleMinimum = BUBBLE_BOUNDARY_MIN_BY_VARIANT[variant.variant] ?? BUBBLE_BOUNDARY_MIN
  const row = {
    variant: variant.variant,
    scheme: variant.scheme,
    primary: baseRatio,
    layer1: layer1Ratio,
    layer2: layer2Ratio,
    shiki: shikiRatio,
    brand: brandRatio,
    sidebar,
    bubble,
    base,
    sidebarBoundary: sidebarBoundaryRatio,
    bubbleBoundary: bubbleBoundaryRatio,
    bubbleMin: bubbleMinimum,
    labelDiffers: primary !== base
  }
  gateRows.push(row)
  if (baseRatio < PRIMARY_THRESHOLD) recordFailure(`g1:${variant.variant}:base`, `${variant.variant}: label-primary on bg-base = ${baseRatio.toFixed(2)} < ${PRIMARY_THRESHOLD}`)
  if (layer1Ratio < PRIMARY_THRESHOLD) recordFailure(`g1:${variant.variant}:l1`, `${variant.variant}: label-primary on bg-layer-1 = ${layer1Ratio.toFixed(2)} < ${PRIMARY_THRESHOLD}`)
  if (layer2Ratio < PRIMARY_THRESHOLD) recordFailure(`g1:${variant.variant}:l2`, `${variant.variant}: label-primary on bg-layer-2 = ${layer2Ratio.toFixed(2)} < ${PRIMARY_THRESHOLD}`)
  if (shikiRatio < PRIMARY_THRESHOLD) recordFailure(`g2:${variant.variant}`, `${variant.variant}: shiki foreground on background = ${shikiRatio.toFixed(2)} < ${PRIMARY_THRESHOLD}`)
  if (brandRatio < BRAND_FOREGROUND_THRESHOLD) recordFailure(`g4:${variant.variant}`, `${variant.variant}: brand foreground on brand-primary = ${brandRatio.toFixed(2)} < ${BRAND_FOREGROUND_THRESHOLD}`)
  if (sidebarBoundaryRatio < SIDEBAR_BOUNDARY_MIN) recordFailure(`g6:${variant.variant}`, `${variant.variant}: sidebar-fill vs bg-base boundary = ${sidebarBoundaryRatio.toFixed(2)} < ${SIDEBAR_BOUNDARY_MIN} (the column edge disappears)`)
  if (bubbleBoundaryRatio < bubbleMinimum) recordFailure(`g7:${variant.variant}`, `${variant.variant}: chat bubble vs bg-base boundary = ${bubbleBoundaryRatio.toFixed(2)} < ${bubbleMinimum} (the bubble blends into the canvas)`)
  if (!row.labelDiffers) recordFailure(`g3:${variant.variant}`, `${variant.variant}: label-primary equals bg-base (${primary})`)
}

/* ---- Gate 5: real pairings of the inverted contrast ink ------------------- */
const invertedRows = INVERTED_PAIRS.map(([label, foreground, background, threshold]) => {
  const ratios = {}
  for (const variant of states) {
    ratios[variant.variant] = contrastOn(
      variant.get(foreground),
      variant.get(background),
      variant.get('--dsw-alias-bg-base')
    )
  }
  return { label, foreground, background, threshold, ratios }
})
for (const row of invertedRows) {
  for (const [variant, ratio] of Object.entries(row.ratios)) {
    if (ratio < row.threshold) {
      recordFailure(`g5:${row.foreground}:${variant}`, `${variant}: ${row.label} = ${ratio.toFixed(2)} < ${row.threshold}`)
    }
  }
}

/* ---- Text-bearing surface table + consistency check ---------------------- */
const surfaceRows = TEXT_SURFACES.map((name) => {
  const ratios = {}
  for (const variant of states) {
    ratios[variant.variant] = contrastOn(
      variant.get('--dsw-alias-label-primary'),
      variant.get(name),
      variant.get('--dsw-alias-bg-base')
    )
  }
  return { name, ratios }
})

for (const row of surfaceRows) {
  for (const [variant, ratio] of Object.entries(row.ratios)) {
    if (ratio < PRIMARY_THRESHOLD) {
      recordFailure(`surface:${row.name}:${variant}`, `${variant}: label-primary on ${row.name} = ${ratio.toFixed(2)} < ${PRIMARY_THRESHOLD}`)
    }
  }
}

/* ---- FileDiff stripes (text-bearing, light·soft has a documented exception) */
const diffStripeRows = []
for (const variant of states) {
  for (const name of DIFF_STRIPES) {
    const threshold = DIFF_STRIPE_MIN[variant.variant] ?? PRIMARY_THRESHOLD
    const ratio = contrastOn(
      variant.get('--dsw-alias-label-primary'),
      variant.get(name),
      variant.get('--dsw-alias-bg-base')
    )
    diffStripeRows.push({ variant: variant.variant, name, threshold, ratio })
    if (ratio < threshold) {
      recordFailure(`diff:${name}:${variant.variant}`, `${variant.variant}: label-primary on ${name} = ${ratio.toFixed(2)} < ${threshold}`)
    }
  }
}

/* ---- Gates 9-16: color mode ("中彩") role colours ------------------------- */
const LEGAL_ROLE_COLOR = /^#[0-9a-f]{6}$/i
/** Role keys of each gate, in report order. */
const COLOR_MODE_HEADING_KEYS = ['h1', 'h2', 'h3', 'h4']
const COLOR_MODE_ACCENT_TEXT_KEYS = ['h5', 'h6', 'emphasis', 'linkInternal']
const COLOR_MODE_DECORATION_KEYS = ['marker', 'quote', 'hr', 'check']
const COLOR_MODE_SURFACE_KEYS = ['band', 'zebra', 'tableHover', 'quoteBg']
const COLOR_MODE_ROW_KEYS = ['rowWarn', 'rowWarnHover', 'rowDone', 'rowDoneHover']
const COLOR_MODE_DOT_KEYS = ['dotWarnBase', 'dotWarnSidebar', 'dotDoneBase', 'dotDoneSidebar']
const COLOR_MODE_DOT_LABELS = {
  dotWarnBase: 'dot-warn on bg-base',
  dotWarnSidebar: 'dot-warn on sidebar-fill',
  dotDoneBase: 'dot-done on bg-base',
  dotDoneSidebar: 'dot-done on sidebar-fill'
}
/** [role key, display label] of the report's colour-value table. */
const COLOR_MODE_ROLE_LABELS = [
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['h5', 'h5'],
  ['h6', 'h6'],
  ['emphasis', 'emphasis（strong+em）'],
  ['inlineCode', 'inline-code 文字'],
  ['linkInternal', '内部文件链接'],
  ['faint', 'faint（删除线/已完成任务）'],
  ['marker', 'marker'],
  ['quote', 'quote'],
  ['hr', 'hr'],
  ['tableHandle', '列宽提示线（table-handle）'],
  ['check', 'check'],
  ['band', 'band'],
  ['zebra', 'zebra'],
  ['tableHover', 'table-hover'],
  ['quoteBg', 'quote-bg'],
  ['rowWarn', 'row-warn'],
  ['rowWarnHover', 'row-warn-hover'],
  ['rowDone', 'row-done'],
  ['rowDoneHover', 'row-done-hover'],
  ['dotWarn', 'dot-warn'],
  ['dotDone', 'dot-done']
]
/** [label, ratio key, threshold] of the report's colour-mode contrast table. */
const COLOR_MODE_CHECKS = [
  ['h1 / bg-base', 'h1', COLOR_MODE_DECORATION_MIN],
  ['h2 / bg-base', 'h2', COLOR_MODE_DECORATION_MIN],
  ['h3 / bg-base', 'h3', COLOR_MODE_DECORATION_MIN],
  ['h4 / bg-base', 'h4', COLOR_MODE_DECORATION_MIN],
  ['h5 / markdown 表面（取最弱）', 'h5', COLOR_MODE_DECORATION_MIN],
  ['h6 / markdown 表面（取最弱）', 'h6', COLOR_MODE_DECORATION_MIN],
  ['emphasis / markdown 表面（取最弱）', 'emphasis', COLOR_MODE_DECORATION_MIN],
  ['link-internal / markdown 表面（取最弱）', 'linkInternal', COLOR_MODE_DECORATION_MIN],
  ['inline-code / inline-code 底色', 'inlineCode', COLOR_MODE_DECORATION_MIN],
  ['marker / bg-base', 'marker', COLOR_MODE_DECORATION_MIN],
  ['quote / bg-base', 'quote', COLOR_MODE_DECORATION_MIN],
  ['hr / bg-base', 'hr', COLOR_MODE_DECORATION_MIN],
  ['check / bg-base', 'check', COLOR_MODE_DECORATION_MIN],
  ['band / label-primary', 'band', COLOR_MODE_SURFACE_MIN],
  ['zebra / label-primary', 'zebra', COLOR_MODE_SURFACE_MIN],
  ['table-hover / label-primary', 'tableHover', COLOR_MODE_SURFACE_MIN],
  ['quote-bg / label-primary', 'quoteBg', COLOR_MODE_SURFACE_MIN],
  ['row-warn / 行文字色（light label-primary，dark inverted）', 'rowWarn', COLOR_MODE_SURFACE_MIN],
  ['row-warn-hover / 行文字色（light label-primary，dark inverted）', 'rowWarnHover', COLOR_MODE_SURFACE_MIN],
  ['row-done / label-primary', 'rowDone', COLOR_MODE_SURFACE_MIN],
  ['row-done-hover / label-primary', 'rowDoneHover', COLOR_MODE_SURFACE_MIN],
  ['dot-warn / bg-base', 'dotWarnBase', COLOR_MODE_DOT_MIN],
  ['dot-warn / sidebar-fill', 'dotWarnSidebar', COLOR_MODE_DOT_MIN],
  ['dot-done / bg-base', 'dotDoneBase', COLOR_MODE_DOT_MIN],
  ['dot-done / sidebar-fill', 'dotDoneSidebar', COLOR_MODE_DOT_MIN]
]

/** The weakest contrast of `color` against any of `backgrounds`. */
const minContrastOn = (color, backgrounds) => Math.min(...backgrounds.map((bg) => contrastRatio(color, bg)))

const roleOverlays = new Map(Object.entries(colorModeRoles()))
const colorModeRows = []
for (const variant of states) {
  const roles = roleOverlays.get(variant.variant)
  if (!roles) {
    recordFailure(`g16:${variant.variant}`, `${variant.variant}: src/color-mode.js has no roles for this variant`)
    continue
  }
  const bg = variant.get('--dsw-alias-bg-base')
  const sidebar = variant.get('--dsw-specific-sidebar-fill')
  const ink = variant.get('--dsw-alias-label-primary')
  // The dark waiting row is a bright amber surface that carries the deep
  // contrast ink instead of `label-primary` (design doc §13.8.1); the light
  // waiting rows and the done rows keep `label-primary`.
  const warnInk = variant.scheme === 'dark' ? variant.get('--dsw-alias-label-primary-inverted') : ink
  const inlineCodeSurface = variant.get('--dsw-alias-markdown-inline-code')
  // Every surface a piece of markdown text can sit on (h5/h6, emphasis, links).
  const textSurfaces = [bg, roles.band, roles.zebra, roles.tableHover, roles.quoteBg]
  const row = {
    variant: variant.variant,
    roles,
    bg,
    sidebar,
    ink,
    ratios: {
      h1: contrastRatio(roles.h1, bg),
      h2: contrastRatio(roles.h2, bg),
      h3: contrastRatio(roles.h3, bg),
      h4: contrastRatio(roles.h4, bg),
      h5: minContrastOn(roles.h5, textSurfaces),
      h6: minContrastOn(roles.h6, textSurfaces),
      emphasis: minContrastOn(roles.emphasis, textSurfaces),
      linkInternal: minContrastOn(roles.linkInternal, textSurfaces),
      inlineCode: contrastRatio(roles.inlineCode, inlineCodeSurface),
      marker: contrastRatio(roles.marker, bg),
      quote: contrastRatio(roles.quote, bg),
      hr: contrastRatio(roles.hr, bg),
      check: contrastRatio(roles.check, bg),
      band: contrastRatio(ink, roles.band),
      zebra: contrastRatio(ink, roles.zebra),
      tableHover: contrastRatio(ink, roles.tableHover),
      quoteBg: contrastRatio(ink, roles.quoteBg),
      rowWarn: contrastRatio(warnInk, roles.rowWarn),
      rowWarnHover: contrastRatio(warnInk, roles.rowWarnHover),
      rowDone: contrastRatio(ink, roles.rowDone),
      rowDoneHover: contrastRatio(ink, roles.rowDoneHover),
      dotWarnBase: contrastRatio(roles.dotWarn, bg),
      dotWarnSidebar: contrastRatio(roles.dotWarn, sidebar),
      dotDoneBase: contrastRatio(roles.dotDone, bg),
      dotDoneSidebar: contrastRatio(roles.dotDone, sidebar)
    }
  }
  colorModeRows.push(row)
  const check = (gate, key, minimum, label) => {
    const ratio = row.ratios[key]
    if (ratio < minimum) {
      recordFailure(`${gate}:${variant.variant}:${key}`, `${variant.variant}: color mode ${label} = ${ratio.toFixed(2)} < ${minimum}`)
    }
  }
  for (const key of COLOR_MODE_HEADING_KEYS) check('g9', key, COLOR_MODE_DECORATION_MIN, `${key} on bg-base`)
  for (const key of COLOR_MODE_DECORATION_KEYS) check('g10', key, COLOR_MODE_DECORATION_MIN, `${key} on bg-base`)
  check('g11', 'band', COLOR_MODE_SURFACE_MIN, 'label-primary on the table-header band')
  for (const key of COLOR_MODE_SURFACE_KEYS.slice(1)) {
    check('g12', key, COLOR_MODE_SURFACE_MIN, `label-primary on ${key}`)
  }
  for (const key of COLOR_MODE_ROW_KEYS) {
    check('g13', key, COLOR_MODE_SURFACE_MIN, `label-primary on ${key}`)
  }
  for (const key of COLOR_MODE_DOT_KEYS) check('g14', key, COLOR_MODE_DOT_MIN, COLOR_MODE_DOT_LABELS[key])
  for (const key of COLOR_MODE_ACCENT_TEXT_KEYS) check('g16', key, COLOR_MODE_DECORATION_MIN, `${key} on the markdown surfaces`)
  check('g16', 'inlineCode', COLOR_MODE_DECORATION_MIN, 'inline-code text on the inline-code chip')
  for (const [role, value] of Object.entries(roles)) {
    if (!LEGAL_ROLE_COLOR.test(value)) {
      recordFailure(`g15:${variant.variant}:${role}`, `${variant.variant}: color mode role ${role} is not a #RRGGBB colour: ${value}`)
    }
  }
}

/* ---- Gate 17: workspace active-session row (always-on navigation surface) -- */
/**
 * Ink floor of the light schemes' interaction accent + canvas pair. The dark
 * schemes keep WCAG AA with the same palette pair; in the light palette the cream
 * canvas ink on `statusline1` is soft by construction (2.00–2.32:1, the pairing
 * the upstream reference tab itself uses), so the gate pins the measured ceiling
 * (design §15 / §23).
 */
const ACTIVE_SESSION_LIGHT_INK_FLOOR = 1.95
/**
 * Minimum CIE L* step between the active-row band and the sidebar: only has to
 * catch a band that collapsed back into the column. The solid accent fills run
 * far above it; the check pins the G17 collapse floor.
 */
const ACTIVE_SESSION_MIN_STEP = 0.02
const ACTIVE_SESSION_ROLES = activeSessionRoles()
const activeSessionRows = []
for (const variant of states) {
  const roles = ACTIVE_SESSION_ROLES[variant.variant]
  if (!roles) {
    recordFailure(`g17:${variant.variant}`, `${variant.variant}: src/active-session.js has no surface for this variant`)
    continue
  }
  const { fill, ink } = roles
  const sidebar = variant.get('--dsw-specific-sidebar-fill')
  const ratio = contrastRatio(ink, fill)
  const step = Math.abs(labLightness(fill) - labLightness(sidebar))
  const threshold = variant.scheme === 'dark' ? PRIMARY_THRESHOLD : ACTIVE_SESSION_LIGHT_INK_FLOOR
  activeSessionRows.push({
    variant: variant.variant,
    scheme: variant.scheme,
    fill,
    ink,
    sidebar,
    ratio,
    step,
    threshold,
    legal: LEGAL_ROLE_COLOR.test(fill) && LEGAL_ROLE_COLOR.test(ink)
  })
  if (!LEGAL_ROLE_COLOR.test(fill)) {
    recordFailure(`g17:${variant.variant}:legal`, `${variant.variant}: active-session fill is not a #RRGGBB colour: ${fill}`)
  }
  if (!LEGAL_ROLE_COLOR.test(ink)) {
    recordFailure(`g17:${variant.variant}:ink-legal`, `${variant.variant}: active-session ink is not a #RRGGBB colour: ${ink}`)
  }
  if (ratio < threshold) {
    recordFailure(`g17:${variant.variant}:ink`, `${variant.variant}: canvas ink on the active-session band = ${ratio.toFixed(2)} < ${threshold}`)
  }
  if (step < ACTIVE_SESSION_MIN_STEP) {
    recordFailure(`g17:${variant.variant}:step`, `${variant.variant}: active-session band collapsed into the sidebar (L* step ${step.toFixed(2)} < ${ACTIVE_SESSION_MIN_STEP})`)
  }
}

/* ---- Gate 18: workspace folder names (always-on navigation text) ---------- */
const WORKSPACE_LABEL_ROLES = workspaceLabelRoles()
const workspaceLabelRows = []
for (const variant of states) {
  const color = WORKSPACE_LABEL_ROLES[variant.variant]
  if (!color) {
    recordFailure(`g18:${variant.variant}`, `${variant.variant}: src/workspace-labels.js has no colour for this variant`)
    continue
  }
  const sidebar = variant.get('--dsw-specific-sidebar-fill')
  // Hovered folder rows sit on the translucent `interactive-bg-hover` overlay:
  // composite it onto the sidebar the same way the browser does.
  const { r, g, b, a } = hexToRgb(variant.get('--dsw-alias-interactive-bg-hover'))
  const hover = mix(sidebar, rgbToHex({ r, g, b, a: 1 }), a)
  const sidebarRatio = contrastRatio(color, sidebar)
  const hoverRatio = contrastRatio(color, hover)
  const restingThreshold = variant.scheme === 'dark'
    ? WORKSPACE_LABEL_DARK_RESTING_CONTRAST
    : WORKSPACE_LABEL_LIGHT_RESTING_CONTRAST
  const hoverThreshold = variant.scheme === 'dark'
    ? WORKSPACE_LABEL_DARK_HOVER_CONTRAST
    : WORKSPACE_LABEL_LIGHT_HOVER_CONTRAST
  const legal = LEGAL_ROLE_COLOR.test(color)
  workspaceLabelRows.push({
    variant: variant.variant,
    color,
    sidebar,
    hover,
    sidebarRatio,
    hoverRatio,
    restingThreshold,
    hoverThreshold,
    legal
  })
  if (!legal) {
    recordFailure(`g18:${variant.variant}:legal`, `${variant.variant}: workspace folder name is not a #RRGGBB colour: ${color}`)
  }
  if (sidebarRatio < restingThreshold) {
    recordFailure(`g18:${variant.variant}:resting`, `${variant.variant}: folder name on the resting sidebar row = ${sidebarRatio.toFixed(2)} < ${restingThreshold}`)
  }
  if (hoverRatio < hoverThreshold) {
    recordFailure(`g18:${variant.variant}:hover`, `${variant.variant}: folder name on the hover fill = ${hoverRatio.toFixed(2)} < ${hoverThreshold}`)
  }
}

/* ---- Gate 19: chrome accent (selected dropdown option) -------------------- */
const UI_ACCENT_ROLES = uiAccentRoles()
const uiAccentRows = []
for (const variant of states) {
  const roles = UI_ACCENT_ROLES[variant.variant]
  if (!roles) {
    recordFailure(`g19:${variant.variant}`, `${variant.variant}: src/ui-accents.js has no fill/ink pair for this variant`)
    continue
  }
  // Only the selected dropdown option is covered: the conversation title rule
  // was removed on 2026-11-09 ("标题不需要绿色显示了") and the header is DSH's
  // own `label-primary` again.
  const { fill, ink } = roles
  const header = variant.get('--dsw-alias-bg-base')
  const menuToken = variant.get('--dsw-menu-surface-fill')
  const { r, g, b, a } = hexToRgb(menuToken)
  const menu = mix(header, rgbToHex({ r, g, b, a: 1 }), a)
  const ratio = contrastRatio(ink, fill)
  const step = Math.abs(labLightness(fill) - labLightness(menu))
  const inkThreshold = variant.scheme === 'dark' ? UI_ACCENT_DARK_INK_CONTRAST : UI_ACCENT_LIGHT_INK_CONTRAST
  uiAccentRows.push({
    variant: variant.variant,
    scheme: variant.scheme,
    fill,
    ink,
    menu,
    ratio,
    step,
    inkThreshold,
    threshold: inkThreshold,
    legal: LEGAL_ROLE_COLOR.test(fill) && LEGAL_ROLE_COLOR.test(ink),
  })
  if (!LEGAL_ROLE_COLOR.test(fill)) {
    recordFailure(`g19:${variant.variant}:legal`, `${variant.variant}: accent green is not a #RRGGBB colour: ${fill}`)
  }
  if (!LEGAL_ROLE_COLOR.test(ink)) {
    recordFailure(`g19:${variant.variant}:ink-legal`, `${variant.variant}: selected ink is not a #RRGGBB colour: ${ink}`)
  }
  if (ratio < inkThreshold) {
    recordFailure(`g19:${variant.variant}:ink`, `${variant.variant}: canvas ink on the selected fill = ${ratio.toFixed(2)} < ${inkThreshold}`)
  }
  if (step < ACTIVE_SESSION_MIN_STEP) {
    recordFailure(`g19:${variant.variant}:step`, `${variant.variant}: selected fill collapsed into the menu card (L* step ${step.toFixed(2)})`)
  }
}

/* ---- Gate 20: plugin-update dialog (semantic text + solid badge) ---------- */
const PLUGIN_UPDATE_ROLES = pluginUpdateRoles()
const pluginUpdateRows = []
for (const variant of states) {
  const roles = PLUGIN_UPDATE_ROLES[variant.variant]
  if (!roles) {
    recordFailure(`g20:${variant.variant}`, `${variant.variant}: src/plugin-update.js has no colour for this variant`)
    continue
  }
  const surface = variant.get('--dsw-alias-bg-module-platform')
  const textRatio = contrastRatio(roles.green, surface)
  const badgeRatio = contrastRatio(roles.ink, roles.green)
  // Failed steps read the semantic red; like the other semantic state colours it
  // is report-only (no floor): the hue carries the meaning, and the palette red
  // only reaches ~2.66-3.82:1 on the dialog panel.
  const redRatio = contrastRatio(roles.red, surface)
  const textThreshold = variant.scheme === 'dark' ? PLUGIN_UPDATE_TEXT_DARK_CONTRAST : PLUGIN_UPDATE_TEXT_LIGHT_CONTRAST
  const badgeThreshold = variant.scheme === 'dark' ? PLUGIN_UPDATE_BADGE_DARK_CONTRAST : PLUGIN_UPDATE_BADGE_LIGHT_CONTRAST
  const legal = ['green', 'red', 'ink', 'label'].every((name) => LEGAL_ROLE_COLOR.test(roles[name]))
  pluginUpdateRows.push({
    variant: variant.variant,
    scheme: variant.scheme,
    green: roles.green,
    red: roles.red,
    ink: roles.ink,
    surface,
    textRatio,
    badgeRatio,
    redRatio,
    textThreshold,
    badgeThreshold,
    legal
  })
  for (const [name, value] of [['green', roles.green], ['red', roles.red], ['ink', roles.ink], ['label', roles.label]]) {
    if (!LEGAL_ROLE_COLOR.test(value)) {
      recordFailure(`g20:${variant.variant}:legal-${name}`, `${variant.variant}: plugin-update ${name} is not a #RRGGBB colour: ${value}`)
    }
  }
  if (textRatio < textThreshold) {
    recordFailure(`g20:${variant.variant}:text`, `${variant.variant}: update step text = ${textRatio.toFixed(2)} < ${textThreshold}`)
  }
  if (badgeRatio < badgeThreshold) {
    recordFailure(`g20:${variant.variant}:badge`, `${variant.variant}: update badge ink = ${badgeRatio.toFixed(2)} < ${badgeThreshold}`)
  }
}

/* ---- Report-only measurements -------------------------------------------- */
const reportRows = REPORT_PAIRS.map(([label, token, background]) => {
  const ratios = {}
  for (const variant of states) {
    ratios[variant.variant] = contrastOn(
      variant.get(token),
      variant.get(background),
      variant.get('--dsw-alias-bg-base')
    )
  }
  return { label, token, background, ratios }
})
for (const row of reportRows) {
  for (const [variant, ratio] of Object.entries(row.ratios)) {
    if (ratio < REPORT_FLOOR) {
      reportIssues.push(`${variant}: ${row.label} = ${ratio.toFixed(2)} < ${REPORT_FLOOR} (mapping suspect)`)
    }
  }
}
const nativeRows = NATIVE_REFERENCES.map(([label, fg, bg]) => ({
  label,
  fg,
  bg,
  ratio: contrastRatio(fg, bg)
}))

/* ---- Markdown report ------------------------------------------------------ */
const format = (value) => value.toFixed(2)
const pass = (ok) => (ok ? '✅' : '❌')

function renderMarkdown () {
  const lines = []
  const push = (...rows) => lines.push(...rows)

  push(
    '# Everforest token contrast report',
    '',
    '> 由 `node scripts/check-contrast.mjs` 生成，请勿手改。',
    '> WCAG 2.x 相对亮度公式；6 档 = light/dark × hard/medium/soft。',
    '',
    '## 1. 结论',
    '',
    `- 硬门槛：${failures.length === 0 ? '**全部通过** ✅' : `**${failures.length} 项不达标** ❌`}`,
    `- 报告项（次要文本 / 语义色 / diff / 反色前景）：${reportIssues.length === 0 ? '全部 ≥ 1.5，无映射损坏 ✅' : `${reportIssues.length} 项 < 1.5 ❌`}`,
    `- 覆盖 token 数：${TOKEN_COVERAGE.covered.length}（${TOKEN_COVERAGE.covered.length - AUXILIARY.size} 颜色 + ${AUXILIARY.size} 辅助 token）`,
    '',
    '硬门槛定义：',
    '',
    '1. `label-primary`（= `fg`）对 `bg-base` / `bg-layer-1` / `bg-layer-2` ≥ 4.5:1（6 档）；',
    '2. `--shiki-foreground` 对 `--shiki-background` ≥ 4.5:1（6 档）；',
    '3. 每个被覆盖的颜色值必须是合法 CSS 颜色，且 `label-primary` ≠ `bg-base`；',
    '4. 品牌实底前景（`label-primary-foreground` = `bg0` on `statusline1` 交互强调色）≥ 1.95:1：上游 Everforest 的同一配对就是奶油墨 + 浅绿（参考 tab 亦如此），2026-11-08 第三轮起实底取 `statusline1` 原值、不再向 `fg` 微调，浅色档因此固定为 2.00–2.32:1（见 `palette.md` §5 偏差 9）；',
    '5. `--dsw-alias-label-primary-inverted` 的真实配对（DSH 把它用作对比墨色）：对 `label-primary`（侧栏 build 徽标 + brand wordmark 的反色镂空）与 `button-contrast-fill`（附件删除按钮）≥ 4.5:1；',
    '6. 侧栏表面 `--dsw-specific-sidebar-fill` 与内容底 `--dsw-alias-bg-base` 的边界对比度 ≥ 1.02:1（6 档）：DSH 用前者画侧栏列 / Windows 标题栏 / 内容卡背后的 frame，用后者画内容卡（16px 左上圆角），同色时边界消失（见 §2c）；',
    '7. 聊天气泡 `--dsw-specific-bubble` 与 `bg-base` 的边界对比度 ≥ 1.10:1（light·soft 为 1.05:1 的可见性取舍，见 §2d），且气泡上的 `label-primary` ≥ 4.5:1（文本承载表面，见 §3）：气泡画在聊天画布上，同色时用户消息和背景融为一体（2026-10-19 走查，见 §2d / §6.8）；',
    '8. FileDiff 的 added / deleted 行底色（`--dsw-alias-file-diff-*-bg`）上的 `label-primary` 代码文本 ≥ 4.5:1（light·soft 为 4.1:1 的可见性取舍，见 §2e）；DSH 用这两个 token 画行底色、文字继承 `label-primary`（2026-10-21 走查：「浅绿色背景配白色文字」与「浅色绿色背景太不明显」，见 §6.3）；',
    '9. 色彩模式（中彩）大号标题 h1 / h2 / h3 / h4 对 `bg-base` ≥ 3.0:1（6 档）；',
    '10. 色彩模式（中彩）`marker` / `quote` / `hr` / `check` 对 `bg-base` ≥ 3.0:1（6 档）；',
    '11. 色彩模式（中彩）表头色带上的 `label-primary` ≥ 4.5:1（6 档）；',
    '12. 色彩模式（中彩）斑马纹 / 行 hover / 引用块淡底上的 `label-primary` ≥ 4.5:1（6 档）；',
    '13. 色彩模式（中彩）会话行底色（待确认 / 已完成，含 `:hover`）上的 `label-primary` ≥ 4.5:1（6 档）；',
    '14. 色彩模式（中彩）状态点（待确认 / 已完成）对 `bg-base` 与 `sidebar-fill` 都 ≥ 3.0:1（6 档）；',
    '15. 色彩模式（中彩）全部 25 个角色色值是合法 `#RRGGBB`（6 档）；',
    '16. 色彩模式（中彩）强调文字（h5 / h6 / emphasis / 内部链接 / 行内 code）对其可能落到的每个 markdown 表面 ≥ 3.0:1（6 档）：浅色档调色板强调色本身达不到 4.5:1（Enchanted 同类文本约 2.6:1），本实现抬到 3.0:1 并保留色相，正文 `label-primary` 仍保持 4.5:1；',
    '17. 工作区当前会话行（`src/active-session.js`，常驻、与色彩模式无关）：底色是合法 `#RRGGBB` 的交互强调色 `statusline1`、文字墨色是方案画布 `bg0`（两者都是合法色值，无混色 / 无透明度）；墨色同时覆盖行内灰字与中性的加载 spinner（`[data-state="ongoing"]`，§23.6），语义状态点保持语义色；深色档墨色在其上 ≥ 4.5:1（5.62–6.88:1），浅色档是上游参考 tab 的同一配对（2.00–2.32:1，浅色盘没有更深的墨），门槛记为 1.95 并在 §2g 说明；6 档实测值见 §2g；',
    '18. 工作区目录名称（`src/workspace-labels.js`，常驻、与色彩模式无关）：颜色是合法 `#RRGGBB` 的**文字绿 `green`**（上游 foreground green，浅色 `#8DA101` 比背景绿 `statusline1` `#93B259` 深一档；深色两者同为 `#A7C080`）；深色档静止行 ≥4.5:1（AA 下限，实测 5.00–6.17）、A7 的 50% `bg4` hover 叠加底上 ≥4.0:1（已记录取舍）；浅色档静止行 ≥2.3、hover 底固定 2.1 的已记录下限（文字绿实测下限）；6 档实测值见 §2h；',
    '19. 下拉选中项（`src/ui-accents.js`，常驻、与色彩模式无关）：菜单 / 单选列表的选中项以`statusline1`（浅色 `#93B259`）作实色底、方案画布 `bg0` 作文字与勾勾墨色（深色档墨色 ≥ 4.5:1，浅色档 1.95 已记录下限），选中项内由 DSH 单独上色的图标与次要文字（`--dsw-alias-menu-icon` 与 `label-*` 族）同样取该墨色，并对菜单卡保持 ≥ 0.02 的 L* 步长；会话标题自 2026-11-09 起回到 DSH 原生 `label-primary`（用户「标题不需要绿色显示了」），不再由本样式表染色；6 档实测值见 §2i；',
    '20. 插件更新弹窗（`src/plugin-update.js`，常驻、与色彩模式无关）：完成步骤的文字是合法 `#RRGGBB` 的交互强调色 `statusline1`（浅色档即 `#93B259`，与弹窗「完成」按钮同色）、失败步骤是语义红 `fg.red`（语义色，仅报告不设门槛，实测 2.66–3.82:1）、其余状态回到 `label-primary`；完成步骤的 20px 圆点与结果大图标改为「`statusline1` 实底 + 方案画布 `bg0` 墨色」；深色档文字 ≥ 4.0:1、徽标墨色 ≥ 4.5:1，浅色档固定 1.9 / 1.95 的已记录下限；6 档实测值见 §2j；',
    '',
    '报告项（不 exit 1，仅低于 1.5 视为映射损坏）：上游 Everforest 的 muted 色对比度有意偏低（Enchanted 亦如此），下表给出数值与 native DSH 参考值对照。',
    '',
    '## 2. 硬门槛明细（6 档）',
    '',
    '| 变体 | label-primary / bg-base | / bg-layer-1 | / bg-layer-2 | shiki fg / bg | 品牌前景 / 品牌底 | 结果 |',
    '|---|---:|---:|---:|---:|---:|---|'
  )
  for (const row of gateRows) {
    const ok =
      row.primary >= PRIMARY_THRESHOLD &&
      row.layer1 >= PRIMARY_THRESHOLD &&
      row.layer2 >= PRIMARY_THRESHOLD &&
      row.shiki >= PRIMARY_THRESHOLD &&
      row.brand >= BRAND_FOREGROUND_THRESHOLD &&
      row.labelDiffers
    push(
      `| ${row.variant} | ${format(row.primary)} | ${format(row.layer1)} | ${format(row.layer2)} | ${format(row.shiki)} | ${format(row.brand)} | ${pass(ok)} |`
    )
  }
  push(
    '',
    '## 2b. 反色前景真实配对（硬门槛）',
    '',
    '`--dsw-alias-label-primary-inverted` 在 DSH 0.2.1-rc.2 / rc.3 中不是 toast/tooltip 深色底的文字色，而是与 `label-primary` / `button-contrast-fill` 配对的「对比墨色」（安装包 CSS：侧栏 build 徽标、附件删除按钮、brand wordmark 在当前 ink 上的反色镂空）。实现按真实配对硬门槛：',
    '',
    '| 真实配对 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft | 阈值 | 结果 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|'
  )
  for (const row of invertedRows) {
    const cells = VARIANTS.map((variant) => {
      const ratio = row.ratios[variant]
      return `${format(ratio)} ${pass(ratio >= row.threshold)}`
    })
    const ok = VARIANTS.every((variant) => row.ratios[variant] >= row.threshold)
    push(`| ${row.label} | ${cells.join(' | ')} | ${row.threshold} | ${pass(ok)} |`)
  }
  push(
    '',
    '## 2c. 侧栏边界（硬门槛）',
    '',
    'DSH 的 Windows 外壳把标题栏条、侧栏列以及内容卡背后的 frame 都画成 `--dsw-specific-sidebar-fill`，' +
      '内容卡本身是 `--dsw-alias-bg-base`（`bg0`）+ 16px 左上圆角（`ui-layout` 的 `AppFrame.module.css`）。' +
      '两者取值相同时整条边界消失 —— 这正是 0.1.1 视觉走查报告的「Everforest 全屏一个颜色」。' +
      `实现把侧栏定为从 \`bg0\` 向 \`bg1\` 混合 80%（` +
      'light 更深、dark 更浅，方向与 native 侧栏一致）并经对比度守卫；本门槛确保它不会退回 `bg0`：',
    '',
    `| 变体 | sidebar-fill | bg-base | 边界对比度 | 阈值 | 结果 |`,
    '|---|---|---|---:|---:|---|',
  )
  for (const row of gateRows) {
    push(
      `| ${row.variant} | \`${row.sidebar}\` | \`${row.base}\` | ${format(row.sidebarBoundary)} | ${SIDEBAR_BOUNDARY_MIN} | ${pass(row.sidebarBoundary >= SIDEBAR_BOUNDARY_MIN)} |`,
    )
  }
  push(
    '',
    '对照：DSH native light 侧栏 `#f9fafb` / 内容 `#fff` ≈ 1.045，native dark `#1b1b1c` / `#151517` ≈ 1.060，' +
      '所以 1.03–1.12 的边界与 native 观感同级（light·soft 受正文 4.5:1 上限约束，取守卫后的最大步长）。' +
      '侧栏上的正文可读性见 §3 第一行（`--dsw-specific-sidebar-fill` 已纳入文本承载表面）。',
  )
  push(
    '',
    '## 2d. 聊天气泡边界（硬门槛）',
    '',
    'DSH 用 `--dsw-specific-bubble` 画用户消息气泡（`MessageItem.module.css`：`.bubble { background: var(--dsw-specific-bubble) }`），' +
      '文字继承 `label-primary`。旧映射取 `surface(p, 1)`，light 下得到 `#FDFAEE` 对画布 `#FFFBEF` 只有 1.02:1，' +
      '与背景融为一体（2026-10-19 走查）。2026-11-08 气泡配色评审（六方案 demo，用户选 light「苔纸」/ dark「只换字色」）后，' +
      'light 改为 palette `bg_green` 向 `bg5` 22% 的**苔纸**，并按 `label-primary` 4.5:1 守卫：hard 保持 `#e7ead0`（4.54:1）、' +
      'medium 微提亮到 `#e7e9cd`（4.50:1）；light·soft 的画布已无正文余量，走「抬起」方向——白 → 同一苔纸 40% 的淡苔纸' +
      '（`#f1f2e5`，文字 4.94:1，对画布 1.06:1，阈值仍为 1.05，由苔绿 vs 暖奶油的色相差异承担）。气泡字色另由常驻样式表改成派生墨' +
      '（`src/chat-bubble.js`，见 §6.8），token 回落的 `label-primary` 仍满足 AA。本门槛确保它不会退回画布：',
    '',
    '| 变体 | bubble | bg-base | 边界对比度 | 阈值 | 结果 |',
    '|---|---|---|---:|---:|---|',
  )
  for (const row of gateRows) {
    push(
      `| ${row.variant} | \`${row.bubble}\` | \`${row.base}\` | ${format(row.bubbleBoundary)} | ${row.bubbleMin} | ${pass(row.bubbleBoundary >= row.bubbleMin)} |`,
    )
  }
  push(
    '',
    '对照：native light 气泡 `static-deepseek-50 #edf3fe` on `#fff` ≈ 1.08；本实现 light·hard / medium 为 1.19 / 1.15，' +
      'light·soft 为 1.06（低于 native 的明度差，由苔绿 vs 暖奶油的色相差异承担，阈值相应降到 1.05），dark 1.15–1.16。' +
      '气泡文本对比度见 §3 的 `--dsw-specific-bubble` 行。',
  )
  push(
    '',
    '## 2e. FileDiff 行底文本（硬门槛）',
    '',
    'DSH `FileDiff` 用 `--dsw-alias-file-diff-added/deleted-bg` 画行底、代码文字继承 `label-primary`，所以两者同属文本承载表面。' +
      '默认门槛 4.5:1；**light·soft 例外**：该档代码画布本身已卡在 4.5:1，4.5:1 的行底与画布几乎同色（用户走查「浅色档绿色背景看不出」），' +
      '因此允许行底文字降到 4.1:1 换取可辨识的绿 / 红条（2026-10-21 用户确认取舍，见 §6.3）。',
    '',
    '| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |',
    '|---|---:|---:|---:|---:|---:|---:|'
  )
  for (const name of DIFF_STRIPES) {
    const cells = VARIANTS.map((variant) => {
      const row = diffStripeRows.find((entry) => entry.variant === variant && entry.name === name)
      return `${format(row.ratio)} ${pass(row.ratio >= row.threshold)}`
    })
    push(`| \`${name}\` | ${cells.join(' | ')} |`)
  }
  push(
    '',
    'light·hard / medium / soft 的 added 行底对代码画布明度差约 1.15 / 1.10 / 1.09，deleted 1.14 / 1.11 / 1.10：' +
      '浅色档现在能看出绿 / 红条；dark 行底向画布收 40% 后文字 ≥5.23:1。',
  )
  push(
    '',
    '## 2f. 色彩模式（中彩）角色色值（硬门槛 G9–G16）',
    '',
    '`src/color-mode.js` 在 token 层之上派生一套「中彩」内容角色色，自 2026-10-24 起作为默认功能始终生效（设置页开关已移除）。映射参考 Obsidian **Everforest Enchanted** 的 markdown 配色，按 DSH 渲染器实际存在的元素落地：标题 h1–h6 依次 red → orange → yellow → green → blue → purple；strong / em 紫；行内 code 蓝（落在 DSH 的蓝底 chip 上）；内部文件链接 aqua（外链继续用官方 link token）；删除线与已完成任务淡化；引用块 aqua 淡底；表格表头绿色带 / 斑马纹 / 行 hover；复选框（浅色档绿、深色档蓝）；列表 marker / 引用条 / 分隔线 aqua；表格列宽提示线取 `headerAqua`（§18 的 2px 装饰线，不参与 G9–G16 文本门槛，由 `tests/color-mode.test.mjs` 钉住对表头色带 ≥ 2.5:1）；会话行保持 0.4.0 的整行实色底，2026-10-24 重制版把行底换成 Everforest palette1 的 `bg_yellow`（待确认 / 待审批；用户反馈红色像报错，当日后续由 `bg_red` 改黄）与 `bg_blue`（已完成；2026-11-08 由 `bg_green` 改回蓝色，绿色让给当前会话行，见 §2g），浅色档的黄色再向 `fg.yellow` 加深到 3.5 L* 或 4.5:1 门槛为止（超过 4.5:1 的 soft 档沿 `bg0` 方向微调）；深色档因为 palette 的 `bg_yellow` 在浅色墨水下只能读作橄榄灰，改为「亮琥珀底 + 深色对比墨」（`--dsw-alias-label-primary-inverted`，标题 / 尾标 / 状态点一起继承，2026-10-24 第二轮反馈「深色档再亮/更黄一点」）。hover 向对应 `fg` 强调色混 16% 后重新守卫；完成行状态点随之改为蓝色（`fg.blue` 守卫到 3:1）。全部由当前变体的 `bg-base` / `sidebar-fill` / `label-primary` / `label-tertiary` / 行内 code chip / 代码块表面和 `fg` 强调色算出：大号标题（h1–h4）与装饰朝 ink 混合到对 `bg-base` 3:1；强调文字对每个可能落到的 markdown 表面 3:1（见门槛 16）；彩色表面把强调色混入底色、权重由 `label-primary` 4.5:1 反推；状态点同时满足 `bg-base` 与 `sidebar-fill` 3:1。元素规则一律以 `html[data-everforest-color-mode="on"]` 开头——该属性恒为 `on`，只作作用域锚点；token 层零差异（与基线一致）。',
    '',
    '角色色值（自定义属性均为 `--everforest-color-<角色>`，6 档）：',
    '',
    '| 角色 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |',
    '|---|---|---|---|---|---|---|'
  )
  for (const [role, label] of COLOR_MODE_ROLE_LABELS) {
    const cells = colorModeRows.map((row) => `\`${row.roles[role]}\``)
    push(`| ${label} | ${cells.join(' | ')} |`)
  }
  push(
    '',
    '对比度门槛明细（数值为实际比值，✅/❌ 按阈值判定）：',
    '',
    '| 检查项 | 阈值 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft | 结果 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|'
  )
  for (const [label, key, minimum] of COLOR_MODE_CHECKS) {
    const cells = colorModeRows.map((row) => `${format(row.ratios[key])} ${pass(row.ratios[key] >= minimum)}`)
    const ok = colorModeRows.every((row) => row.ratios[key] >= minimum)
    push(`| ${label} | ${minimum} | ${cells.join(' | ')} | ${pass(ok)} |`)
  }
  push(
    '',
    'G15：以上 6 档 × 25 个角色色值全部是合法 `#RRGGBB`。取值公式与期望值来自 2026-10-23 的中彩样张（`.tmp/color-mode-preview`，不入库）、Enchanted 的 markdown 角色映射与 2026-10-24 的状态行重制（行底取 palette1 的 `bg_yellow` / `bg_blue`，浅色档黄色按可见性下限加深，hover 重新守卫），由 `tests/color-mode.test.mjs` 逐值锁定、本报告逐档把关；色彩模式自 2026-10-24 起默认提供、没有设置开关（0.4.x 的开关已随设置页区块移除）；`html` 上的 `data-everforest-color-mode` 恒为 `on`，仅作作用域锚点，只改 `data-everforest-*` 属性、不写任何 token。faint 直接取该档 `label-tertiary`，是刻意的弱化色（删除线 / 已完成任务），不参与门槛。',
  )
  push(
    '',
    '## 2g. 工作区当前会话行（active-session，硬门槛 G17）',
    '',
    'DSH 把「当前打开的会话」和 hover 画成同一条规则（`ui-workspace` 的 `Rows` 模块：' +
      '`.wnFoaW_sessionRow:hover,.wnFoaW_sessionRow.wnFoaW_selected{background:var(--dsw-alias-interactive-bg-hover)}`），' +
      '而该 token 是半透明叠层（旧版 `bg5` 16%，2026-11-08 A7 起改为 `bg4` 50%）—— 在 Everforest 的压缩 ramp 里对侧栏只有约 2.6 L*，' +
      '深 / 浅两档都很难找到当前会话（2026-10-24 用户反馈）。上游没有独立的「选中行」token，' +
      '`src/active-session.js` 因此用一行常驻规则（`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`）' +
      '把选中行画成交互强调色 `statusline1` 的**实色**底、文字取方案画布 `bg0`（2026-11-08：按用户要求「不要左边框、不要透明度」；' +
      '同日第三轮用户贴出上游活动 tab 的浅色裁图（底色正是 `statusline1` `#93B259`）并要求「绿色应该是浅绿色」，' +
      '于是选中行与发送按钮统一改用 `statusline1`（下拉选中项同样取它作背景）；目录名称取文字绿 `green`（§2h）：选中块深色 `#A7C080`、浅色 `#93B259`。' +
      '行内自己的 tertiary 灰（状态槽、时间、pin、hover 操作按钮）在实色绿底上只剩 1.2–1.6:1，因此规则把这些子元素**显式**写成画布墨色；' +
      '其中时间嵌在 `rowResting` 单元格内、pin / 操作按钮在 `rowActions` 内，父级自带 `label-tertiary`，`color: inherit` 会被那一层截断。' +
      '2026-11-08 的第一次实现还有一个选择器拼接 bug：每条选择器都被重复拼了作用域前缀（`row row [class*="time"]`），实际只有 `> span` 生效，' +
      '所以时间 / pin / 图标仍不可见（用户反馈「还是看不清楚」）—— 现已改为单一前缀 + 显式墨色，并由 `tests/active-session.test.mjs` 断言「每条选择器只出现一次行锚点」。' +
      '状态点保留语义色（它是独立图形，不是绿底上的文字）；例外是运行中的加载 spinner —— `StateDot(state="ongoing")` 是 `<svg data-state="ongoing">` 的中性灰环（`label-tertiary`，对绿底仅 1.22–1.39:1），' +
      '2026-11-08 第四轮用户反馈「整块高亮的时候，前面这个转圈的图标显示不明显」，墨色选择器因此追加 `[data-state="ongoing"]`、与文字同取画布墨色；`done` / `warning` / `error` 状态点不受影响。' +
      '色彩模式自 2026-11-08 起把「已完成未读」行改回蓝色（§2f，`bg_blue`），绿色专属于「当前会话」；' +
      '该样式常驻、与色彩模式无关（导航可见性，不是内容着色；色彩模式自 2026-10-24 起也没有开关）。',
    '',
    '深色三档的「绿底 + 画布墨」是 WCAG AA 配对（5.62–6.88:1）；浅色三档是上游参考 tab 的同一配对：' +
      '浅色调色板里最亮的墨色就是画布 `bg0`，与 `statusline1` 只有 2.00–2.32:1，且没有任何更深的浅色墨可用（Everforest 自己的 tab 也这么配）。' +
      '因此 G17 对深色档要求 ≥ 4.5:1、浅色档固定 1.95 的已记录下限 —— 这是让全部绿色 UI 保持同一 accent 的取舍（design §23），不是漏检。',
    '',
    '| 变体 | active fill（statusline1） | ink（bg0） | sidebar-fill | L* 步长 | 墨色对比度 | 阈值 | 结果 |',
    '|---|---|---|---|---:|---:|---:|---|'
  )
  for (const row of activeSessionRows) {
    const ok = row.legal && row.ratio >= row.threshold && row.step >= ACTIVE_SESSION_MIN_STEP
    push(
      `| ${row.variant} | \`${row.fill}\` | \`${row.ink}\` | \`${row.sidebar}\` | ${format(row.step)} | ${format(row.ratio)} | ${row.threshold} | ${pass(ok)} |`
    )
  }
  push(
    '',
    '## 2h. 工作区目录名称（workspace-labels，硬门槛 G18）',
    '',
    'DSH 把工作区（项目）行的标题画成 `label-primary`（`ui-workspace` 的 `.projectRow { color: var(--dsw-alias-label-primary) }`，只有活动目录的图标拿到 business 强调色）。' +
      '2026-11-08 用户要求「工作区的每个目录名称也用绿色显示」，`src/workspace-labels.js` 因此用一条常驻规则把 `[data-row-key^="workspace:"] [class*="projectText"]` 画成该档 **文字绿 `green`**；' +
      '同日第三轮用户曾指出「浅色模式的绿色不对…绿色应该是浅绿色」，当时把文字绿换成了背景绿 `statusline1` `#93B259`；' +
      '同日复核（用户对照上游配色）确认 Everforest 的文字绿与选中块绿本是两种：文字取 `green`（浅色 `#8DA101`，更深）、选中块背景取 `statusline1`（浅色 `#93B259`）；深色档两者同为 `#A7C080`，故只有浅色档变化。' +
      '上游符合性评估（A7）曾把目录名撤回 `label-primary`，复核时用户再次要求绿色，于是恢复并**不做对比度守卫**：' +
      '浅色档侧栏 2.35–2.68:1、hover 叠加底最弱 2.13:1；深色档静止行 5.00–6.17:1，但 A7 把 hover 叠加层从 `bg5` 16% 换成 `bg4` 50%，hover 行降到 4.01–4.98:1。' +
      'G18 因此按 scheme + 表面分阈值：深色静止行 ≥4.5:1（AA；静止行掉到 4.5 以下不是 hover 的已记录取舍）、深色 hover 行 ≥4.0:1；浅色静止行 ≥2.3、hover 行固定 2.1 的已记录下限（调色板文字绿的实测下限，hover 叠加底最弱）。',
    '',
    '| 变体 | 目录名称颜色 | 侧栏底 | 侧栏对比度 | hover 叠加底 | hover 对比度 | 阈值（侧栏 / hover） | 结果 |',
    '|---|---|---|---:|---|---:|---:|---|'
  )
  for (const row of workspaceLabelRows) {
    const ok = row.legal && row.sidebarRatio >= row.restingThreshold && row.hoverRatio >= row.hoverThreshold
    push(
      `| ${row.variant} | \`${row.color}\` | \`${row.sidebar}\` | ${format(row.sidebarRatio)} | \`${row.hover}\` | ${format(row.hoverRatio)} | ${row.restingThreshold} / ${row.hoverThreshold} | ${pass(ok)} |`
    )
  }
  push(
    '',
    '## 2i. 下拉选中项（ui-accents，硬门槛 G19）',
    '',
    '2026-11-08 用户要求「模型选择、推理强度、权限等下拉选项打开后，选中的内容文字和勾勾也改为绿色」。' +
      '被命中的表面 DSH 原生是 `label-primary`：下拉选中项是 `[role="menu"]` 里的 `menuitem`（Menu 的 check 选择模式）或 `menuitemradio[aria-checked="true"]`（模型 / 推理强度列表），勾勾是它们的 `check` 子元素。' +
      '`src/ui-accents.js` 用 ARIA 角色 / `aria-checked` 选中这个表面，并按上游「`statusline1` = Menu Selection Background」的语义（A7）改成 `statusline1`（浅色 `#93B259`）**实底** + 方案画布 `bg0` 文字与勾勾。' +
      '同日后续反馈「第一个图中 icon 颜色不对，第二个图中文字的颜色不对」：选中项内的前导图标（`_itemIcon_`，取 `--dsw-alias-menu-icon`）、' +
      '模式选项的标题与说明（`_itemName_` / `_itemDesc_`，取 `label-primary` / `label-caption`）、工作区路径后缀（`pathSuffix`，取 `label-secondary`）' +
      '各自写死颜色 token、不吃父级 `color`，因此在实色绿底上仍留在中性灰；规则改为把这些 token 在选中项子树内一并指向画布墨色（`MENU_INK_TOKENS`），' +
      '对比度数值不变（同一墨色），只是原先漏掉的部件也落到同一配对。' +
      '会话标题（`crumbCurrent`，`ui-conversation` 头部）2026-11-08 曾同样取文字绿 `green`（A7 撤回、复核加回）；2026-11-09 用户要求「标题不需要绿色显示了」，' +
      '该规则已删除，标题回到 DSH 原生 `label-primary`（即本主题的 `fg`）——G19 因此只剩选中项一张表（见 design.md §27）。',
    '',
    '下拉选中项：`statusline1` 实底 + 方案画布 `bg0` 墨色（勾勾、前导图标与选项内的次要文字同墨），并检查实底带相对菜单卡不会被压平。',
    '',
    '| 变体 | 选中底（statusline1） | 墨色（bg0） | 菜单卡表面 | 墨色对比度 | L* 步长 | 墨色阈值 | 结果 |',
    '|---|---|---|---|---:|---:|---:|---|'
  )
  for (const row of uiAccentRows) {
    const ok = row.legal && row.ratio >= row.threshold && row.step >= ACTIVE_SESSION_MIN_STEP
    push(
      `| ${row.variant} | \`${row.fill}\` | \`${row.ink}\` | \`${row.menu}\` | ${format(row.ratio)} | ${format(row.step)} | ${row.threshold} | ${pass(ok)} |`
    )
  }
  push(
    '',
    '画布墨色在 `statusline1` 上是 WCAG AA（深色 5.62–6.88:1）；浅色档 2.00–2.32:1 —— 调色板奶油墨的自身上限（上游参考 tab 同一配对）。' +
      'G19 因此按 scheme 分阈值：深色墨色 ≥4.5:1，浅色墨色固定 1.95 的已记录下限，并对菜单卡要求 ≥ 0.02 的 L* 步长（实色绿带不会消失在菜单材质里）。' +
      '会话标题不再参与本门槛：它已回到 DSH 的 `label-primary`，对比度由门槛 1 的 `label-primary` 规则覆盖。',
  )
  push(
    '',
    '## 2j. 插件更新弹窗（plugin-update，硬门槛 G20）',
    '',
    '2026-11-08 用户反馈「更新 dsh-ops」弹窗：步骤文字是蓝色而不是绿色，打勾图标颜色太淡。' +
      'DSH 把步骤行渲染成 `[data-plugin-update] [data-state]`（每行一个 20px 圆点 + 文字），完成态圆点只有 12% 成功绿淡底，步骤文字也不跟随成功色；' +
      '`src/plugin-update.js` 因此把完成步骤的文字改成交互强调色 `statusline1`、失败步骤改成语义红，并把完成圆点与结果大图标改成「`statusline1` 实底 + 画布 `bg0` 墨色」——勾选从淡色细线变成高对比徽标。' +
      '同日追加反馈：浅色模式要用 `#93B259`（与弹窗「完成」按钮同色），因此浅色档从语义绿 `#8DA101` 换成 `statusline1`；深色档两值同为 `#A7C080`，观感不变。' +
      '深色档 `statusline1` 在步骤面板（`bg-module-platform`）上 4.22–5.24:1、实底徽标 5.62–6.88:1；浅色档是调色板的同一取舍（文字 1.95–2.26、徽标 2.00–2.32:1），G20 按 scheme 分阈值。失败步骤的语义红不设门槛（与其余语义色同一政策，仅报告）：实测 2.66–3.82:1。',
    '',
    '| 变体 | 完成文字绿 | 失败文字红 | 失败文字对比度（仅报告） | 步骤面板 | 文字对比度 | 徽标墨色 | 徽标对比度 | 文字阈值 | 徽标阈值 | 结果 |',
    '|---|---|---|---:|---|---:|---|---:|---:|---:|---|'
  )
  for (const row of pluginUpdateRows) {
    const ok = row.legal && row.textRatio >= row.textThreshold && row.badgeRatio >= row.badgeThreshold
    push(
      `| ${row.variant} | \`${row.green}\` | \`${row.red}\` | ${format(row.redRatio)} | \`${row.surface}\` | ${format(row.textRatio)} | \`${row.ink}\` | ${format(row.badgeRatio)} | ${row.textThreshold} | ${row.badgeThreshold} | ${pass(ok)} |`
    )
  }
  push(
    '',
    '## 3. 文本承载表面（label-primary 对比度）',
    '',
    '`docs/design.md` §4 要求这些表面上的主文本可读；`src/tokens.js` 的 `readableSurface` 会在不达标时向方案背景色 `bg0` 微调（light 提亮、dark 压暗，bg0 始终是该 scheme 下与 `fg` 对比最高的背景），实际值如下。',
    '',
    '| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |',
    '|---|---:|---:|---:|---:|---:|---:|'
  )
  for (const row of surfaceRows) {
    const cells = VARIANTS.map((variant) => {
      const ratio = row.ratios[variant]
      return `${format(ratio)} ${pass(ratio >= PRIMARY_THRESHOLD)}`
    })
    push(`| \`${row.name}\` | ${cells.join(' | ')} |`)
  }
  push(
    '',
    '## 4. 语义色 / 次要文本报告（不 exit 1）',
    '',
    '| 用途 | token | 背景 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|'
  )
  for (const row of reportRows) {
    const cells = VARIANTS.map((variant) => format(row.ratios[variant]))
    push(`| ${row.label} | \`${row.token}\` | \`${row.background}\` | ${cells.join(' | ')} |`)
  }
  push(
    '',
    `以上报告项 floor = ${REPORT_FLOOR}。状态色/次要文本低于 4.5 属**上游设计取舍**：` +
      'DSH 原生语义色在 light 主题下同样偏低（见 §5），插件保持 Enchanted/上游语义色，不为了数字把它们改成 `fg`。',
    '',
    '## 5. native DSH 参考值（light 主题，on #fff 或对应底色）',
    '',
    '| 项 | 前景 | 背景 | 对比度 |',
    '|---|---|---|---:|'
  )
  for (const row of nativeRows) {
    push(`| ${row.label} | \`${row.fg}\` | \`${row.bg}\` | ${format(row.ratio)} |`)
  }
  const nativeRatio = (prefix) => nativeRows.find((row) => row.label.startsWith(prefix))?.ratio ?? 0
  push(
    '',
    `对照可见：native DSH 的 \`state-warn\`（amber-500 on #fff = ${format(nativeRatio('state-warn'))}）与 \`state-success\`（green-500 on #fff = ${format(nativeRatio('state-success'))}）本身就是低对比；` +
      'Everforest 的 `yellow` / `green` 与之同级，属于语义色层固有取舍，而不是映射错误。' +
      `\`label-secondary\` 同理：native 用 \`neutral-bluish-700\`（on #fff = ${format(nativeRatio('label-secondary'))}），Everforest \`grey1\` 在 light 下只有 2.30–2.67 —— 这是 Enchanted/上游刻意采用的 muted 语义，不为了数字把它提亮成 \`fg\`。`,
    '',
    '## 6. 与 design.md 的偏差',
    '',
    '### 6.1 light scheme 文本表面提亮（approved）',
    '',
    '- **原因**：上游 light·soft 档 `bg1 = #EAE4CA`、`bg2 = bgDim = #E5DFC5`，`fg = #5C6A72` 只得到 4.38 / 4.17:1，达不到硬门槛 4.5；而 light·hard / light·medium 的对应值原本就达标（4.66–5.40）。',
    '- **做法**：light scheme 的文本表面（`bg-layer-1/2/3`、`bg-overlay`、`bg-document-preview`、`markdown-code-block` / `--shiki-background`、输入框 / 菜单 / settings 卡片 / diff 底色等）以 `mix(bg0, bgN, 0.25)` 提亮（diff 为 0.45），再由 `readableSurface` 按实际对比度向 `bg0` 微调直到 `label-primary` ≥ 4.5:1；实际值见 §3。聊天气泡不在这族里：它按 2026-10-19 走查单独处理（§6.8）。inline code 芯片同理不在 bgN 表面族内：DSH 把它当 `background-color` 用，映射浅色取调色板 `bg_blue`、深色取 `bg_dim` 向 `bg0` 提亮 30%（见 `src/tokens.js`），同样经 `readableSurface` 守卫。',
    '- **影响 token**：见 §3 全表（light 三档）；dark scheme 保持 design 原值（原生 bg1/bg2 已 ≥4.99，`bg-layer-3` 在 dark·soft 下 4.27 也由 `readableSurface` 微调到达标）。',
    '- **依据**：DSH 原生 light 主题的 `bg-layer-1/2/3` 全部是 `#fff`（`static-neutral-bluish-00`），层次靠边框/阴影；Everforest Enchanted 也是平铺风格（`palette.md` §5「主背景 bg0 平铺」）。因此 light 表面趋近 bg0 并不破坏 DSH 结构语义，只是修正 `fg` 在较暗浅色底上的可读性。',
    '',
    '### 6.2 static 色阶插值的端点解释',
    '',
    '- design 写「最暗 = bg5、最亮 = bg0」。对 dark scheme 而言 `bg5` 比 `bg0` **更亮**，按字面会得到反向亮度（statics 无法作为浅色文本色）。',
    '- 实现按「绝对亮度锚定」解释：DSH static 是双 scheme 相同的绝对色阶（00 = 白 … 1000 = 黑），映射到各 scheme 的最亮锚点 → `bg5` → 最暗锚点：',
    '  - light：`bg0` → `bg5` → `fg`；dark：`fg` → `bg5` → `bgDim`；色相族为「浅 tint → fg 色相 → 深 tint」。',
    `- 该解释让所有 \`var(--dsw-static-*)\` 引用在两个 scheme 下都保持方向正确（design 对 static 层的目标），且不改变 ${TOKEN_COVERAGE.covered.length - AUXILIARY.size} 个 token 的显式覆盖。`,
    '',
    '### 6.3 diff 底色',
    '',
    '- `file-diff-added/deleted-bg` 在 light 下把 `bg0` 向 `fg.green` / `fg.red` 压到「`label-primary` 仍 ≥4.5」的极限（2026-10-21 走查：旧实现 `bg0` → `bg_green` 混 45%，行底与代码画布只有 1.001–1.007:1，浅色档根本看不出 added / deleted 行）。现在 light·hard / medium 的绿 / 红条对代码画布分别有 1.15 / 1.10 与 1.14 / 1.11:1 的明度差。light·soft 的代码画布本身已卡在 4.5:1 文本门槛上，4.5:1 的行底与画布仍然同色；该档允许行底文字降到 4.1:1（`#e5e0b6` / `#f4d8c4`），对画布明度差 1.09 / 1.10，与 medium 观感同级——2026-10-21 用户确认的可见性取舍。',
    '- dark 下 `file-diff-*-bg` 向 `bg0` 混合 40%——DSH 直接用 ramp 色画行底，dark·soft 的 `bg_green` = `#48574e` 是明显偏亮的绿色带，近白的 `label-primary` 只有 4.52:1（同上走查「浅绿色背景配白色文字」），向画布收 40% 后为 `#404d4a`、文字 5.23:1，仍是可辨识的绿色条；',
    '- gutter 在底色基础上沿 scheme 的纵深方向退一步：light 向 `bg0` 提亮 35%，dark 向 `bgDim` 压暗 35%（与 native 同向：light `#edf7ed` on `#e6f4e7`、dark `#132016` on `#1f3124`）。旧实现两个 scheme 都向亮端 `lift`，dark 下行号 gutter 反而比行底更亮（`#797e6e`），绿色行号只有 2.09:1；现在 dark 行号 ≥3.97:1、绿色条与 gutter 的层次也与 native 一致。',
    '- 行号 / marker 属小号文本，按既有口径保留为报告项（§4）：light 下 marker on gutter 为 2.38–3.04（native light 为 2.6，同属 muted 取舍），dark 为 3.97–6.30。',
    '',
    '### 6.4 toast / tooltip / 反色前景',
    '',
    '- DSH 原生 `toast-bg` / `tooltip-bg` 在**两个 scheme 下都是深色表面**（light: `toast-bg` = `neutral-bluish-800`、`tooltip-bg` = `neutral-bluish-850`；dark: 两者都是 `neutral-bluish-750`），`toast-label` 恒为 `neutral-bluish-00`。',
    '- 因此实现为「反色表面 + 反色前景」：`toast-bg` / `tooltip-bg` = `fg`（light）/ `bgDim`（dark）派生深色，`toast-label` = `bg0`（light）/ `fg`（dark）。design §4 把 `tooltip-key-bg` 标为 `bg3`，这里改为在 tooltip 深色底上向亮端混合 25%（保持键帽可见），属实现细节偏差。',
    '- `label-primary-inverted` 单独处理：它在 DSH 中与 `label-primary`（侧栏 build 徽标、brand wordmark 的 currentColor 反色镂空）、`button-contrast-fill`（附件删除按钮）配对，必须是 scheme ink 的反色（light = `bg0`、dark = `bgDim`），不能沿用 toast/tooltip 的浅色文字（否则 dark 主题下与背景同色不可见）。真实配对对比度见 §2b。',
    '',
    '### 6.5 菜单/浮层材质',
    '',
    '- `menu-surface-fill` / `menu-group-header-fill` / `button-tool-bar-*` 保持 `bg2` + 原 45%–94% 不透明度语义（design §4 第 2 层）；alpha 值不变。',
    '',
    '### 6.6 未覆盖项',
    '',
    '字体 / 圆角 / 阴影 / 焦点环 / 菜单模糊 / `--dsh-*` 终端几何等保持 DSH 原生值，清单见 `src/tokens.js` 顶部与 `TOKEN_COVERAGE.uncovered`。焦点环颜色通过 `--dsw-alias-state-business-primary` 自动跟随 Everforest 的交互强调色 `statusline1`。',
    '',
    '### 6.7 侧栏与内容卡的边界（视觉走查修正）',
    '',
    '- **问题**：0.1.1 把 `--dsw-specific-sidebar-fill` 和 `--dsw-alias-bg-base` 都映射为 `bg0`（Enchanted 平铺风格），但 DSH 的 Windows 外壳用前者画侧栏列 / 标题栏条 / 内容卡背后的 frame，用后者画带 16px 左上圆角的内容卡；同色后整条边界消失，窗口看上去是一个平面（用户走查：「Everforest 全部用的同一个颜色，没法区分边界线」）。',
    '- **做法**：侧栏取 `mix(bg0, bg1, 80%)` 并经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏 `#f9fafb`/`#fff`、`#1b1b1c`/`#151517` 一致）。light·soft 的正文 4.5:1 上限把步长压到 `#eee7ce`（边界 1.03），其余档 1.05–1.12；native 为 1.045 / 1.060，观感同级。数值见 §2c。',
    '- **连带影响**：`--dsw-specific-sidebar-fill` 同时是 DSH 桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会随侧栏一起变色，与自绘标题栏条保持一致；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。',
    '',
    '### 6.8 聊天气泡（2026-10-19 / 2026-10-21 / 2026-11-08 走查修正）',
    '',
    '- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射取 `surface(p, 1)`；light 下 `mix(bg0, bg1, 0.25)` = `#FDFAEE`，与画布 `#FFFBEF` 仅 1.02:1，用户报告「聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡并不是中性色阶，而是 `static-deepseek-50` 的淡蓝色 tint（on `#fff` ≈ 1.08），靠色相 + 轻微明度区分。2026-10-21 二次走查：light·soft 的近白「抬起卡片」被用户描述为「聊天气泡框变成白色的了」，与暖色画布不像一家人。',
    '- **做法**：2026-11-08 定稿（用户从六方案 demo 里选了 light「苔纸」/ dark「只换字色」）：light 改为 `bg_green` → `bg5` 22% 的苔纸，并按 `label-primary` 4.5:1 守卫——hard `#e7ead0`（4.54:1）、medium `#e7e9cd`（4.50:1）；light·soft 的 `bg0` 仍只有 4.66:1 余量，继续走抬起方向，但改为白 → 同一苔纸 40% 的淡苔纸 `#f1f2e5`（文字 4.94:1，对画布 1.06:1，门槛 1.05）。dark 保持 `bg1`（边界 1.15–1.16，官方 `label-primary` ≥5.7:1）。',
    '- **字色（派生墨）**：DSH 把气泡文字写死为 `label-primary`，token 层不能只给气泡换字色，因此 `src/chat-bubble.js` 用一张常驻作用域样式表覆盖：light 深松 `#3E5647`（6.50 / 6.45 / 7.07:1）、dark 淡鼠尾草 `#DAE2C7`（8.98 / 8.08 / 7.26:1），均高于回落 ink 的对比度；选择器按聊天包的类名片段 `[class*="_userStack"] [class*="_bubble"]` 匹配（`userStack` 祖先排除 tooltip 的 `_bubble_44yfq_1`）。该表失效时只丢色相，token 层的 `label-primary` 仍满足 AA。',
    '- **门槛**：新增硬门槛 §2d（气泡 vs `bg-base` ≥ 1.10:1，light·soft 1.05:1）+ §3 的文本承载表面检查（气泡文字 ≥ 4.5:1）。`--dsw-specific-bubble-highlight` 当前 chat 未使用，保持 `surface(p, 2)`。',
    '- **影响范围**：light 三档 `--dsw-specific-bubble` + 新增常驻样式表 `dsh-everforest/chat-bubble`；dark token 与其余表面 / 文字色不变。',
    '',
    '## 7. 复现',
    '',
    '```bash',
    'node scripts/check-contrast.mjs',
    'node --test tests/color.test.mjs tests/tokens.test.mjs tests/color-mode.test.mjs',
    '```',
    ''
  )
  return lines.join('\n')
}

function main () {
  const markdown = renderMarkdown()
  const checkOnly = process.argv.includes('--check')
  if (checkOnly) {
    let current = ''
    try {
      current = readFileSync(REPORT_PATH, 'utf8')
    } catch {
      current = ''
    }
    if (current !== markdown) {
      console.error(`contrast report out of date: ${REPORT_PATH}`)
      process.exit(1)
    }
    console.log(`contrast report up to date: ${REPORT_PATH}`)
  } else {
    writeFileSync(REPORT_PATH, markdown)
    console.log(`wrote ${REPORT_PATH}`)
  }
  console.log(`hard gates: ${failures.length === 0 ? 'pass' : `${failures.length} failed`}`)
  for (const failure of failures) console.error(` - ${failure}`)
  console.log(`report items: ${reportIssues.length === 0 ? 'all >= ' + REPORT_FLOOR : `${reportIssues.length} below ${REPORT_FLOOR}`}`)
  for (const issue of reportIssues) console.error(` - REPORT ${issue}`)
  if (failures.length > 0 || reportIssues.length > 0) process.exit(1)
}

main()
