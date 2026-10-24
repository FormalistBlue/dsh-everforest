// Everforest token layer for DeepSeek Harness.
//
// `tokensFor(state)` returns the complete DSH token overlay:
//
//   Record<cssVariableName, { light: string, dark: string }>
//
// Every value is a non-empty CSS colour string (hex / 8-digit hex / rgb() /
// color-mix()) or — for the six auxiliary gradient tokens — a gradient. The
// overlay is installed with `ctx.theme.overrideTokens` and resolved by the DSH
// ThemePresenter per active colour scheme (docs/design.md §4-§5).
//
// ---------------------------------------------------------------------------
// Coverage (docs/design.md §4, 2026-10-18 audit; inventory: docs/reference/token-inventory.json)
// ---------------------------------------------------------------------------
//   77 `--dsw-static-*` colour tokens   (derived: luminance-anchored ramp interpolation)
//  107 `--dsw-alias-*` colour tokens    (explicit role mapping, see ALIAS_TOKENS)
//   11 `--dsw-specific-*` colour tokens (explicit role mapping)
//   11 `--shiki-*` tokens               (explicit; shiki.css light values on :root and
//                                        --shiki-foreground/background reference body-level
//                                        aliases, so alias inheritance cannot be relied on)
//   = 206 covered colour tokens
//   + 6 auxiliary tokens (menu material, think gradients, onboarding gradient stops)
//
// Not covered (kept at DSH native values; see TOKEN_COVERAGE.uncovered):
//   - fonts (`--dsw-font-*`), radii (`--dsw-radius-*`), `--dsw-corner-shape`
//   - shadows (`--dsw-shadow-lv1/lv1-blur/lv2/lv3`) and elevation (`--dsw-elevation-*`)
//   - `--dsw-focus-ring-color` / `--dsw-focus-ring-width`: the focus ring follows
//     `--dsw-alias-state-business-primary` automatically (which this layer covers),
//     and the pointer-modality code sets `--dsw-focus-ring-color: transparent`
//     inline; overriding it would break that.
//   - `--dsw-menu-backdrop-filter` / `--dsw-mask-blur`: backdrop filters, not colours
//   - terminal ANSI 16 colours, brand/file-icon artwork, darwin gradients
//     (the pre-Client boot paint is no longer a gap: the Host half injects the
//     palette through `webserver/index-inject` before this layer loads; see
//     docs/design.md §5 "首帧注入" / §12)
//   - `--dsh-*` geometry/font variables (scrollbar width, font sizes, font families)
//
// ---------------------------------------------------------------------------
// Mapping strategies (three layers, docs/design.md §4)
// ---------------------------------------------------------------------------
// 1. static ramps: the DSH primitives are one absolute scale (00 = white ...
//    1000 = black, identical in both schemes) with more steps than Everforest has
//    background colours. They are mapped by *luminance anchor*: each DSH colour is
//    placed at `t = 1 - relativeLuminance(dshColour)` on a scheme-specific
//    Everforest ramp, so a DSH step never maps 1:1 onto an Everforest step.
//    - neutrals: ramp passes through the scheme's bg0 → bg5 → ink/dark anchors
//      (light: bg0 → bg5 → fg; dark: fg → bg5 → bgDim).
//    - hues (blue/deepseek/green/red/amber): ramp passes through the scheme's
//      tint → fg hue → dark tint; the level order of each family provides `t`.
//    - the four alpha statics get 8-digit hex values (alpha green/red).
// 2. alias / specific / shiki: explicit semantic mapping to Everforest roles per
//    docs/design.md §4 (bg layers, sidebar = one ramp step off bg0, labels,
//    borders = bg5 alpha, brand = header-aqua, link = header-blue, states,
//    diff = bg_green/bg_red + green/red, masks, menu materials, brand
//    foreground = bg0, tooltip/toast = inverted surfaces, ...).
//    No alias relies on automatic following: all 206 tokens are explicit.
// 3. contrast guard for text-bearing light surfaces: DSH light layers are all
//    #fff natively and Everforest Enchanted uses a flat background, but the
//    upstream light·soft ramp is darker. Text-bearing surfaces therefore blend
//    25% toward bg0 in the light scheme, and a deterministic contrast guard
//    (`readableSurface`) mixes a surface toward its scheme background anchor until
//    label-primary text reaches 4.5:1 (WCAG AA). See docs/reference/contrast.md.
//
// Everything is rule/data driven: no 206 hand-written output hex values.

import {
  DEFAULT_STATE,
  STRENGTHS,
  resolvePalette
} from './palette.js'
import { alpha, contrastRatio, interpolateRamp, mix } from './color.js'

/** Minimum contrast for surfaces that carry `--dsw-alias-label-primary` text. */
const SURFACE_CONTRAST_TARGET = 4.5

/** How far light-scheme text surfaces are blended toward bg0 (flat-style baseline). */
const LIGHT_SURFACE_MIX = 0.25

/* ------------------------------------------------------------------ *
 * Palette helpers: one resolved palette record per scheme
 * ------------------------------------------------------------------ */

const SCHEME_NAMES = ['light', 'dark']
/** Scheme order used by tokensFor (light first, matching the DSH sheet order). */
const SCHEMES = SCHEME_NAMES

/** `p` = { scheme, strength, ramp, fg } from `resolvePalette(state)`. */

/** The lightest palette role of the scheme (contrast-friendly anchor). */
function lightAnchor (p) {
  return p.scheme === 'light' ? p.ramp.bg0 : p.fg.fg
}

/** The darkest palette role of the scheme. */
function darkAnchor (p) {
  return p.scheme === 'light' ? p.fg.fg : p.ramp.bgDim
}

/** Blend toward the scheme's light anchor (light: bg0, dark: fg). */
function lift (p, color, amount) {
  return mix(color, lightAnchor(p), amount)
}

/** Blend toward the scheme's dark anchor (light: fg, dark: bgDim). */
function deepen (p, color, amount) {
  return mix(color, darkAnchor(p), amount)
}

/** Blend toward the scheme's base background (a tint behind text). */
function tint (p, color, amount) {
  return mix(color, p.ramp.bg0, amount)
}

/**
 * Light scheme background ramp step; dark scheme uses the upstream value.
 * The light blend is a deliberate contrast correction (docs/reference/contrast.md).
 */
function rampSurface (p, step) {
  const upstream = p.ramp[`bg${step}`]
  return p.scheme === 'light'
    ? mix(p.ramp.bg0, upstream, LIGHT_SURFACE_MIX)
    : upstream
}

/**
 * Deterministic contrast guard for surfaces that carry label-primary text:
 * nudge the surface toward a lighter anchor until the primary label reaches
 * WCAG AA (4.5:1). `readableSurface` moves toward `bg0` (the scheme's lightest
 * colour); the chat bubble moves toward white instead, because moving toward
 * the warm canvas would erase the tint that makes it recognizable (see
 * `bubbleSurface`). Leaves the input untouched when it already passes, so most
 * tokens keep their exact design value.
 * @param {{ scheme: string, ramp: object, fg: object }} p
 * @param {string} color
 * @param {string} toward - colour mixed in until the text target is met.
 * @returns {string}
 */
function readableToward (p, color, toward) {
  if (contrastRatio(p.fg.fg, color) >= SURFACE_CONTRAST_TARGET) return color
  for (let weight = 0.02; weight <= 1.0001; weight += 0.02) {
    const candidate = mix(color, toward, weight)
    if (contrastRatio(p.fg.fg, candidate) >= SURFACE_CONTRAST_TARGET) return candidate
  }
  return toward
}

/**
 * Contrast guard toward the scheme background (`bg0`), the anchor with the
 * highest primary-text contrast in both schemes.
 * @param {{ scheme: string, ramp: object, fg: object }} p
 * @param {string} color
 * @returns {string}
 */
function readableSurface (p, color) {
  return readableToward(p, color, p.ramp.bg0)
}

/** A text-bearing background surface at ramp depth `step` (1-3). */
function surface (p, step) {
  return readableSurface(p, rampSurface(p, step))
}

/** How far the sidebar surface is blended from bg0 toward bg1. */
const SIDEBAR_STEP_MIX = 0.8

/**
 * Sidebar column surface (`--dsw-specific-sidebar-fill`).
 *
 * DSH paints three things with this token — the sidebar column, the Windows
 * titlebar strip and the frame behind the content card — while the content card
 * itself is `--dsw-alias-bg-base` (bg0) with a 16px top-left radius. Mapping
 * both to bg0 erased that edge, so an Everforest window had no sidebar/content
 * boundary at all (2026-10-18 visual report). The sidebar is therefore one
 * deliberate ramp step off the content: bg0 blended 80% toward bg1 — slightly
 * darker paper in light, slightly lighter panel in dark, the same direction as
 * DSH's native sidebar values.
 *
 * Every sidebar text role (nav labels, session titles, section headers) is
 * `label-primary`, so the surface goes through the same contrast guard as the
 * other text-bearing surfaces (WCAG AA 4.5:1; in light·soft that caps the step
 * at roughly two thirds of the raw blend).
 *
 * @param {{ scheme: string, ramp: object, fg: object }} p
 * @returns {string}
 */
function sidebarSurface (p) {
  return readableSurface(p, mix(p.ramp.bg0, p.ramp.bg1, SIDEBAR_STEP_MIX))
}

/** How far the tinted light chat bubble is mixed from bg0 toward header-aqua. */
const BUBBLE_TINT_MIX = 0.16

/**
 * How far the raised (light·soft) bubble moves from white toward the scheme's
 * green ink. A plain (or barely aqua-tinted) white read as "the chat bubble turned
 * white" on the warm light·soft canvas (2026-10-21 user report), so the raised
 * branch is a pale sage paper instead.
 */
const BUBBLE_RAISED_MIX = 0.13

/**
 * Chat user-message bubble (`--dsw-specific-bubble`).
 *
 * DSH paints user messages with this token and `label-primary` ink (chat
 * `MessageItem.module.css`: `.bubble { background: var(--dsw-specific-bubble); color: var(--dsw-alias-label-primary) }`).
 * Mapping it to `surface(p, 1)` produced #FDFAEE against the light canvas
 * #FFFBEF — 1.02:1, i.e. effectively invisible (2026-10-19 visual report:
 * "聊天气泡和背景融为一体了"). The native light bubble is not a neutral ramp
 * step either: it is a pale blue tint (`static-deepseek-50` on white).
 *
 * The Everforest analogue is a sage tint of `header-aqua` on the canvas. The
 * bubble carries primary text, so the 4.5:1 gate applies on top: in light·hard
 * and light·medium the tint can darken to ~1.17 / 1.14:1 from bg0 while
 * keeping the ink at 4.6:1. In light·soft `bg0` is already 4.66:1 from the ink,
 * so a darker tint would fail the gate; there the bubble flips to the raised
 * direction — a pale sage paper (white pulled toward the scheme green) rather
 * than the previous stark near-white. It keeps the ink at ~4.9:1; the canvas
 * boundary is ~1.06:1 instead of 1.15:1, which is an accepted trade-off: the
 * green-vs-warm-cream hue difference carries the separation the luminance step
 * no longer does (the bubble gate is relaxed to 1.05 for light·soft).
 *
 * Dark keeps the existing `bg1` step (1.14–1.16:1 from bg0, ink ≥5.7:1).
 * @param {{ scheme: string, strength: string, ramp: object, fg: object }} p
 * @returns {string}
 */
function bubbleSurface (p) {
  if (p.scheme === 'dark') return surface(p, 1)
  const tinted = readableToward(p, mix(p.ramp.bg0, p.fg.headerAqua, BUBBLE_TINT_MIX), '#ffffff')
  const raised = mix('#ffffff', p.fg.green, BUBBLE_RAISED_MIX)
  return contrastRatio(p.ramp.bg0, tinted) >= contrastRatio(p.ramp.bg0, raised) ? tinted : raised
}

/** Code-block / markdown background (Everforest `bg_dim`; contrast guarded). */
function codeSurface (p) {
  const upstream = p.scheme === 'light'
    ? mix(p.ramp.bg0, p.ramp.bgDim, LIGHT_SURFACE_MIX)
    : p.ramp.bgDim
  return readableSurface(p, upstream)
}

/**
 * Inline-code chip background (`--dsw-alias-markdown-inline-code`).
 *
 * DSH uses this token as a *background*: the markdown stylesheet applies
 * `background-color: var(--dsw-alias-markdown-inline-code)` to `:not(pre) > code`,
 * so the chip text is the inherited `label-primary` ink. It is NOT Enchanted's
 * `--code-inline`, which is a blue *foreground* colour. Mapping the token to
 * `fg.blue` therefore produced a saturated blue block with dark text
 * (1.65:1 in light, 1.29:1 in dark) — the visible "loud chip" defect.
 *
 * The Everforest analogue of a code tint is `bg_blue` in the light scheme
 * (pale mint, the palette's dedicated background for blue-coded content). The
 * contrast guard keeps the inherited primary text at WCAG AA; the light value
 * differs per strength because `bgBlue` moves with the ramp.
 *
 * The dark scheme starts from `bgDim` (2026-10-24 user report, compared with
 * Enchanted's rendered inline code): `bgBlue` sits a ramp step *above* the dark
 * canvas, so the chip read as a raised slate block instead of a recess. Plain
 * `bgDim` (the palette's deep code surface, below `bg0`) matched the Enchanted
 * look but then read a little too deep on screen, so it is lifted slightly
 * toward `bg0`: close enough to the canvas to stay a subtle recess, still
 * clearly below it. Enchanted supplies the blue cue through the color-mode
 * foreground (`--everforest-color-inline-code`), so the chip needs no blue tint.
 */
const DARK_INLINE_CHIP_LIFT = 0.3

function inlineCodeSurface (p) {
  const upstream = p.scheme === 'dark'
    ? mix(p.ramp.bgDim, p.ramp.bg0, DARK_INLINE_CHIP_LIFT)
    : p.ramp.bgBlue
  return readableSurface(p, upstream)
}

/**
 * Dark scheme diff tint: how far those ramp colours move back toward the canvas.
 *
 * DSH's `FileDiff` paints added/deleted lines with the plain ramp colour and
 * inherits `label-primary` for the code text. In dark·soft that stripe is a fairly
 * light green under the near-white ink (4.52:1) — and the line-number gutter was
 * lifted toward the ink on top of it (`#797e6e`, numbers at 2.1:1), which reads as
 * "light green background with white text" (2026-10-21 visual report). Pulling the
 * tint toward `bg0` keeps the stripe recognisable while making both text families
 * clearly readable.
 */
const DARK_DIFF_MIX = 0.4

/**
 * Light scheme diff tint: `bg0` pulled toward the scheme's green / red ink until
 * the label-primary target is met, so the stripe is as visible as the text
 * requirement allows. The previous `bg0` → `bg_green` blend landed within
 * ~1.01:1 of the code canvas (light·hard / light·soft), i.e. the added and
 * deleted lines were indistinguishable from the surrounding code (2026-10-21
 * visual report: "浅色模式的绿色背景太不明显了").
 *
 * light·soft is the exception: its code canvas already sits exactly on the
 * 4.5:1 label gate, so a 4.5:1 stripe is indistinguishable from the canvas. The
 * stripe is allowed 4.1:1 there to stay visible (user-approved 2026-10-21: "浅色
 * soft 还是偏浅"); the code text still measures ≥4.1:1 and every other variant
 * keeps the full 4.5:1.
 */
const LIGHT_DIFF_TARGET = 4.5
const LIGHT_SOFT_DIFF_TARGET = 4.1

function lightDiffSurface (p, ink) {
  const target = p.strength === 'soft' ? LIGHT_SOFT_DIFF_TARGET : LIGHT_DIFF_TARGET
  let candidate = mix(p.ramp.bg0, ink, 0.02)
  for (let weight = 0.04; weight <= 1.0001; weight += 0.02) {
    const next = mix(p.ramp.bg0, ink, weight)
    if (contrastRatio(p.fg.fg, next) < target) break
    candidate = next
  }
  return candidate
}

/** Diff tint background; `rampKey` picks the dark-scheme ramp, `ink` the light tint. */
function diffSurface (p, rampKey, ink) {
  // The light band already stops at its own label target (4.5, or 4.1 in
  // light·soft); running it through `readableSurface` again would pull it back
  // to the 4.5 guard and erase the light·soft exception.
  if (p.scheme === 'light') return lightDiffSurface(p, ink)
  return readableSurface(p, mix(p.ramp[rampKey], p.ramp.bg0, DARK_DIFF_MIX))
}

/**
 * Diff line-number gutter: one step away from the line tint in the direction the
 * scheme uses for depth — lighter in light, darker in dark. Native DSH does the
 * same (light `#edf7ed` on `#e6f4e7`; dark `#132016` on `#1f3124`); lifting the
 * dark gutter toward the scheme ink made it *lighter* than the stripe and pushed
 * the green line numbers down to ~2.1:1.
 */
function diffGutter (p, surface) {
  return p.scheme === 'light' ? lift(p, surface, 0.35) : deepen(p, surface, 0.35)
}

/** Border colour: Enchanted semantics = `bg5` + alpha (docs/design.md §4). */
function border (p, ratio) {
  return alpha(p.ramp.bg5, ratio)
}

/** Menu / floating-panel material fill: `bg2` + 94% opacity. */
function menuFill (p) {
  return alpha(surface(p, 2), 0.94)
}

/** Inverted (dark) surface used by toast / tooltip in both schemes. */
function invertedSurface (p) {
  return p.scheme === 'light' ? p.fg.fg : p.ramp.bgDim
}

/** Label colour for inverted surfaces (light ink on the dark surface). */
function invertedLabel (p) {
  return p.scheme === 'light' ? p.ramp.bg0 : p.fg.fg
}

/**
 * Contrast ink for `--dsw-alias-label-primary-inverted`: DSH pairs this token with
 * `--dsw-alias-label-primary` (sidebar build badge: colour=inverted, background=primary),
 * `--dsw-alias-button-contrast-fill` (attachment remove button) and the brand mark.
 * It therefore has to be the INVERSE of the scheme's ink, not the ink itself:
 * light scheme → near-white, dark scheme → the deep background ink. Verified against
 * the real DSH CSS pairings in scripts/check-contrast.mjs.
 */
function contrastInk (p) {
  return p.scheme === 'light' ? p.ramp.bg0 : p.ramp.bgDim
}

/** `color-mix(in srgb, <color> <percent>%, transparent)`. */
function transparentMix (color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/** Transparent end of a gradient (same hue, zero alpha). */
function fade (color) {
  return alpha(color, 0)
}

/* ------------------------------------------------------------------ *
 * Layer 1a: static neutral ramps (luminance anchored)
 * ------------------------------------------------------------------ */

/**
 * Luminance position of every neutral DSH static token: `t = 1 - relativeLuminance`
 * of its declared light value (from docs/reference/token-inventory.json), rounded to
 * 4 decimals. 0 = white end, 1 = black end. This is the "luminance anchor" that
 * prevents a step-by-step mapping of the 16/19-step DSH ramps onto Everforest's
 * 6-step background ramps.
 * @type {Readonly<Record<string, number>>}
 */
const STATIC_NEUTRAL_ANCHORS = Object.freeze({
  '--dsw-static-neutral-00': 0,
  '--dsw-static-neutral-50': 0.044,
  '--dsw-static-neutral-100': 0.0869,
  '--dsw-static-neutral-150': 0.1531,
  '--dsw-static-neutral-200': 0.2165,
  '--dsw-static-neutral-250': 0.2843,
  '--dsw-static-neutral-300': 0.3416,
  '--dsw-static-neutral-400': 0.6301,
  '--dsw-static-neutral-500': 0.7777,
  '--dsw-static-neutral-550': 0.8647,
  '--dsw-static-neutral-600': 0.9093,
  '--dsw-static-neutral-700': 0.9547,
  '--dsw-static-neutral-800': 0.9778,
  '--dsw-static-neutral-850': 0.9847,
  '--dsw-static-neutral-900': 0.9952,
  '--dsw-static-neutral-1000': 1,
  '--dsw-static-neutral-bluish-00': 0,
  '--dsw-static-neutral-bluish-50': 0.0452,
  '--dsw-static-neutral-bluish-60': 0.0796,
  '--dsw-static-neutral-bluish-75': 0.1061,
  '--dsw-static-neutral-bluish-100': 0.1478,
  '--dsw-static-neutral-bluish-150': 0.1627,
  '--dsw-static-neutral-bluish-200': 0.2178,
  '--dsw-static-neutral-bluish-300': 0.3529,
  '--dsw-static-neutral-bluish-400': 0.5581,
  '--dsw-static-neutral-bluish-500': 0.6655,
  '--dsw-static-neutral-bluish-600': 0.7666,
  '--dsw-static-neutral-bluish-700': 0.8689,
  '--dsw-static-neutral-bluish-750': 0.9406,
  '--dsw-static-neutral-bluish-800': 0.9632,
  '--dsw-static-neutral-bluish-850': 0.9747,
  '--dsw-static-neutral-bluish-875': 0.9831,
  '--dsw-static-neutral-bluish-900': 0.989,
  '--dsw-static-neutral-bluish-950': 0.9924,
  '--dsw-static-neutral-bluish-1000': 0.9944
})

/**
 * Neutral ramp stops per scheme. The anchors are real Everforest roles:
 * light: bg0 (bright) → bg5 (border) → fg (ink); dark: fg (text) → bg5 → bgDim.
 * @param {{ scheme: string, ramp: object, fg: object }} p
 */
function neutralStops (p) {
  return p.scheme === 'light'
    ? [
        { t: 0, color: p.ramp.bg0 },
        { t: 0.53, color: p.ramp.bg5 },
        { t: 1, color: p.fg.fg }
      ]
    : [
        { t: 0, color: p.fg.fg },
        { t: 0.82, color: p.ramp.bg5 },
        { t: 1, color: p.ramp.bgDim }
      ]
}

/* ------------------------------------------------------------------ *
 * Layer 1b: static colour families (hue ramps)
 * ------------------------------------------------------------------ */

/**
 * Ordered DSH static colour families (lightest → darkest, ordered by the declared
 * DSH luminance) plus the Everforest hue each family maps to. The position inside
 * the family provides `t` (0 = lightest tint, 1 = darkest shade); the ramp itself
 * passes through the scheme's tint / hue / dark anchors.
 * @type {Readonly<Record<string, { hue: string, levels: string[] }>>}
 */
const STATIC_COLOR_FAMILIES = Object.freeze({
  blue: {
    hue: 'blue',
    levels: ['50', '50p', '75', '100', '300', '400', '450', '500', '600', '800', '900', '950']
  },
  deepseek: {
    hue: 'blue',
    levels: ['50', '100', '200', '300', '400', '450', '500', '600', '700-delete', '800', '900']
  },
  green: {
    hue: 'green',
    levels: ['100', '400', '500', '900']
  },
  red: {
    hue: 'red',
    levels: ['50', '100', '400', '500', '600', '900']
  },
  amber: {
    hue: 'yellow',
    levels: ['100', '400', '500', '600', '900']
  }
})

/** Hue ramp stops: light tint → fg hue → dark tint (absolute luminance order). */
function hueStops (p, hue) {
  const light = lightAnchor(p)
  const dark = darkAnchor(p)
  return [
    { t: 0, color: mix(light, hue, 0.1) },
    { t: 0.35, color: mix(light, hue, 0.55) },
    { t: 0.55, color: hue },
    { t: 0.78, color: mix(hue, dark, 0.45) },
    { t: 1, color: mix(hue, dark, 0.8) }
  ]
}

/* ------------------------------------------------------------------ *
 * Layer 2: explicit alias / specific / shiki mapping
 * ------------------------------------------------------------------ */

/**
 * The 107 `--dsw-alias-*` colour tokens of the DSH 0.2.1-rc.2 ui-theme sheets.
 * Every entry is an explicit role mapping (docs/design.md §4); none relies on
 * static-token following.
 * @type {Record<string, (p: object) => string>}
 */
const ALIAS_TOKENS = {
  // Backgrounds / surfaces ---------------------------------------------------
  '--dsw-alias-bg-base': (p) => p.ramp.bg0,
  '--dsw-alias-bg-document-preview': (p) => surface(p, 1),
  // 40% selection keeps the upstream transparency semantics: an opaque value would
  // cover the document image behind the selection (docs/design.md §4 audit).
  '--dsw-alias-bg-document-selection': (p) => `color-mix(in srgb, ${p.ramp.bgVisual} 40%, transparent)`,
  '--dsw-alias-bg-layer-1': (p) => surface(p, 1),
  '--dsw-alias-bg-layer-2': (p) => surface(p, 2),
  '--dsw-alias-bg-layer-3': (p) => surface(p, 3),
  '--dsw-alias-bg-mask-1': (p) => alpha('#000000', p.scheme === 'light' ? 0.24 : 0.32),
  '--dsw-alias-bg-mask-2': (p) => alpha('#000000', p.scheme === 'light' ? 0.12 : 0.18),
  '--dsw-alias-bg-mask-3': (p) => alpha('#000000', p.scheme === 'light' ? 0.48 : 0.56),
  '--dsw-alias-bg-mask-drop': () => alpha('#ffffff', 0.7),
  '--dsw-alias-bg-mask-photo': (p) => alpha('#000000', p.scheme === 'light' ? 0.88 : 0.85),
  '--dsw-alias-bg-module-platform': (p) => surface(p, 2),
  '--dsw-alias-bg-multi-select': (p) => surface(p, 2),
  '--dsw-alias-bg-overlay': (p) => surface(p, 2),
  '--dsw-alias-bg-skeleton': (p) => (p.scheme === 'light' ? alpha('#000000', 0.04) : alpha('#ffffff', 0.06)),

  // Borders (Enchanted: border = bg5 alpha, hover = bg3) ----------------------
  '--dsw-alias-border-inverted': (p) => border(p, p.scheme === 'light' ? 0.28 : 0.1),
  '--dsw-alias-border-inverted2': (p) => border(p, p.scheme === 'light' ? 0.2 : 0.06),
  '--dsw-alias-border-l1': (p) => border(p, 0.45),
  '--dsw-alias-border-l2': (p) => border(p, 0.6),
  '--dsw-alias-border-l2-darkmode-thin': (p) => border(p, p.scheme === 'light' ? 0.45 : 0.3),
  '--dsw-alias-border-l3': (p) => border(p, 0.75),
  '--dsw-alias-border-l4': (p) => border(p, 0.9),

  // Brand / primary buttons (Enchanted: interactive-accent = header-aqua) -----
  '--dsw-alias-brand-primary': (p) => p.fg.headerAqua,
  '--dsw-alias-brand-primary-invert': (p) => p.ramp.bg0,
  // Upstream token name carries a duplicated suffix; keep the exact CSS variable.
  '--dsw-alias-brand-primary-new-colorprimary-new-color': (p) => p.fg.headerAqua,
  '--dsw-alias-brand-text': (p) => p.ramp.bg0,
  '--dsw-alias-button-contrast-fill': (p) => p.fg.fg,
  '--dsw-alias-button-elevated-fill': (p) => surface(p, 2),
  '--dsw-alias-button-floating-fill': (p) => surface(p, 2),
  '--dsw-alias-button-floating-hover': (p) => surface(p, 3),
  '--dsw-alias-button-ghost-active-border': (p) => border(p, 0.75),
  '--dsw-alias-button-ghost-active-fill': (p) => surface(p, 2),
  '--dsw-alias-button-ghost-active-hover': (p) => surface(p, 3),
  '--dsw-alias-button-info-fill': (p) => p.fg.headerBlue,
  '--dsw-alias-button-info-hover': (p) => lift(p, p.fg.headerBlue, 0.18),
  // "dimmed" primary: desaturate toward the surface instead of changing the hue.
  '--dsw-alias-button-primary-dimmed': (p) => mix(p.fg.headerAqua, surface(p, 2), 0.45),
  '--dsw-alias-button-primary-fill': (p) => p.fg.headerAqua,
  '--dsw-alias-button-primary-hover': (p) => p.fg.headerBlue,
  // Tool-bar material: bg2 + the upstream 45%-94% opacity range.
  '--dsw-alias-button-tool-bar-fill': (p) => alpha(surface(p, 2), 0.72),
  '--dsw-alias-button-tool-bar-fill-invisible': (p) => alpha(surface(p, 2), 0.45),
  '--dsw-alias-button-tool-bar-hover': (p) => alpha(surface(p, 2), 0.88),

  // Diff (Everforest: bg_green / bg_red surfaces, green / red markers) --------
  '--dsw-alias-code-diff-added': (p) => alpha(p.fg.green, 0.1),
  '--dsw-alias-code-diff-deleted': (p) => alpha(p.fg.red, 0.1),
  '--dsw-alias-file-diff-added-bg': (p) => diffSurface(p, 'bgGreen', p.fg.green),
  '--dsw-alias-file-diff-added-gutter': (p) => diffGutter(p, diffSurface(p, 'bgGreen', p.fg.green)),
  '--dsw-alias-file-diff-added-marker': (p) => p.fg.green,
  '--dsw-alias-file-diff-deleted-bg': (p) => diffSurface(p, 'bgRed', p.fg.red),
  '--dsw-alias-file-diff-deleted-gutter': (p) => diffGutter(p, diffSurface(p, 'bgRed', p.fg.red)),
  '--dsw-alias-file-diff-deleted-marker': (p) => p.fg.red,

  // Interactive feedback (subtle translucent overlays, as upstream) -----------
  '--dsw-alias-interactive-bg-active': (p) => alpha(p.ramp.bg5, 0.28),
  '--dsw-alias-interactive-bg-hover': (p) => alpha(p.ramp.bg5, 0.16),
  '--dsw-alias-interactive-bg-hover-accent': (p) => alpha(p.fg.headerAqua, 0.16),
  '--dsw-alias-interactive-bg-hover-danger': (p) => alpha(p.fg.headerRed, 0.12),
  '--dsw-alias-interactive-bg-hover-solid': (p) => surface(p, 2),

  // Labels -------------------------------------------------------------------
  '--dsw-alias-label-caption': (p) => mix(p.fg.grey2, p.ramp.bg0, 0.25),
  '--dsw-alias-label-deep-diving': (p) => p.fg.headerBlue,
  '--dsw-alias-label-deep-diving-shimmer': (p) => transparentMix(p.fg.headerBlue, 40),
  '--dsw-alias-label-dimmed': (p) => mix(p.fg.grey2, p.ramp.bg0, 0.55),
  '--dsw-alias-label-document-preview': (p) => p.fg.grey1,
  '--dsw-alias-label-primary': (p) => p.fg.fg,
  '--dsw-alias-label-primary-bluish': (p) => p.fg.headerBlue,
  '--dsw-alias-label-primary-dimmed': (p) => mix(p.fg.fg, p.ramp.bg0, 0.35),
  // Brand / primary-button foreground: bg0, not white (docs/design.md §4).
  '--dsw-alias-label-primary-foreground': (p) => p.ramp.bg0,
  // Contrast ink: paired with label-primary / button-contrast-fill / brand mark in
  // DSH (must invert against them, so dark scheme uses the deep background ink).
  '--dsw-alias-label-primary-inverted': (p) => contrastInk(p),
  '--dsw-alias-label-secondary': (p) => p.fg.grey1,
  '--dsw-alias-label-shimmer': (p) => transparentMix(p.fg.fg, 30),
  '--dsw-alias-label-tertiary': (p) => p.fg.grey2,

  // Links / markdown ---------------------------------------------------------
  '--dsw-alias-link': (p) => p.fg.headerBlue,
  '--dsw-alias-markdown-citation': (p) => surface(p, 2),
  '--dsw-alias-markdown-code-block': (p) => codeSurface(p),
  '--dsw-alias-markdown-code-block-banner': (p) => codeSurface(p),
  '--dsw-alias-markdown-code-segment-selected': (p) => surface(p, 1),
  '--dsw-alias-markdown-code-segment-unselected': (p) => codeSurface(p),
  // Inline code: a BACKGROUND token in DSH (`:not(pre) > code { background-color }`),
  // not Enchanted's foreground `--code-inline`; map to the `bg_blue` chip surface
  // so the inherited primary ink stays readable (docs/design.md §4 correction).
  '--dsw-alias-markdown-inline-code': (p) => inlineCodeSurface(p),
  '--dsw-alias-markdown-placeholder': (p) => surface(p, 2),
  '--dsw-alias-markdown-tag': (p) => surface(p, 3),

  // Menus / floating material ------------------------------------------------
  '--dsw-alias-menu-group-header-fill': (p) => alpha(surface(p, 2), 0.94),
  '--dsw-alias-menu-icon': (p) => p.fg.grey1,

  // Onboarding (accent + 3 gradient stops + 3 fills = 7 tokens) --------------
  '--dsw-alias-onboarding-accent': (p) => p.fg.headerAqua,
  '--dsw-alias-onboarding-card-fill': (p) => alpha(surface(p, 2), 0.8),
  '--dsw-alias-onboarding-checkbox-border': (p) => border(p, 0.45),
  '--dsw-alias-onboarding-secondary-fill': (p) => surface(p, 1),

  // Scrollbar ----------------------------------------------------------------
  '--dsw-alias-scrollbar-bg-l1': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.55),
  '--dsw-alias-scrollbar-bg-l2': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.55),
  '--dsw-alias-scrollbar-hover-l1': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.3),
  '--dsw-alias-scrollbar-hover-l2': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.3),

  // Settings cards -----------------------------------------------------------
  '--dsw-alias-settings-card-fill': (p) => surface(p, 2),
  '--dsw-alias-settings-card-stroke': (p) => border(p, 0.6),

  // States (Enchanted semantics; semantic colours keep the upstream low-contrast
  // character and are reported, not "fixed", in docs/reference/contrast.md) -----
  '--dsw-alias-state-business-primary': (p) => p.fg.blue,
  '--dsw-alias-state-business-tertiary': (p) => tint(p, p.fg.blue, 0.85),
  '--dsw-alias-state-error-primary': (p) => p.fg.red,
  '--dsw-alias-state-error-secondary': (p) => lift(p, p.fg.red, 0.25),
  '--dsw-alias-state-idle-primary': (p) => p.fg.grey2,
  '--dsw-alias-state-success-primary': (p) => p.fg.green,
  '--dsw-alias-state-success-secondary': (p) => lift(p, p.fg.green, 0.25),
  '--dsw-alias-state-success-tertiary': (p) => tint(p, p.fg.green, 0.82),
  '--dsw-alias-state-warn-label': (p) => mix(p.fg.yellow, p.fg.fg, 0.35),
  '--dsw-alias-state-warn-primary': (p) => p.fg.yellow,
  '--dsw-alias-state-warn-secondary': (p) => lift(p, p.fg.yellow, 0.25),
  '--dsw-alias-state-warn-tertiary': (p) => tint(p, p.fg.yellow, 0.85),

  // Inverted surfaces / misc -------------------------------------------------
  '--dsw-alias-switch-thumb': (p) => lightAnchor(p),
  '--dsw-alias-toast-bg': (p) => invertedSurface(p),
  '--dsw-alias-toast-label': (p) => invertedLabel(p),
  '--dsw-alias-tooltip-bg': (p) => invertedSurface(p),
  '--dsw-alias-tooltip-key-bg': (p) => mix(invertedSurface(p), lightAnchor(p), 0.25),
  '--dsw-alias-turn-trigger-bg': (p) => codeSurface(p),
  '--dsw-alias-turn-trigger-bg-hover': (p) => alpha(surface(p, 3), 0.85)
}

/** The 11 `--dsw-specific-*` colour tokens. @type {Record<string, (p: object) => string>} */
const SPECIFIC_TOKENS = {
  '--dsw-specific-bubble': (p) => bubbleSurface(p),
  '--dsw-specific-bubble-highlight': (p) => surface(p, 2),
  '--dsw-specific-input-major': (p) => surface(p, 1),
  '--dsw-specific-login-input': (p) => surface(p, 1),
  '--dsw-specific-menu': (p) => menuFill(p),
  '--dsw-specific-selector': (p) => surface(p, 2),
  '--dsw-specific-sidebar-fill': (p) => sidebarSurface(p),
  '--dsw-specific-sidebar-nav-item-active': (p) => surface(p, 2),
  '--dsw-specific-sidebar-nav-item-active-accent': (p) => alpha(p.fg.headerAqua, 0.2),
  '--dsw-specific-sidebar-nav-item-hover': (p) => surface(p, 1),
  '--dsw-specific-tip': (p) => surface(p, 2)
}

/**
 * The 11 Shiki tokens: 9 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`.
 * All explicit — `shiki.css` declares light values on `:root` and its
 * foreground/background reference body-level aliases (guaranteed-invalid cascade),
 * so alias inheritance cannot be used (docs/design.md §4 audit).
 * @type {Record<string, (p: object) => string>}
 */
const SHIKI_TOKENS = {
  '--shiki-background': (p) => codeSurface(p),
  '--shiki-foreground': (p) => p.fg.fg,
  '--shiki-token-comment': (p) => p.fg.grey1,
  '--shiki-token-constant': (p) => p.fg.purple,
  '--shiki-token-function': (p) => p.fg.green,
  '--shiki-token-keyword': (p) => p.fg.blue,
  '--shiki-token-link': (p) => p.fg.headerBlue,
  '--shiki-token-parameter': (p) => p.fg.orange,
  '--shiki-token-punctuation': (p) => p.fg.grey1,
  '--shiki-token-string': (p) => p.fg.yellow,
  '--shiki-token-string-expression': (p) => p.fg.yellow
}

/**
 * Six auxiliary tokens that are not part of the 206-token colour inventory but are
 * explicitly required by docs/design.md §4 (menu material, think gradients,
 * onboarding gradient stops). They are emitted with the same overlay.
 * @type {Record<string, (p: object) => string>}
 */
const AUXILIARY_TOKENS = {
  '--dsw-menu-surface-fill': (p) => menuFill(p),
  '--dsw-linear-gradient-think': (p) =>
    `linear-gradient(180deg, ${p.ramp.bg0} 20.19%, ${fade(p.ramp.bg1)} 100%)`,
  '--dsw-linear-think-select': (p) =>
    `linear-gradient(180deg, ${p.ramp.bg1} 20.19%, ${fade(p.ramp.bg1)} 100%)`,
  '--dsw-gradient-onboarding-violet-stops': (p) =>
    onboardingStops(p, p.fg.headerPurple, p.fg.headerBlue),
  '--dsw-gradient-onboarding-blue-stops': (p) =>
    onboardingStops(p, p.fg.headerBlue, p.fg.headerAqua),
  '--dsw-gradient-onboarding-cyan-stops': (p) =>
    onboardingStops(p, p.fg.headerAqua, p.fg.headerBlue)
}

/** Onboarding gradient stops: base accent → blended accent → tint → base accent. */
function onboardingStops (p, accent, secondary) {
  const bright = mix(accent, p.ramp.bg0, 0.55)
  return [
    `${accent} 33.102%`,
    `${mix(accent, secondary, 0.45)} 50.954%`,
    `${bright} 85.326%`,
    `${accent}`
  ].join(', ')
}

/* ------------------------------------------------------------------ *
 * Layer 1c: build the static token entries from the ramp definitions
 * ------------------------------------------------------------------ */

/**
 * Build the 77 static token expressions: 35 neutral entries (luminance anchored)
 * + 38 hue entries + 4 translucent static entries.
 * @returns {Array<[string, (p: object) => string]>}
 */
function buildStaticTokens () {
  const entries = []
  for (const [name, anchor] of Object.entries(STATIC_NEUTRAL_ANCHORS)) {
    entries.push([name, (p) => interpolateRamp(neutralStops(p), anchor)])
  }
  for (const [family, definition] of Object.entries(STATIC_COLOR_FAMILIES)) {
    const { hue, levels } = definition
    levels.forEach((level, index) => {
      const position = levels.length === 1 ? 0.5 : index / (levels.length - 1)
      const name = `--dsw-static-${family}-${level}`
      entries.push([name, (p) => interpolateRamp(hueStops(p, p.fg[hue]), position)])
    })
  }
  // The four translucent static tokens keep their own alpha values.
  entries.push(
    ['--dsw-static-green-500-a08', (p) => alpha(p.fg.green, 0.08)],
    ['--dsw-static-green-500-a12', (p) => alpha(p.fg.green, 0.12)],
    ['--dsw-static-red-400-a12', (p) => alpha(p.fg.red, 0.12)],
    ['--dsw-static-red-600-a08', (p) => alpha(p.fg.red, 0.08)]
  )
  return entries
}

/** All colour token entries, in a deterministic order. */
const TOKEN_ENTRIES = [
  ...buildStaticTokens(),
  ...Object.entries(ALIAS_TOKENS),
  ...Object.entries(SPECIFIC_TOKENS),
  ...Object.entries(SHIKI_TOKENS),
  ...Object.entries(AUXILIARY_TOKENS)
]

/**
 * The six auxiliary tokens emitted on top of the 206-token colour inventory
 * (docs/design.md §4 explicitly requires menu material, think gradients and the
 * onboarding gradient stops; they are not part of the 195 colour + 11 shiki count).
 * @type {string[]}
 */
export const AUXILIARY_TOKEN_NAMES = Object.freeze(Object.keys(AUXILIARY_TOKENS).sort())

/** Names emitted by `tokensFor`, sorted for a stable `TOKEN_COVERAGE.covered`. */
const COVERED_NAMES = TOKEN_ENTRIES.map(([name]) => name).sort()

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Validate / default the user state without throwing on legacy or missing input.
 * @param {{ light?: string, dark?: string }} [state]
 * @returns {{ light: string, dark: string }}
 */
function normalizeState (state) {
  const candidate = state !== null && typeof state === 'object' ? state : {}
  const pick = (scheme) => {
    const strength = candidate[scheme]
    return STRENGTHS.includes(strength) ? strength : DEFAULT_STATE[scheme]
  }
  return { light: pick('light'), dark: pick('dark') }
}

/**
 * Build the complete DSH token overlay for a palette state.
 * @param {{ light: 'hard' | 'medium' | 'soft', dark: 'hard' | 'medium' | 'soft' }} [state]
 * @returns {Record<string, { light: string, dark: string }>}
 */
export function tokensFor (state = DEFAULT_STATE) {
  const resolved = resolvePalette(normalizeState(state))
  const overlay = {}
  for (const [name, expression] of TOKEN_ENTRIES) {
    overlay[name] = {
      light: expression(resolved[SCHEMES[0]]),
      dark: expression(resolved[SCHEMES[1]])
    }
  }
  return overlay
}

/**
 * Token coverage bookkeeping for docs / startup diagnostics.
 * - `covered`: every CSS variable emitted by `tokensFor` (206 colour + 6 auxiliary)
 * - `uncovered`: native DSH tokens this layer intentionally leaves alone
 * @type {{ covered: string[], uncovered: string[] }}
 */
export const TOKEN_COVERAGE = Object.freeze({
  covered: Object.freeze(COVERED_NAMES),
  uncovered: Object.freeze([
    '--dsw-focus-ring-color',
    '--dsw-focus-ring-width',
    '--dsw-menu-backdrop-filter',
    '--dsw-shadow-lv1',
    '--dsw-shadow-lv1-blur',
    '--dsw-shadow-lv2',
    '--dsw-shadow-lv3',
    '--dsw-mask-blur',
    '--dsw-elevation-stroke',
    '--dsw-elevation-stroke-color',
    '--dsw-elevation-panel',
    '--dsw-elevation-prominent',
    '--dsw-elevation-soft',
    '--dsw-corner-shape',
    '--dsw-radius-*',
    '--dsw-font-*',
    '--dsh-*'
  ])
})

/**
 * A handful of *uncovered* native tokens used by the startup self-check: if DSH
 * renames or drops them the token stylesheet changed under us and the overlay may
 * be stale. Covered tokens are useless for this probe — their computed value is
 * never empty because the overlay sets them inline on `document.body`.
 *
 * `--dsw-focus-ring-color` is deliberately NOT probed even though it stays
 * uncovered: DSH declares it only on
 * `html[data-input-modality=pointer] body :focus-visible` (the pointer-modality
 * layer also sets it to `transparent` to hide the ring), never on `:root`, and
 * custom properties only inherit into `body` from an ancestor declaration.
 * `getComputedStyle(document.body).getPropertyValue('--dsw-focus-ring-color')`
 * is therefore always empty, so probing it warned on every startup even on a
 * healthy DSH build (false "this DSH version may have renamed them").
 * @type {string[]}
 */
export const SELF_CHECK_TOKENS = Object.freeze([
  '--dsw-focus-ring-width',
  '--dsw-menu-backdrop-filter',
  '--dsw-shadow-lv1',
  '--dsw-mask-blur',
  '--dsw-elevation-stroke-color'
])
