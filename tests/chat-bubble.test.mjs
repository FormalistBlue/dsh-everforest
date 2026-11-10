import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CHAT_BUBBLE_DARK_FILL,
  CHAT_BUBBLE_DARK_INK,
  CHAT_BUBBLE_LIGHT_FILL,
  CHAT_BUBBLE_LIGHT_INK,
  CHAT_BUBBLE_SELECTOR,
  chatBubbleRole,
  chatBubbleStyles
} from '../src/chat-bubble.js'
import { contrastRatio } from '../src/color.js'
import { FOREGROUNDS, RAMPS, STRENGTHS } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANTS = ['light', 'dark'].flatMap((scheme) => STRENGTHS.map((strength) => ({ scheme, strength })))

test('bubble paint is the pinned 2026-11-10 selected-row pair in both schemes', () => {
  // 2026-11-10: the user asked the bubble to look like the selected sidebar row
  // in dark ("试试直接改成侧边栏选中那种绿色和文字颜色") and then in light
  // ("浅色气泡的也和侧边栏颜色保持一致"). A deep-ink experiment for long messages
  // was tried and reverted the same day ("文字还是换回白色吧"), so the light
  // bubble keeps the sidebar pair verbatim.
  assert.equal(CHAT_BUBBLE_LIGHT_FILL, '#93B259')
  assert.deepEqual({ ...CHAT_BUBBLE_LIGHT_INK }, { hard: '#FFFBEF', medium: '#FDF6E3', soft: '#F3EAD3' })
  assert.equal(CHAT_BUBBLE_DARK_FILL, '#A7C080')
  assert.deepEqual({ ...CHAT_BUBBLE_DARK_INK }, { hard: '#272E33', medium: '#2D353B', soft: '#333C43' })
  for (const { scheme, strength } of VARIANTS) {
    const role = chatBubbleRole(scheme, strength)
    assert.equal(role.fill, scheme === 'light' ? CHAT_BUBBLE_LIGHT_FILL : CHAT_BUBBLE_DARK_FILL)
    assert.equal(role.ink, scheme === 'light' ? CHAT_BUBBLE_LIGHT_INK[strength] : CHAT_BUBBLE_DARK_INK[strength])
  }
})

test('bubble paint is the accent layer pair (statusline1 fill + canvas bg0 ink)', () => {
  assert.equal(CHAT_BUBBLE_LIGHT_FILL, FOREGROUNDS.light.statusline1, 'light fill is the interaction accent')
  assert.equal(CHAT_BUBBLE_DARK_FILL, FOREGROUNDS.dark.statusline1, 'dark fill is the interaction accent')
  for (const strength of STRENGTHS) {
    assert.equal(CHAT_BUBBLE_LIGHT_INK[strength], RAMPS.light[strength].bg0, `light-${strength}: ink is the canvas bg0`)
    assert.equal(CHAT_BUBBLE_DARK_INK[strength], RAMPS.dark[strength].bg0, `dark-${strength}: ink is the canvas bg0`)
  }
  // The dark pair is AA (6.88 / 6.23 / 5.62 measured). The light pair is the
  // palette's cream-on-statusline1 ceiling (2.32 / 2.22 / 2.00, the §2i accent
  // trade-off) — the user chose it explicitly after testing deep ink.
  const lightFloors = { hard: 2.32, medium: 2.22, soft: 2.0 }
  const darkFloors = { hard: 6.88, medium: 6.23, soft: 5.62 }
  for (const strength of STRENGTHS) {
    const light = contrastRatio(CHAT_BUBBLE_LIGHT_INK[strength], CHAT_BUBBLE_LIGHT_FILL)
    assert.ok(light >= 1.95, `light-${strength}: ink on the accent fill = ${light.toFixed(2)} < 1.95`)
    assert.equal(Math.round(light * 100) / 100, lightFloors[strength], `light-${strength}: measured ink ratio`)
    const dark = contrastRatio(CHAT_BUBBLE_DARK_INK[strength], CHAT_BUBBLE_DARK_FILL)
    assert.ok(dark >= 5.6, `dark-${strength}: ink on the accent fill = ${dark.toFixed(2)} < 5.6`)
    assert.equal(Math.round(dark * 100) / 100, darkFloors[strength], `dark-${strength}: measured ink ratio`)
  }
})

test('bubble rules stay scoped to the user message row', () => {
  const css = chatBubbleStyles()
  // Scope anchors: the always-on color-mode attribute on <html>, DSH's own dark
  // theme flag on <body>, and the token layer's strength attributes.
  assert.ok(css.includes('html[data-everforest-color-mode="on"]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  for (const strength of STRENGTHS) {
    assert.ok(css.includes(`[data-everforest-light="${strength}"]`), `light-${strength} rule missing`)
    assert.ok(css.includes(`[data-everforest-dark="${strength}"]`), `dark-${strength} rule missing`)
  }
  // The bubble is matched through the chat package's class-name fragments; the
  // `_userStack` ancestor keeps the tooltip bubble (`_bubble_44yfq_1`) out.
  assert.equal(CHAT_BUBBLE_SELECTOR, '[class*="_userStack"] [class*="_bubble"]')
  assert.ok(css.includes('[class*="_userStack"]'))
  assert.ok(css.includes('[class*="_bubble"]'))
  assert.ok(!css.includes('!important'))
  assert.equal((css.match(/{/g) ?? []).length, VARIANTS.length, 'one rule per variant')
  // Nested session-reference chips restate their own colour token; the band ink
  // must be re-pointed at it inside every bubble subtree.
  assert.equal(
    (css.match(/--dsw-alias-state-business-primary/g) ?? []).length,
    VARIANTS.length,
    'every rule re-points the reference-chip ink token'
  )
  for (const { scheme, strength } of VARIANTS) {
    const { fill } = chatBubbleRole(scheme, strength)
    assert.ok(css.includes(fill), `${scheme}-${strength}: fill is painted`)
  }
})

test('losing the sheet falls back to the token layer, not to an unreadable band', () => {
  // The accent paint lives only in the sheet: the token keeps the moss paper
  // (light) / guarded bg1 step (dark), so the DSH-native `label-primary` ink
  // stays AA if the sheet is ever lost.
  for (const { scheme, strength } of VARIANTS) {
    const overlay = tokensFor({ light: strength, dark: strength })
    const bubble = overlay['--dsw-specific-bubble'][scheme]
    const fill = chatBubbleRole(scheme, strength).fill
    assert.notEqual(bubble, fill, `${scheme}-${strength}: token surface is not the accent fill`)
    const fallback = contrastRatio(overlay['--dsw-alias-label-primary'][scheme], bubble)
    assert.ok(fallback >= 4.5, `${scheme}-${strength}: fallback label-primary on ${bubble} = ${fallback.toFixed(2)} < 4.5`)
  }
  // The light token is still the moss paper from the 2026-11-08 review.
  assert.equal(tokensFor({ light: 'hard', dark: 'hard' })['--dsw-specific-bubble'].light, '#e7ead0')
})
