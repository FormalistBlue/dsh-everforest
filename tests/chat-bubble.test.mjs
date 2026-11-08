import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CHAT_BUBBLE_INK, chatBubbleStyles } from '../src/chat-bubble.js'
import { contrastRatio } from '../src/color.js'
import { SCHEMES, STRENGTHS } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANTS = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => ({ scheme, strength })))

test('chat bubble ink is the pinned 2026-11-08 pair', () => {
  // Light "苔纸" (option C) deep pine / dark "只换字色" (option F) pale sage.
  assert.deepEqual({ ...CHAT_BUBBLE_INK }, { light: '#3E5647', dark: '#DAE2C7' })
})

test('bubble ink rules stay scoped to the user message row', () => {
  const css = chatBubbleStyles()
  // Scope anchor is the always-on color-mode attribute on <html>.
  assert.ok(css.includes('html[data-everforest-color-mode="on"]'))
  // Scheme split follows DSH's own flag, like the color-mode sheet.
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  // The bubble is matched through the chat package's class-name fragments; the
  // `_userStack` ancestor keeps the tooltip bubble (`_bubble_44yfq_1`) out.
  assert.ok(css.includes('[class*="_userStack"]'))
  assert.ok(css.includes('[class*="_bubble"]'))
  assert.ok(!css.includes('!important'))
  assert.equal((css.match(/{/g) ?? []).length, 2, 'one rule per scheme')
  assert.ok(css.includes(CHAT_BUBBLE_INK.light))
  assert.ok(css.includes(CHAT_BUBBLE_INK.dark))
})

test('bubble ink clears AA on every bubble surface and beats the fallback ink', () => {
  // The token layer keeps label-primary readable on the bubble as a fallback, so
  // losing this stylesheet on a DSH upgrade must never drop the bubble below AA.
  for (const { scheme, strength } of VARIANTS) {
    const overlay = tokensFor({ light: strength, dark: strength })
    const bubble = overlay['--dsw-specific-bubble'][scheme]
    const ink = CHAT_BUBBLE_INK[scheme]
    assert.match(ink, /^#[0-9a-f]{6}$/i, `${scheme}: derived ink is opaque`)
    const ratio = contrastRatio(ink, bubble)
    assert.ok(ratio >= 4.5, `${scheme}-${strength}: ${ink} on ${bubble} = ${ratio.toFixed(2)} < 4.5`)
    const fallback = contrastRatio(overlay['--dsw-alias-label-primary'][scheme], bubble)
    assert.ok(fallback >= 4.5, `${scheme}-${strength}: fallback label-primary on ${bubble} = ${fallback.toFixed(2)} < 4.5`)
    assert.ok(ratio > fallback, `${scheme}-${strength}: derived ink must beat label-primary (${fallback.toFixed(2)})`)
  }
})
