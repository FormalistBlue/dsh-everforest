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
//   82 `--dsw-static-*` colour tokens   (derived: luminance-anchored ramp interpolation)
//  114 `--dsw-alias-*` colour tokens    (explicit role mapping, see ALIAS_TOKENS)
//   10 `--dsw-specific-*` colour tokens (explicit role mapping)
//   11 `--shiki-*` tokens               (explicit; shiki.css light values on :root and
//                                        --shiki-foreground/background reference body-level
//                                        aliases, so alias inheritance cannot be relied on)
//   = 217 covered colour tokens (DSH 0.2.2-rc.1; 206 through 0.2.1-rc.5)
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
//    borders = bg5 alpha, brand / interaction accent = green, link = blue, states,
//    diff = bg_green/bg_red + green/red, masks, menu materials, brand
//    foreground = bg0, tooltip/toast = inverted surfaces, illustration artwork
//    = neutral luminance anchors, ...). No alias relies on automatic following:
//    all 217 tokens are explicit.
// 3. contrast guard for text-bearing light surfaces: DSH light layers are all
//    #fff natively and Everforest Enchanted uses a flat background, but the
//    upstream light·soft ramp is darker. Text-bearing surfaces therefore blend
//    25% toward bg0 in the light scheme, and a deterministic contrast guard
//    (`readableSurface`) mixes a surface toward its scheme background anchor until
//    label-primary text reaches 4.5:1 (WCAG AA). See docs/reference/contrast.md.
//
// Everything is rule/data driven: no hand-written output hex values.

import {
  DEFAULT_STATE,
  STRENGTHS,
  resolvePalette
} from './palette.js'
import { alpha, contrastRatio, interpolateRamp, mix } from './color.js'

/** Minimum contrast for surfaces that carry `--dsw-alias-label-primary` text. */
const SURFACE_CONTRAST_TARGET = 4.5

// The brand / primary-button floor (`--dsw-alias-label-primary-foreground` on a
// filled accent surface) is enforced by scripts/check-contrast.mjs (gate 4), not
// here: since 2026-11-08 the interaction accent is `statusline1` verbatim, so the
// light schemes sit at 2.00–2.32:1 by design (the reference tab does the same).

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
 * colour); the light chat bubble runs the same guard on its moss paper, and its
 * light·soft variant is raised from white instead (see `bubbleSurface`).
 * Leaves the input untouched when it already passes, so most tokens keep their
 * exact design value.
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

/**
 * The interaction accent of a variant: upstream Everforest `statusline1`
 * ("Menu Selection Background / Tab Line Label Background (active)"), the one
 * green the plugin paints every selected / active chrome surface with (send
 * button, selected session band, folder names, conversation title, dropdown
 * selection). Dark is `#A7C080` (identical to `green`), light is `#93B259`
 * (2026-11-08: the user cropped the same reference tab and asked for the
 * lighter green; `green` `#8DA101` looked olive).
 * @param {{ fg: object }} p
 * @returns {string}
 */
function interactionAccent (p) {
  return p.fg.statusline1
}

/**
 * Filled interaction accent (brand mark / primary + info buttons). These surfaces
 * carry the `bg0` ink (`--dsw-alias-label-primary-foreground`), and the accent is
 * used verbatim: `statusline1` sits at 2.00–2.32:1 on the light canvases (the
 * reference tab pairs cream ink with the same green) and 5.62–6.88:1 in the dark
 * schemes. 2026-11-08 third pass dropped the earlier deepen-toward-`fg` guard:
 * it kept light·soft at the 2.5:1 brand trade-off but pushed the fill off the
 * reference colour, which is exactly what the user asked to stop.
 * @param {{ scheme: string, ramp: object, fg: object }} p
 * @returns {string}
 */
function accentFill (p) {
  return interactionAccent(p)
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

/** How far the light chat bubble is blended from `bg_green` toward `bg5`. */
const BUBBLE_MOSS_MIX = 0.22

/**
 * How far the raised (light·soft) bubble moves from white toward the moss paper.
 *
 * light·soft's canvas is already at the 4.5:1 ink limit, so a darker moss would
 * fail AA; the bubble is raised instead. It is not near-white (the 2026-10-21
 * "the bubble turned white" report), but a pale moss paper.
 */
const BUBBLE_RAISED_MIX = 0.4

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
 * 2026-11-08: the user picked the "苔纸" direction (option C of the
 * `.tmp/bubble-demo` comparison) for the light scheme — Everforest's own
 * `bg_green` pulled toward `bg5` (a moss paper) instead of the old sage tint of
 * `header-aqua`. The bubble is a text-bearing surface, so the `label-primary`
 * gate still applies as the fallback: light·hard clears it with the raw moss
 * (4.54:1), light·medium is nudged toward `bg0` by `readableSurface` (~4.50:1),
 * and light·soft (whose `bg0` has only 4.66:1 of headroom) keeps the raised
 * branch — now white pulled toward the same moss instead of toward `fg.green`,
 * which keeps the green paper family while staying at 1.06:1 from the canvas
 * (the accepted light·soft trade-off, gate 1.05).
 *
 * The ink on top is a scoped derived colour (`src/chat-bubble.js`): deep pine
 * `#3E5647` in light, pale sage `#DAE2C7` in dark. The token itself keeps the
 * official ink readable, so the bubble stays AA even if that selector is lost on
 * a DSH upgrade.
 *
 * Dark keeps the existing `bg1` step (1.14–1.16:1 from bg0, ink ≥5.7:1); the
 * 2026-11-08 dark pick was "只换字色", i.e. no background change there.
 * @param {{ scheme: string, strength: string, ramp: object, fg: object }} p
 * @returns {string}
 */
function bubbleSurface (p) {
  if (p.scheme === 'dark') return surface(p, 1)
  const moss = mix(p.ramp.bgGreen, p.ramp.bg5, BUBBLE_MOSS_MIX)
  if (p.strength === 'soft') return mix('#ffffff', moss, BUBBLE_RAISED_MIX)
  return readableSurface(p, moss)
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

/**
 * How far the dark border ink is lifted from `bg5` toward `grey1`.
 * Enchanted paints Obsidian's borders as (nearly) opaque `bg5`; DSH instead uses
 * four translucent levels on much lighter, flatter dark surfaces. Measured on the
 * real window (2026-10-24 settings report): a settings card is
 * `.5px solid settings-card-stroke` over `settings-card-fill` (= `bg2`), and at
 * the upstream alphas that stroke sat only 1.29:1 above its own fill — the cards
 * dissolved into the page. See `borderInk` / `BORDER_ALPHAS`.
 */
const DARK_BORDER_LIFT = 0.2

/**
 * Border ink: Enchanted semantics = `bg5` (docs/design.md §4). The dark scheme
 * lifts that ink toward `grey1` because the Everforest dark ramp is compressed
 * (bg0 → bg5 spans only ~2.0:1) while the dark DSH surfaces are light enough that
 * the same alpha reads weaker than in light mode.
 */
function borderInk (p) {
  return p.scheme === 'light' ? p.ramp.bg5 : mix(p.ramp.bg5, p.fg.grey1, DARK_BORDER_LIFT)
}

/**
 * Border alpha per DSH level. Light keeps the Enchanted 45/60/75/90% scale; dark
 * runs one notch higher (2026-10-24, see `DARK_BORDER_LIFT`) so every border keeps
 * a visible step on `bg1` / `bg2` fills instead of only on `bg0`.
 * @type {Readonly<Record<'light' | 'dark', Readonly<Record<'l1' | 'l2' | 'l3' | 'l4' | 'thin', number>>>>}
 */
const BORDER_ALPHAS = Object.freeze({
  light: Object.freeze({ l1: 0.45, l2: 0.6, l3: 0.75, l4: 0.9, thin: 0.45 }),
  dark: Object.freeze({ l1: 0.6, l2: 0.78, l3: 0.9, l4: 1, thin: 0.45 })
})

/** Border colour for one DSH level (`l1`..`l4`, `thin`). */
function border (p, level) {
  return alpha(borderInk(p), BORDER_ALPHAS[p.scheme][level])
}

/** Border colour at an explicit alpha (the two inverted tokens). */
function borderTint (p, ratio) {
  return alpha(borderInk(p), ratio)
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
  '--dsw-static-neutral-bluish-55': 0.0716,
  '--dsw-static-neutral-bluish-60': 0.0796,
  '--dsw-static-neutral-bluish-75': 0.1061,
  '--dsw-static-neutral-bluish-90': 0.1314,
  '--dsw-static-neutral-bluish-100': 0.1478,
  '--dsw-static-neutral-bluish-150': 0.1627,
  '--dsw-static-neutral-bluish-200': 0.2178,
  '--dsw-static-neutral-bluish-300': 0.3529,
  '--dsw-static-neutral-bluish-310': 0.3624,
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
 * passes through the scheme's tint / hue / dark anchors. Families with too few
 * declared steps to span that ramp carry explicit `positions` instead of the
 * index-derived ones (violet: two saturated mid shades).
 * @type {Readonly<Record<string, { hue: string, levels: string[], positions?: number[] }>>}
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
  },
  violet: {
    hue: 'purple',
    levels: ['400', '600'],
    // Two declared steps only: index positions would stretch them across the
    // whole tint → shade ramp (pale pink → near-ink), while the DSH pair is a
    // saturated light/deep violet. Place them around the pure hue instead.
    positions: [0.5, 0.72]
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
 * Layer 1d: schedule empty-state illustration (neutral luminance anchors)
 * ------------------------------------------------------------------ */

/**
 * Luminance anchors for the six `--dsw-alias-illustration-*` tokens, in the same
 * `t = 1 - relativeLuminance` convention as the static neutral ramps.
 *
 * DSH paints the schedule page's empty-state artwork with neutral statics
 * (`neutral-bluish-55/90/310` in light, `850/700/750/600` in dark). Each alias is
 * mapped to the matching luminance position on the scheme's neutral ramp, which
 * preserves the artwork's tonal order — light: background < surface < backing /
 * detail; dark: detail < surface < backing < background — in Everforest neutrals.
 * The two derived aliases (`inset`, `shadow`) follow DSH: surface in light,
 * backing in dark.
 *
 * @type {Readonly<Record<'background' | 'surface' | 'backing' | 'detail', { light: number, dark: number }>>}
 */
const ILLUSTRATION_NEUTRAL_ANCHORS = Object.freeze({
  background: { light: 0.0716, dark: 0.9747 },
  surface: { light: 0.1314, dark: 0.8689 },
  backing: { light: 0.3624, dark: 0.9406 },
  detail: { light: 0.3624, dark: 0.7666 }
})

/**
 * Neutral ramp value for one illustration role in the active scheme.
 * @param {{ scheme: string, ramp: object, fg: object }} p
 * @param {'background' | 'surface' | 'backing' | 'detail'} role
 * @returns {string}
 */
function illustrationNeutral (p, role) {
  return interpolateRamp(neutralStops(p), ILLUSTRATION_NEUTRAL_ANCHORS[role][p.scheme])
}

/* ------------------------------------------------------------------ *
 * Layer 2: explicit alias / specific / shiki mapping
 * ------------------------------------------------------------------ */

/**
 * The 114 `--dsw-alias-*` colour tokens of the DSH 0.2.2-rc.1 ui-theme sheets
 * (0.2.1-rc.2 … rc.5 carried 107; 0.2.2-rc.1 adds the illustration family and
 * `state-done-primary`; see docs/design.md §12). Every entry is an explicit role
 * mapping (docs/design.md §4); none relies on static-token following.
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

  // Borders (Enchanted: border = bg5 alpha, hover = bg3; dark lifts the ink and
  // runs one level higher — 2026-10-24 settings visual report) ----------------
  '--dsw-alias-border-inverted': (p) => borderTint(p, p.scheme === 'light' ? 0.28 : 0.1),
  '--dsw-alias-border-inverted2': (p) => borderTint(p, p.scheme === 'light' ? 0.2 : 0.06),
  '--dsw-alias-border-l1': (p) => border(p, 'l1'),
  '--dsw-alias-border-l2': (p) => border(p, 'l2'),
  '--dsw-alias-border-l2-darkmode-thin': (p) => border(p, 'thin'),
  '--dsw-alias-border-l3': (p) => border(p, 'l3'),
  '--dsw-alias-border-l4': (p) => border(p, 'l4'),

  // Brand / primary buttons / interaction accent. The accent is the official
  // `fg.green` — upstream paints its own UI with this green (menu selection
  // background, active tab label, status-line mode indicator = `statusline1`,
  // which is the same color in the dark scheme). `fg.blue` keeps the text / info
  // roles (link, shiki keyword, inline-code chip); `fg.aqua` keeps the content
  // decorations (list markers, quote bar, hr) of the color mode.
  // 2026-10-24 accent trial moved these roles off Enchanted's muted `header-*`
  // pair. 2026-11-07: `button-info-fill` / `state-business-*` /
  // `label-primary-bluish` moved blue → accent (DSH paints the composer send
  // button and the active/selected + focus-ring states with the DeepSeek brand
  // blue roles); later the same day the user compared an official Everforest Vim
  // screenshot and the accent settled on `fg.green` instead of `fg.aqua`
  // (docs/design.md §21).
  '--dsw-alias-brand-primary': (p) => accentFill(p),
  '--dsw-alias-brand-primary-invert': (p) => p.ramp.bg0,
  // Upstream token name carries a duplicated suffix; keep the exact CSS variable.
  '--dsw-alias-brand-primary-new-colorprimary-new-color': (p) => accentFill(p),
  '--dsw-alias-brand-text': (p) => p.ramp.bg0,
  '--dsw-alias-button-contrast-fill': (p) => p.fg.fg,
  '--dsw-alias-button-elevated-fill': (p) => surface(p, 2),
  '--dsw-alias-button-floating-fill': (p) => surface(p, 2),
  '--dsw-alias-button-floating-hover': (p) => surface(p, 3),
  '--dsw-alias-button-ghost-active-border': (p) => border(p, 'l3'),
  '--dsw-alias-button-ghost-active-fill': (p) => surface(p, 2),
  '--dsw-alias-button-ghost-active-hover': (p) => surface(p, 3),
  '--dsw-alias-button-info-fill': (p) => accentFill(p),
  '--dsw-alias-button-info-hover': (p) => lift(p, accentFill(p), 0.18),
  // "dimmed" primary: desaturate toward the surface instead of changing the hue.
  '--dsw-alias-button-primary-dimmed': (p) => mix(accentFill(p), surface(p, 2), 0.45),
  '--dsw-alias-button-primary-fill': (p) => accentFill(p),
  '--dsw-alias-button-primary-hover': (p) => lift(p, accentFill(p), 0.18),
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

  // Interactive feedback (subtle translucent overlays). Upstream defines no
  // hover role and marks `bg5` "Not currently used", so the 2026-11-08 palette
  // review moved these overlays off `bg5`: they are a neutral wash of the ramp's
  // whitespace / separator step `bg4`. The selected menu item is no longer this
  // overlay either — `src/ui-accents.js` paints it with `statusline1` (upstream:
  // "Menu Selection Background").
  '--dsw-alias-interactive-bg-active': (p) => alpha(p.ramp.bg4, 0.8),
  '--dsw-alias-interactive-bg-hover': (p) => alpha(p.ramp.bg4, 0.5),
  '--dsw-alias-interactive-bg-hover-accent': (p) => alpha(interactionAccent(p), 0.16),
  '--dsw-alias-interactive-bg-hover-danger': (p) => alpha(p.fg.red, 0.12),
  '--dsw-alias-interactive-bg-hover-solid': (p) => surface(p, 2),

  // Labels -------------------------------------------------------------------
  // 2026-11-08 palette review (A9): upstream assigns `grey2` only to the cursor
  // line number and the inactive tab label, while `grey0` is the muted family
  // (line numbers / fold columns / concealed text / foreground UI elements).
  // DSH paints code line numbers with `label-tertiary`, so the muted family is
  // `grey0` here; `grey2` stays out of the token layer.
  '--dsw-alias-label-caption': (p) => mix(p.fg.grey0, p.ramp.bg0, 0.25),
  // "deep diving" is the running-turn status label in chat: an activity cue, so
  // it follows the interaction accent (2026-11-07: blue → aqua → green).
  '--dsw-alias-label-deep-diving': (p) => interactionAccent(p),
  '--dsw-alias-label-deep-diving-shimmer': (p) => transparentMix(interactionAccent(p), 40),
  '--dsw-alias-label-dimmed': (p) => mix(p.fg.grey0, p.ramp.bg0, 0.55),
  '--dsw-alias-label-document-preview': (p) => p.fg.grey1,
  '--dsw-alias-label-primary': (p) => p.fg.fg,
  // Inks the hero's "预览版" pill (`state-business-tertiary` tint below).
  '--dsw-alias-label-primary-bluish': (p) => interactionAccent(p),
  '--dsw-alias-label-primary-dimmed': (p) => mix(p.fg.fg, p.ramp.bg0, 0.35),
  // Brand / primary-button foreground: bg0, not white (docs/design.md §4).
  '--dsw-alias-label-primary-foreground': (p) => p.ramp.bg0,
  // Contrast ink: paired with label-primary / button-contrast-fill / brand mark in
  // DSH (must invert against them, so dark scheme uses the deep background ink).
  '--dsw-alias-label-primary-inverted': (p) => contrastInk(p),
  '--dsw-alias-label-secondary': (p) => p.fg.grey1,
  '--dsw-alias-label-shimmer': (p) => transparentMix(p.fg.fg, 30),
  '--dsw-alias-label-tertiary': (p) => p.fg.grey0,

  // Links / markdown ---------------------------------------------------------
  '--dsw-alias-link': (p) => p.fg.blue,
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
  '--dsw-alias-onboarding-accent': (p) => interactionAccent(p),
  '--dsw-alias-onboarding-card-fill': (p) => alpha(surface(p, 2), 0.8),
  '--dsw-alias-onboarding-checkbox-border': (p) => border(p, 'l1'),
  '--dsw-alias-onboarding-secondary-fill': (p) => surface(p, 1),

  // Scrollbar ----------------------------------------------------------------
  '--dsw-alias-scrollbar-bg-l1': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.55),
  '--dsw-alias-scrollbar-bg-l2': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.55),
  '--dsw-alias-scrollbar-hover-l1': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.3),
  '--dsw-alias-scrollbar-hover-l2': (p) => mix(p.ramp.bg5, p.ramp.bg0, 0.3),

  // Settings cards -----------------------------------------------------------
  '--dsw-alias-settings-card-fill': (p) => surface(p, 2),
  '--dsw-alias-settings-card-stroke': (p) => border(p, 'l2'),

  // Illustration artwork (schedule empty state; DSH maps these to neutral
  // statics, so the Everforest values are the same luminance positions on the
  // scheme's neutral ramp — see ILLUSTRATION_NEUTRAL_ANCHORS) -----------------
  '--dsw-alias-illustration-background': (p) => illustrationNeutral(p, 'background'),
  '--dsw-alias-illustration-backing': (p) => illustrationNeutral(p, 'backing'),
  '--dsw-alias-illustration-detail': (p) => illustrationNeutral(p, 'detail'),
  '--dsw-alias-illustration-inset': (p) => (p.scheme === 'light'
    ? illustrationNeutral(p, 'surface')
    : illustrationNeutral(p, 'backing')),
  '--dsw-alias-illustration-shadow': (p) => (p.scheme === 'light'
    ? illustrationNeutral(p, 'surface')
    : illustrationNeutral(p, 'backing')),
  '--dsw-alias-illustration-surface': (p) => illustrationNeutral(p, 'surface'),

  // States (Enchanted semantics; semantic colours keep the upstream low-contrast
  // character and are reported, not "fixed", in docs/reference/contrast.md) -----
  // `business` is the DeepSeek brand-blue role upstream (deepseek-500). DSH paints
  // active / selected / focus with it, so it follows the interaction accent
  // (`fg.green`, 2026-11-07); upstream also uses green for hint / menu-selection
  // states, so the accent and `state-success` share the same green on purpose.
  // The third-party `state-info-*` aliases ride along.
  '--dsw-alias-state-business-primary': (p) => interactionAccent(p),
  '--dsw-alias-state-business-tertiary': (p) => tint(p, interactionAccent(p), 0.85),
  // DSH's "done" state is violet, distinct from the success green.
  '--dsw-alias-state-done-primary': (p) => p.fg.purple,
  '--dsw-alias-state-error-primary': (p) => p.fg.red,
  '--dsw-alias-state-error-secondary': (p) => lift(p, p.fg.red, 0.25),
  '--dsw-alias-state-idle-primary': (p) => p.fg.grey0,
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

/** The 10 `--dsw-specific-*` colour tokens. @type {Record<string, (p: object) => string>} */
const SPECIFIC_TOKENS = {
  '--dsw-specific-bubble': (p) => bubbleSurface(p),
  '--dsw-specific-bubble-highlight': (p) => surface(p, 2),
  '--dsw-specific-input-major': (p) => surface(p, 1),
  '--dsw-specific-login-input': (p) => surface(p, 1),
  '--dsw-specific-menu': (p) => menuFill(p),
  '--dsw-specific-selector': (p) => surface(p, 2),
  '--dsw-specific-sidebar-fill': (p) => sidebarSurface(p),
  '--dsw-specific-sidebar-nav-item-active': (p) => surface(p, 2),
  '--dsw-specific-sidebar-nav-item-active-accent': (p) => alpha(interactionAccent(p), 0.2),
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
 * Six auxiliary tokens that are not part of the 217-token colour inventory but are
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
 * Build the 82 static token expressions: 38 neutral entries (luminance anchored)
 * + 40 hue entries + 4 translucent static entries.
 * @returns {Array<[string, (p: object) => string]>}
 */
function buildStaticTokens () {
  const entries = []
  for (const [name, anchor] of Object.entries(STATIC_NEUTRAL_ANCHORS)) {
    entries.push([name, (p) => interpolateRamp(neutralStops(p), anchor)])
  }
  for (const [family, definition] of Object.entries(STATIC_COLOR_FAMILIES)) {
    const { hue, levels, positions } = definition
    levels.forEach((level, index) => {
      const position = positions !== undefined
        ? positions[index]
        : levels.length === 1 ? 0.5 : index / (levels.length - 1)
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
 * The six auxiliary tokens emitted on top of the 217-token colour inventory
 * (docs/design.md §4 explicitly requires menu material, think gradients and the
 * onboarding gradient stops; they are not part of the 206 colour + 11 shiki count).
 * @type {string[]}
 */
export const AUXILIARY_TOKEN_NAMES = Object.freeze(Object.keys(AUXILIARY_TOKENS).sort())

/** Names emitted by `tokensFor`, sorted for a stable `TOKEN_COVERAGE.covered`. */
const COVERED_NAMES = TOKEN_ENTRIES.map(([name]) => name).sort()

/* ------------------------------------------------------------------ *
 * Third-party compatibility aliases (P0 static alias bridge)
 *
 * DSH exposes its colours as `--dsw-*` custom properties and third-party plugin
 * pages inherit them from `<body>`, so a plugin that uses the real token names
 * follows any theme automatically. Many published UI plugins instead guess the
 * alias naming grammar (`--dsw-alias-text-primary`, `--dsw-alias-bg-primary`,
 * `--dsw-alias-separator-primary`, …). Those names are not declared by DSH, so
 * the plugin's own light-mode fallback literals win
 * (`var(--dsw-alias-bg-primary, #fff)` → white cards on the dark theme) and the
 * page silently stays light.
 *
 * This bridge defines the guessed names with the value of the closest real
 * token. It is deliberately NOT part of `tokensFor`/`TOKEN_COVERAGE.covered`:
 * the official 217-token contract stays untouched, and the aliases are layered
 * on only where the override layer is built (the Client entry), so the bridge
 * can be removed in one place once upstream plugin fixes land.
 *
 * Rules for an entry:
 * - the alias must NOT be a real DSH token (a test pins this against
 *   `docs/reference/token-inventory.json`); if a future DSH version declares
 *   one, the startup probe in the Client entry drops it instead of shadowing
 *   the host's own value;
 * - the target must be emitted by `tokensFor` — values are copied, never
 *   `var()` indirection, so light/dark and the 6 palette strengths follow the
 *   theme exactly;
 * - only add names observed in the wild (2026-10-30 evaluation + market
 *   sample), and prefer an upstream plugin fix over widening this table.
 *
 * @type {Readonly<Record<string, string>>}
 */
const COMPAT_ALIASES = Object.freeze({
  // Text roles: DSH calls them `label-*`.
  '--dsw-alias-text-primary': '--dsw-alias-label-primary',
  '--dsw-alias-text-secondary': '--dsw-alias-label-secondary',
  '--dsw-alias-text-tertiary': '--dsw-alias-label-tertiary',
  '--dsw-alias-text-quaternary': '--dsw-alias-label-dimmed',
  '--dsw-alias-text-danger': '--dsw-alias-state-error-primary',
  '--dsw-alias-label': '--dsw-alias-label-primary',
  '--dsw-alias-label-error': '--dsw-alias-state-error-primary',
  '--dsw-alias-label-inverse': '--dsw-alias-label-primary-inverted',
  '--dsw-alias-label-quaternary': '--dsw-alias-label-dimmed',

  // Surfaces.
  '--dsw-alias-bg-primary': '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-subtle': '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-bg-l2': '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-hover': '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-bg-page-primary': '--dsw-alias-bg-base',
  '--dsw-alias-surface-overlay': '--dsw-alias-bg-overlay',
  '--dsw-alias-input-bg': '--dsw-alias-bg-layer-1',

  // Borders and separators.
  '--dsw-alias-hairline': '--dsw-alias-border-l1',
  '--dsw-alias-border': '--dsw-alias-border-l1',
  '--dsw-alias-border-subtle': '--dsw-alias-border-l1',
  '--dsw-alias-border-strong': '--dsw-alias-border-l2',
  '--dsw-alias-input-border': '--dsw-alias-border-l1',
  '--dsw-alias-separator': '--dsw-alias-border-l2',
  '--dsw-alias-separator-primary': '--dsw-alias-border-l2',

  // Interaction states.
  '--dsw-alias-interactive-bg-selected': '--dsw-alias-interactive-bg-active',
  '--dsw-alias-interactive-text-hover': '--dsw-alias-link',
  '--dsw-interactive-bg-hover': '--dsw-alias-interactive-bg-hover',
  '--dsw-specific-menu-item-hover': '--dsw-alias-interactive-bg-hover',

  // Brand / accent roles.
  '--dsw-alias-accent': '--dsw-alias-brand-primary',
  '--dsw-alias-accent-ink': '--dsw-alias-label-primary-foreground',
  '--dsw-alias-accent-soft': '--dsw-alias-bg-layer-2',
  '--dsw-alias-button-info-label': '--dsw-alias-label-primary-foreground',

  // Semantic states: DSH's names are `error` / `warn` / `business` / `success`.
  '--dsw-alias-danger': '--dsw-alias-state-error-primary',
  '--dsw-alias-state-danger-primary': '--dsw-alias-state-error-primary',
  '--dsw-alias-state-error': '--dsw-alias-state-error-primary',
  '--dsw-alias-state-error-tertiary': '--dsw-alias-state-error-secondary',
  '--dsw-alias-state-warning-primary': '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-info-primary': '--dsw-alias-state-business-primary',
  '--dsw-alias-state-info-soft': '--dsw-alias-state-business-tertiary',
  '--dsw-alias-state-ok-primary': '--dsw-alias-state-success-primary',
  '--dsw-alias-state-business-secondary': '--dsw-alias-state-business-tertiary',
  '--dsw-alias-state-focus-ring': '--dsw-alias-state-business-primary'
})

/** Compatibility alias names, sorted (diagnostics and startup probing). */
export const COMPAT_ALIAS_NAMES = Object.freeze(Object.keys(COMPAT_ALIASES).sort())

/**
 * Build the compatibility half of the token overlay from an official overlay.
 * Each alias copies its target's `{ light, dark }` pair, so aliases follow the
 * active strength and scheme exactly like the real token does.
 *
 * @param {Record<string, { light: string, dark: string }>} overlay - result of `tokensFor`.
 * @param {(name: string) => boolean} [isDeclared] - return true to drop an alias
 *   the host already declares (the Client entry probes DSH's computed values;
 *   tests can pass a set).
 * @returns {Record<string, { light: string, dark: string }>}
 */
export function compatAliasesFor (overlay, isDeclared = () => false) {
  const aliases = {}
  for (const [name, target] of Object.entries(COMPAT_ALIASES)) {
    if (isDeclared(name)) continue
    const pair = overlay[target]
    if (pair === undefined || typeof pair.light !== 'string' || typeof pair.dark !== 'string') {
      throw new Error(`compat alias ${name} points at ${target}, which tokensFor() does not emit`)
    }
    aliases[name] = { light: pair.light, dark: pair.dark }
  }
  return aliases
}

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
 * - `covered`: every CSS variable emitted by `tokensFor` (217 colour + 6 auxiliary)
 * - `uncovered`: native DSH tokens this layer intentionally leaves alone
 *
 * The third-party compatibility aliases (`compatAliasesFor`) are layered on by
 * the Client entry and are deliberately NOT counted here: they are not DSH
 * tokens, and this list is the authoritative "what Everforest covers".
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
