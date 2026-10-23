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
 *      (header-aqua) >= 2.5:1 (upstream Everforest aqua cannot reach 4.5; accepted
 *      design trade-off, docs/reference/palette.md §5).
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
 *      label-primary ink, so it needs both the 4.5:1 text gate (§3) and a
 *      boundary step >= 1.10:1 (2026-10-19 visual report: light bubbles blended
 *      into the background).
 *   8. the FileDiff added/deleted stripes (--dsw-alias-file-diff-*-bg) carry
 *      label-primary code text, so they are text-bearing surfaces too: >= 4.5:1
 *      for all six variants (2026-10-21 visual report: the dark·soft stripe was a
 *      light green band under near-white ink, and the gutter numbers sat at 2.1:1).
 *
 * Color mode ("中彩", src/color-mode.js) adds gates 9-15 for the six variants:
 *   9. colour-mode headings h1/h2/h3 on bg-base >= 3.0:1;
 *  10. colour-mode marker/quote/hr/check on bg-base >= 3.0:1;
 *  11. label-primary on the table-header band >= 4.5:1;
 *  12. label-primary on the table zebra stripe >= 4.5:1;
 *  13. label-primary on the session row warn/done fills (and their :hover
 *      variants) >= 4.5:1;
 *  14. colour-mode status dots on both bg-base and the sidebar fill >= 3.0:1;
 *  15. every colour-mode role value is a legal #RRGGBB colour.
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
import { contrastRatio, hexToRgb, isHex, mix } from '../src/color.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const REPORT_PATH = join(REPO_ROOT, 'docs', 'reference', 'contrast.md')

const PRIMARY_THRESHOLD = 4.5
const BRAND_FOREGROUND_THRESHOLD = 2.5
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
  '--dsw-specific-sidebar-nav-item-hover',
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
 * installed 0.2.1-rc.2 client CSS. This token is a contrast ink (it must invert
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

/* ---- Gates 9-15: color mode ("中彩") role colours ------------------------- */
const LEGAL_ROLE_COLOR = /^#[0-9a-f]{6}$/i
/** Role keys of each gate, in report order. */
const COLOR_MODE_HEADING_KEYS = ['h1', 'h2', 'h3']
const COLOR_MODE_DECORATION_KEYS = ['marker', 'quote', 'hr', 'check']
const COLOR_MODE_ROW_KEYS = ['rowWarn', 'rowDone', 'rowWarnHover', 'rowDoneHover']
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
  ['marker', 'marker'],
  ['quote', 'quote'],
  ['hr', 'hr'],
  ['check', 'check'],
  ['band', 'band'],
  ['zebra', 'zebra'],
  ['rowWarn', 'row-warn'],
  ['rowDone', 'row-done'],
  ['rowWarnHover', 'row-warn-hover'],
  ['rowDoneHover', 'row-done-hover'],
  ['dotWarn', 'dot-warn'],
  ['dotDone', 'dot-done']
]
/** [label, ratio key, threshold] of the report's colour-mode contrast table. */
const COLOR_MODE_CHECKS = [
  ['h1 / bg-base', 'h1', COLOR_MODE_DECORATION_MIN],
  ['h2 / bg-base', 'h2', COLOR_MODE_DECORATION_MIN],
  ['h3 / bg-base', 'h3', COLOR_MODE_DECORATION_MIN],
  ['marker / bg-base', 'marker', COLOR_MODE_DECORATION_MIN],
  ['quote / bg-base', 'quote', COLOR_MODE_DECORATION_MIN],
  ['hr / bg-base', 'hr', COLOR_MODE_DECORATION_MIN],
  ['check / bg-base', 'check', COLOR_MODE_DECORATION_MIN],
  ['band / label-primary', 'band', COLOR_MODE_SURFACE_MIN],
  ['zebra / label-primary', 'zebra', COLOR_MODE_SURFACE_MIN],
  ['row-warn / label-primary', 'rowWarn', COLOR_MODE_SURFACE_MIN],
  ['row-done / label-primary', 'rowDone', COLOR_MODE_SURFACE_MIN],
  ['row-warn-hover / label-primary', 'rowWarnHover', COLOR_MODE_SURFACE_MIN],
  ['row-done-hover / label-primary', 'rowDoneHover', COLOR_MODE_SURFACE_MIN],
  ['dot-warn / bg-base', 'dotWarnBase', COLOR_MODE_DOT_MIN],
  ['dot-warn / sidebar-fill', 'dotWarnSidebar', COLOR_MODE_DOT_MIN],
  ['dot-done / bg-base', 'dotDoneBase', COLOR_MODE_DOT_MIN],
  ['dot-done / sidebar-fill', 'dotDoneSidebar', COLOR_MODE_DOT_MIN]
]

const roleOverlays = new Map(Object.entries(colorModeRoles()))
const colorModeRows = []
for (const variant of states) {
  const roles = roleOverlays.get(variant.variant)
  if (!roles) {
    recordFailure(`g15:${variant.variant}`, `${variant.variant}: src/color-mode.js has no roles for this variant`)
    continue
  }
  const bg = variant.get('--dsw-alias-bg-base')
  const sidebar = variant.get('--dsw-specific-sidebar-fill')
  const ink = variant.get('--dsw-alias-label-primary')
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
      marker: contrastRatio(roles.marker, bg),
      quote: contrastRatio(roles.quote, bg),
      hr: contrastRatio(roles.hr, bg),
      check: contrastRatio(roles.check, bg),
      band: contrastRatio(ink, roles.band),
      zebra: contrastRatio(ink, roles.zebra),
      rowWarn: contrastRatio(ink, roles.rowWarn),
      rowDone: contrastRatio(ink, roles.rowDone),
      rowWarnHover: contrastRatio(ink, roles.rowWarnHover),
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
  check('g12', 'zebra', COLOR_MODE_SURFACE_MIN, 'label-primary on the zebra stripe')
  for (const key of COLOR_MODE_ROW_KEYS) {
    check('g13', key, COLOR_MODE_SURFACE_MIN, `label-primary on ${key}`)
  }
  for (const key of COLOR_MODE_DOT_KEYS) check('g14', key, COLOR_MODE_DOT_MIN, COLOR_MODE_DOT_LABELS[key])
  for (const [role, value] of Object.entries(roles)) {
    if (!LEGAL_ROLE_COLOR.test(value)) {
      recordFailure(`g15:${variant.variant}:${role}`, `${variant.variant}: color mode role ${role} is not a #RRGGBB colour: ${value}`)
    }
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
    `- 覆盖 token 数：${TOKEN_COVERAGE.covered.length}（206 颜色 + ${AUXILIARY.size} 辅助 token）`,
    '',
    '硬门槛定义：',
    '',
    '1. `label-primary`（= `fg`）对 `bg-base` / `bg-layer-1` / `bg-layer-2` ≥ 4.5:1（6 档）；',
    '2. `--shiki-foreground` 对 `--shiki-background` ≥ 4.5:1（6 档）；',
    '3. 每个被覆盖的颜色值必须是合法 CSS 颜色，且 `label-primary` ≠ `bg-base`；',
    '4. 品牌实底前景（`label-primary-foreground` = `bg0` on `header-aqua`）≥ 2.5:1（上游 aqua 能力上限，见 `palette.md` §5）；',
    '5. `--dsw-alias-label-primary-inverted` 的真实配对（DSH 把它用作对比墨色）：对 `label-primary`（侧栏 build 徽标 + brand wordmark 的反色镂空）与 `button-contrast-fill`（附件删除按钮）≥ 4.5:1；',
    '6. 侧栏表面 `--dsw-specific-sidebar-fill` 与内容底 `--dsw-alias-bg-base` 的边界对比度 ≥ 1.02:1（6 档）：DSH 用前者画侧栏列 / Windows 标题栏 / 内容卡背后的 frame，用后者画内容卡（16px 左上圆角），同色时边界消失（见 §2c）；',
    '7. 聊天气泡 `--dsw-specific-bubble` 与 `bg-base` 的边界对比度 ≥ 1.10:1（light·soft 为 1.05:1 的可见性取舍，见 §2d），且气泡上的 `label-primary` ≥ 4.5:1（文本承载表面，见 §3）：气泡画在聊天画布上，同色时用户消息和背景融为一体（2026-10-19 走查，见 §2d / §6.8）；',
    '8. FileDiff 的 added / deleted 行底色（`--dsw-alias-file-diff-*-bg`）上的 `label-primary` 代码文本 ≥ 4.5:1（light·soft 为 4.1:1 的可见性取舍，见 §2e）；DSH 用这两个 token 画行底色、文字继承 `label-primary`（2026-10-21 走查：「浅绿色背景配白色文字」与「浅色绿色背景太不明显」，见 §6.3）；',
    '9. 色彩模式（中彩）标题 h1 / h2 / h3 对 `bg-base` ≥ 3.0:1（6 档）；',
    '10. 色彩模式（中彩）`marker` / `quote` / `hr` / `check` 对 `bg-base` ≥ 3.0:1（6 档）；',
    '11. 色彩模式（中彩）表头色带上的 `label-primary` ≥ 4.5:1（6 档）；',
    '12. 色彩模式（中彩）斑马纹上的 `label-primary` ≥ 4.5:1（6 档）；',
    '13. 色彩模式（中彩）会话行底色（待确认 / 已完成，含 `:hover`）上的 `label-primary` ≥ 4.5:1（6 档）；',
    '14. 色彩模式（中彩）状态点（待确认 / 已完成）对 `bg-base` 与 `sidebar-fill` 都 ≥ 3.0:1（6 档）；',
    '15. 色彩模式（中彩）全部 15 个角色色值是合法 `#RRGGBB`（6 档）；',
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
    '`--dsw-alias-label-primary-inverted` 在 DSH 0.2.1-rc.2 中不是 toast/tooltip 深色底的文字色，而是与 `label-primary` / `button-contrast-fill` 配对的「对比墨色」（安装包 CSS：侧栏 build 徽标、附件删除按钮、brand wordmark 在当前 ink 上的反色镂空）。实现按真实配对硬门槛：',
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
      '与背景融为一体（2026-10-19 走查）。现在 hard / medium 为 sage tint（`bg0` → `header-aqua` 16%）并经**向白**守卫；' +
      'light·soft 因 `bg0` 已只有 4.66:1 文本余量、无法再用深色 tint，走「抬起卡片」方向——2026-10-21 用户走查指出近白卡片' +
      '「变成白色了」，因此抬起方向改为白 → `fg.green` 13% 的**淡鼠尾草纸**（`#f0f3de`，文字 4.94:1）；它牺牲了部分明度差' +
      '（对画布 1.06:1，阈值降到 1.05），由绿 vs 暖奶油的色相差异承担可辨识性。本门槛确保它不会退回画布：',
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
    '对照：native light 气泡 `static-deepseek-50 #edf3fe` on `#fff` ≈ 1.08；本实现 light·hard / medium 为 1.17 / 1.14，' +
      'light·soft 为 1.06（低于 native 的明度差，由绿 vs 暖奶油的色相差异承担，阈值相应降到 1.05），dark 1.15–1.16。' +
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
    '## 2f. 色彩模式（中彩）角色色值（硬门槛 G9–G15）',
    '',
    '`src/color-mode.js` 在 token 层之上派生一套「中彩」内容角色色（h1–h3、列表 marker、引用条、分隔线、表头色带、斑马纹、会话行底色与状态点），只在用户打开色彩模式时生效。全部由当前变体的 `bg-base` / `sidebar-fill` / `label-primary` 和 `fg` 强调色算出：标题与装饰朝 ink 混合到对 `bg-base` 3:1；彩色表面把强调色混入底色、权重由 `label-primary` 4.5:1 反推；状态点同时满足 `bg-base` 与 `sidebar-fill` 3:1。元素规则一律以 `html[data-everforest-color-mode="on"]` 开头，关闭时零匹配（与基线零差异）。',
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
    'G15：以上 6 档 × 15 个角色色值全部是合法 `#RRGGBB`。取值公式与期望值来自 2026-10-23 的中彩样张（`.tmp/color-mode-preview`，不入库），由 `tests/color-mode.test.mjs` 逐值锁定、本报告逐档把关；色彩模式默认关闭，开关只改 `html` 上的 `data-everforest-*` 属性，不写任何 token。',
  )
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
    '- **做法**：light scheme 的文本表面（`bg-layer-1/2/3`、`bg-overlay`、`bg-document-preview`、`markdown-code-block` / `--shiki-background`、输入框 / 菜单 / settings 卡片 / diff 底色等）以 `mix(bg0, bgN, 0.25)` 提亮（diff 为 0.45），再由 `readableSurface` 按实际对比度向 `bg0` 微调直到 `label-primary` ≥ 4.5:1；实际值见 §3。聊天气泡不在这族里：它按 2026-10-19 走查单独处理（§6.8）。inline code 芯片同理不在 bgN 表面族内：DSH 把它当 `background-color` 用，映射取调色板 `bg_blue`（见 `src/tokens.js`），同样经 `readableSurface` 守卫。',
    '- **影响 token**：见 §3 全表（light 三档）；dark scheme 保持 design 原值（原生 bg1/bg2 已 ≥4.99，`bg-layer-3` 在 dark·soft 下 4.27 也由 `readableSurface` 微调到达标）。',
    '- **依据**：DSH 原生 light 主题的 `bg-layer-1/2/3` 全部是 `#fff`（`static-neutral-bluish-00`），层次靠边框/阴影；Everforest Enchanted 也是平铺风格（`palette.md` §5「主背景 bg0 平铺」）。因此 light 表面趋近 bg0 并不破坏 DSH 结构语义，只是修正 `fg` 在较暗浅色底上的可读性。',
    '',
    '### 6.2 static 色阶插值的端点解释',
    '',
    '- design 写「最暗 = bg5、最亮 = bg0」。对 dark scheme 而言 `bg5` 比 `bg0` **更亮**，按字面会得到反向亮度（statics 无法作为浅色文本色）。',
    '- 实现按「绝对亮度锚定」解释：DSH static 是双 scheme 相同的绝对色阶（00 = 白 … 1000 = 黑），映射到各 scheme 的最亮锚点 → `bg5` → 最暗锚点：',
    '  - light：`bg0` → `bg5` → `fg`；dark：`fg` → `bg5` → `bgDim`；色相族为「浅 tint → fg 色相 → 深 tint」。',
    '- 该解释让所有 `var(--dsw-static-*)` 引用在两个 scheme 下都保持方向正确（design 对 static 层的目标），且不改变 206 个 token 的显式覆盖。',
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
    '字体 / 圆角 / 阴影 / 焦点环 / 菜单模糊 / `--dsh-*` 终端几何等保持 DSH 原生值，清单见 `src/tokens.js` 顶部与 `TOKEN_COVERAGE.uncovered`。焦点环颜色通过 `--dsw-alias-state-business-primary` 自动跟随 Everforest blue。',
    '',
    '### 6.7 侧栏与内容卡的边界（视觉走查修正）',
    '',
    '- **问题**：0.1.1 把 `--dsw-specific-sidebar-fill` 和 `--dsw-alias-bg-base` 都映射为 `bg0`（Enchanted 平铺风格），但 DSH 的 Windows 外壳用前者画侧栏列 / 标题栏条 / 内容卡背后的 frame，用后者画带 16px 左上圆角的内容卡；同色后整条边界消失，窗口看上去是一个平面（用户走查：「Everforest 全部用的同一个颜色，没法区分边界线」）。',
    '- **做法**：侧栏取 `mix(bg0, bg1, 80%)` 并经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏 `#f9fafb`/`#fff`、`#1b1b1c`/`#151517` 一致）。light·soft 的正文 4.5:1 上限把步长压到 `#eee7ce`（边界 1.03），其余档 1.05–1.12；native 为 1.045 / 1.060，观感同级。数值见 §2c。',
    '- **连带影响**：`--dsw-specific-sidebar-fill` 同时是 DSH 桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会随侧栏一起变色，与自绘标题栏条保持一致；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。',
    '',
    '### 6.8 聊天气泡（2026-10-19 / 2026-10-21 走查修正）',
    '',
    '- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射取 `surface(p, 1)`；light 下 `mix(bg0, bg1, 0.25)` = `#FDFAEE`，与画布 `#FFFBEF` 仅 1.02:1，用户报告「聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡并不是中性色阶，而是 `static-deepseek-50` 的淡蓝色 tint（on `#fff` ≈ 1.08），靠色相 + 轻微明度区分。2026-10-21 二次走查：light·soft 的近白「抬起卡片」被用户描述为「聊天气泡框变成白色的了」，与暖色画布不像一家人。',
    '- **做法**：light 下取 `bg0` → `header-aqua` 16% 的 sage tint，经 `readableToward(..., #ffffff)`（**向白**而非向暖色画布）守卫到 4.5:1。light·hard / medium 的 tint 能保持 ~1.17 / 1.14:1 边界、气泡文字 4.6 / 4.5:1；light·soft 的 `bg0` 已是 4.66:1 文本余量，任何再压暗都会跌破 4.5，所以走抬起方向，但不再用近白冷调：改为白 → `fg.green` 13% 的淡鼠尾草纸（`#f0f3de`，文字 4.94:1，对画布 1.06:1）。它用绿 vs 暖奶油的色相差异代替已不可得的明度差，气泡边界门槛对该档放宽到 1.05。dark 保持 `bg1`（边界 1.14–1.16，文字 ≥5.7:1）。',
    '- **门槛**：新增硬门槛 §2d（气泡 vs `bg-base` ≥ 1.10:1，light·soft 1.05:1）+ §3 的文本承载表面检查（气泡文字 ≥ 4.5:1）。`--dsw-specific-bubble-highlight` 当前 chat 未使用，保持 `surface(p, 2)`。',
    '- **影响 token**：仅 `--dsw-specific-bubble`；其余表面与文字色不变。',
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
