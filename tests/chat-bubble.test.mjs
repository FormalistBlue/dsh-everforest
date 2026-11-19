import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CHAT_BUBBLE_DARK_FILL,
  CHAT_BUBBLE_DARK_INK,
  CHAT_BUBBLE_LIGHT_FILL,
  CHAT_BUBBLE_LIGHT_INK,
  CHAT_BUBBLE_LINK_INK,
  CHAT_BUBBLE_LINK_SELECTOR,
  CHAT_BUBBLE_LINK_TOKEN,
  CHAT_BUBBLE_QUESTION_INK_STEP,
  CHAT_BUBBLE_QUESTION_INK_TOKEN,
  CHAT_BUBBLE_SELECTION_INK,
  CHAT_BUBBLE_SELECTORS,
  chatBubbleQuestionInk,
  chatBubbleRole,
  chatBubbleStyles
} from '../src/chat-bubble.js'
import { contrastRatio, labLightness, mix } from '../src/color.js'
import { FOREGROUNDS, RAMPS, STRENGTHS } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANTS = ['light', 'dark'].flatMap((scheme) => STRENGTHS.map((strength) => ({ scheme, strength })))

test('bubble paint is the pinned 2026-11-10 selected-row pair in both schemes', () => {
  // 2026-11-10: the user asked the bubble to look like the selected sidebar row
  // in dark ("试试直接改成侧边栏选中那种绿色和文字颜色") and then in light
  // ("浅色气泡的也和侧边栏颜色保持一致"). Both schemes therefore use the accent fill
  // with the scheme canvas `bg0` as ink. 2026-11-15 review: a deep light ink was
  // landed off a demo and withdrawn at the user's request (design §45).
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

test('bubble paint is the accent layer pair (statusline1 fill + the canvas ink)', () => {
  assert.equal(CHAT_BUBBLE_LIGHT_FILL, FOREGROUNDS.light.statusline1, 'light fill is the interaction accent')
  assert.equal(CHAT_BUBBLE_DARK_FILL, FOREGROUNDS.dark.statusline1, 'dark fill is the interaction accent')
  for (const strength of STRENGTHS) {
    assert.equal(CHAT_BUBBLE_LIGHT_INK[strength], RAMPS.light[strength].bg0, `light-${strength}: ink is the canvas bg0`)
    assert.equal(CHAT_BUBBLE_DARK_INK[strength], RAMPS.dark[strength].bg0, `dark-${strength}: ink is the canvas bg0`)
  }
  // Dark is a real AA pair (6.88 / 6.23 / 5.62); light is the accent layer's
  // documented cream ceiling (2.32 / 2.22 / 2.00) with its 1.95 floor.
  const lightFloors = { hard: 2.32, medium: 2.22, soft: 2.00 }
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

test('bubble rules cover every surface DSH paints a user message on', () => {
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
  // One primitive, three anchors (2026-11-15): the chat row (`_userStack`), the
  // answered question card (`QuestionReplyView` renders the same
  // `UserMessageBubble` outside that stack, so it kept the moss-paper token) and
  // the `/goal` command echo (DSH: "the command echo is a user message"). The
  // `_bubble` fragment still keeps the portaled tooltip bubble out; the reply
  // card's `_bubbleWidth` wrapper is excluded so the paint lands on the rounded
  // bubble, not on that square full-width box (2026-11-15 regression report).
  assert.deepEqual([...CHAT_BUBBLE_SELECTORS], [
    '[class*="_userStack"] [class*="_bubble"]',
    '[data-question-reply] [class*="_bubble"]:not([class*="_bubbleWidth"])',
    '[data-command-input] [class*="_bubble"]'
  ])
  for (const selector of CHAT_BUBBLE_SELECTORS) {
    assert.ok(css.includes(selector), `${selector}: anchor is painted`)
    // Each anchor has to carry the variant scope itself: a comma list after one
    // scope would only scope the first selector.
    assert.equal(
      css.split(selector).length - 1,
      VARIANTS.length * 3,
      `${selector}: paint + selection + link rule per variant`
    )
  }
  assert.ok(!css.includes('!important'))
  // Three rules per variant since 2026-11-19: the accent paint (with the muted
  // question token and the link token), its bubble-scoped `::selection`, and the
  // link rule. The question paper that used to add a rule per variant is gone —
  // the card is one surface.
  assert.equal((css.match(/{/g) ?? []).length, VARIANTS.length * 3, 'paint + selection + link per variant')
  assert.equal(
    (css.match(/::selection/g) ?? []).length,
    VARIANTS.length * CHAT_BUBBLE_SELECTORS.length,
    'every bubble anchor is covered by the selection rule'
  )
  // Nested session-reference chips restate their own colour token, and the
  // question-reply card paints its question line with the muted label token; the
  // paint rule re-points both inside every bubble subtree.
  assert.equal(
    (css.match(/--dsw-alias-state-business-primary/g) ?? []).length,
    VARIANTS.length,
    'every rule re-points the reference-chip ink token'
  )
  assert.equal(CHAT_BUBBLE_QUESTION_INK_TOKEN, '--dsw-alias-label-secondary')
  assert.equal(
    (css.match(new RegExp(`  ${CHAT_BUBBLE_QUESTION_INK_TOKEN}:`, 'g')) ?? []).length,
    VARIANTS.length,
    'every rule re-points the muted question ink'
  )
  // The canvas link ink (`--dsw-alias-link`) collapses on the accent fill, so the
  // paint rule re-points it inside the bubble subtree (2026-11-19).
  assert.equal(CHAT_BUBBLE_LINK_TOKEN, '--dsw-alias-link')
  assert.equal(
    (css.match(new RegExp(`  ${CHAT_BUBBLE_LINK_TOKEN}:`, 'g')) ?? []).length,
    VARIANTS.length,
    'every rule re-points the link token'
  )
  // No second fill on the card: the pencil-down rules that used to paint a paper
  // block (`[data-question-reply] [class*="_question"]`) must not come back.
  assert.ok(!css.includes('_question'), 'the reply card no longer paints a question block')
  assert.ok(!css.includes('border-radius: var(--dsw-radius-md, 12px)'))
  for (const { scheme, strength } of VARIANTS) {
    const { fill } = chatBubbleRole(scheme, strength)
    assert.ok(css.includes(fill), `${scheme}-${strength}: fill is painted`)
  }
})

test('the reply card is one surface and the question recedes by its ink', () => {
  // 2026-11-15: the user looked at the paper block and asked for the default
  // theme instead ("不想要两个不同颜色的块来做显示，参考默认主题…问题用浅一点的文字稍微
  // 弱化显示就行了"). So the paper is gone; `dt` keeps the bubble ink's hue and
  // only steps back, `dd` keeps the answer ink — DSH's own `QuestionReplyView`
  // hierarchy (`dt` = `label-secondary`, `dd` = the bubble ink).
  assert.equal(CHAT_BUBBLE_QUESTION_INK_STEP, 6)
  for (const { scheme, strength } of VARIANTS) {
    const { fill, ink } = chatBubbleRole(scheme, strength)
    const question = chatBubbleQuestionInk(scheme, strength)
    const step = Math.abs(labLightness(question) - labLightness(ink))
    // The step is perceptual, and it always moves toward the fill: darker in the
    // light schemes, lighter in the dark ones.
    assert.ok(step >= 5.5 && step <= 7, `${scheme}-${strength}: the step is ${step.toFixed(1)} L*, outside 5.5-7`)
    assert.ok(
      labLightness(fill) > labLightness(ink)
        ? labLightness(question) > labLightness(ink)
        : labLightness(question) < labLightness(ink),
      `${scheme}-${strength}: the question moves toward the fill`
    )
    // Same voice, not a second colour: the question is a small share of the
    // ink → fill blend, so no new hue enters the card.
    const share = Array.from({ length: 100 }, (_, index) => (index + 1) / 100)
      .find((value) => mix(ink, fill, value) === question)
    assert.ok(share !== undefined, `${scheme}-${strength}: the question ink sits on the ink → fill blend`)
    assert.ok(share <= 0.3, `${scheme}-${strength}: the question moves only ${share} of the way to the fill`)
    // Softer than the answer, and still legible on the palette's own accent pair.
    const questionRatio = contrastRatio(question, fill)
    assert.ok(questionRatio < contrastRatio(ink, fill), `${scheme}-${strength}: the question is softer than the answer`)
    const floor = scheme === 'dark' ? 4.4 : 1.65
    assert.ok(questionRatio >= floor, `${scheme}-${strength}: question ink on the fill = ${questionRatio.toFixed(2)} < ${floor}`)
    // Pinned measured pairs (G23 in `scripts/check-contrast.mjs`).
    const pinned = {
      'light-hard': ['#e9ecd1', 1.99],
      'light-medium': ['#e6e7c5', 1.90],
      'light-soft': ['#dbdcb5', 1.70],
      'dark-hard': ['#343d3b', 5.59],
      'dark-medium': ['#3a4443', 5.03],
      'dark-soft': ['#404b4a', 4.52]
    }[`${scheme}-${strength}`]
    assert.equal(question, pinned[0], `${scheme}-${strength}: pinned question ink`)
    assert.equal(Math.round(questionRatio * 100) / 100, pinned[1], `${scheme}-${strength}: measured question ratio`)
  }
  const css = chatBubbleStyles()
  // The token is the only lever: one declaration per variant, and the value is
  // the softened ink rather than the answer ink.
  for (const { scheme, strength } of VARIANTS) {
    const question = chatBubbleQuestionInk(scheme, strength)
    const { ink } = chatBubbleRole(scheme, strength)
    assert.ok(css.includes(`  ${CHAT_BUBBLE_QUESTION_INK_TOKEN}: ${question};`), `${scheme}-${strength}: question token carries the softened ink`)
    assert.ok(!css.includes(`  ${CHAT_BUBBLE_QUESTION_INK_TOKEN}: ${ink};`), `${scheme}-${strength}: the question is not the answer ink`)
  }
})

test('the question-reply bubble is re-inked, not just re-filled', () => {
  // The reply card's question line is `label-secondary` by DSH's own stylesheet.
  // On the moss paper that is already weak (2.44:1 in light·soft) and on the
  // accent fill it collapses (~1.2:1), so the paint rule has to carry it —
  // and since 2026-11-15 it carries the softened ink, not the answer's.
  for (const { scheme, strength } of VARIANTS) {
    const overlay = tokensFor({ light: strength, dark: strength })
    const muted = overlay['--dsw-alias-label-secondary'][scheme]
    const { fill, ink } = chatBubbleRole(scheme, strength)
    const question = chatBubbleQuestionInk(scheme, strength)
    assert.ok(contrastRatio(muted, fill) < 3, `${scheme}-${strength}: muted label on the accent fill is unreadable`)
    // The repointed token is the softened ink: softer than the answer, but still
    // clear of the unreadable range DSH's own token falls into.
    assert.ok(contrastRatio(question, fill) > contrastRatio(muted, fill), `${scheme}-${strength}: the question beats DSH's own muted label`)
    assert.ok(contrastRatio(question, fill) < contrastRatio(ink, fill), `${scheme}-${strength}: the question stays below the answer`)
    // The rule's own ink keeps the pair the bubble was approved with.
    assert.ok(contrastRatio(ink, fill) >= 1.95, `${scheme}-${strength}: bubble ink stays on the accent pair`)
  }
})

test('bubble text selection keeps the one global highlight and re-inks only the text', () => {
  // 2026-11-13: the first landing gave the bubble its own selection band; the
  // user then asked to keep the highlight colour identical on every surface
  // ("保持勾选颜色各处都统一") and let option C repaint only the selected text
  // ("只变动修改文字颜色"). So the band is the global `::selection` `bg_visual`
  // and this sheet only supplies the ink.
  assert.equal(CHAT_BUBBLE_SELECTION_INK.light, '#2F3B33')
  assert.equal(CHAT_BUBBLE_SELECTION_INK.dark, '#FFFBEF')
  const css = chatBubbleStyles()
  // The band must not be repainted here: every surface keeps `src/selection.js`'s
  // `bg_visual` band, so none of the `::selection` rules in this sheet may paint
  // a background.
  const selectionRules = css.split('\n\n').filter((rule) => rule.includes('::selection'))
  assert.equal(selectionRules.length, VARIANTS.length)
  for (const rule of selectionRules) {
    assert.ok(!rule.includes('background'), 'selection rules leave the global band alone')
  }
  for (const { scheme, strength } of VARIANTS) {
    const ink = CHAT_BUBBLE_SELECTION_INK[scheme]
    const bubble = chatBubbleRole(scheme, strength)
    const band = RAMPS[scheme][strength].bgVisual
    const text = contrastRatio(ink, band)
    assert.ok(text >= 4.5, `${scheme}-${strength}: selected bubble text on the shared band = ${text.toFixed(2)} < 4.5`)
    // A documented trade-off of the unified colour: the light bands step
    // 1.47-1.71:1 off the accent bubble (light·soft is the floor), but the user
    // chose consistency; dark stays far above.
    const bandFloor = scheme === 'light' ? 1.45 : 4.5
    const bandStep = contrastRatio(band, bubble.fill)
    assert.ok(bandStep >= bandFloor, `${scheme}-${strength}: shared selection band vanished on the bubble (${bandStep.toFixed(2)}:1 < ${bandFloor})`)
    const rule = `${CHAT_BUBBLE_SELECTORS[0]} ::selection`
    assert.ok(css.includes(rule), `${scheme}-${strength}: bubble-scoped selection rule missing`)
    assert.ok(css.includes(`color: ${ink}`), `${scheme}-${strength}: selected text is re-inked`)
  }
  // Pinned measured pairs: option C's ink over the global bands.
  assert.equal(contrastRatio(CHAT_BUBBLE_SELECTION_INK.light, RAMPS.light.hard.bgVisual).toFixed(2), '8.33')
  assert.equal(contrastRatio(CHAT_BUBBLE_SELECTION_INK.light, RAMPS.light.soft.bgVisual).toFixed(2), '7.18')
  assert.equal(contrastRatio(CHAT_BUBBLE_SELECTION_INK.dark, RAMPS.dark.hard.bgVisual).toFixed(2), '10.49')
  assert.equal(contrastRatio(CHAT_BUBBLE_SELECTION_INK.dark, RAMPS.dark.soft.bgVisual).toFixed(2), '8.91')
})

test('bubble links keep their blue but move to a readable step on the accent fill', () => {
  // 2026-11-19 report: a user message carrying a composer file reference
  // (`@.gitignore` + text) showed the file name in the canvas link blue
  // (`--dsw-alias-link` = `fg.blue`) on the green bubble — 1.41:1 in the light
  // schemes, 1.09:1 in the dark ones. The user picked option 3 of the demo:
  // deepened blue plus a solid underline. Scope is the bubble only; assistant
  // markdown file links keep the color-mode aqua.
  assert.deepEqual({ ...CHAT_BUBBLE_LINK_INK }, { light: '#1E4152', dark: '#204A5A' })
  assert.equal(CHAT_BUBBLE_LINK_SELECTOR, ':is(a, [class*="fileLink"], [data-ref-chip="file"])')
  const css = chatBubbleStyles()
  for (const { scheme, strength } of VARIANTS) {
    const ink = CHAT_BUBBLE_LINK_INK[scheme]
    const { fill } = chatBubbleRole(scheme, strength)
    const canvas = FOREGROUNDS[scheme].blue
    // The pair the report was filed against: the canvas blue on the accent fill.
    assert.ok(contrastRatio(canvas, fill) < 1.5, `${scheme}-${strength}: canvas blue still collapses on the fill`)
    // The shipped ink clears AA and is a clear step above the canvas pair.
    const ratio = contrastRatio(ink, fill)
    assert.ok(ratio >= 4.5, `${scheme}-${strength}: bubble link ink on the fill = ${ratio.toFixed(2)} < 4.5`)
    assert.ok(ratio > contrastRatio(canvas, fill) + 3, `${scheme}-${strength}: bubble link ink is a real step, not a nudge`)
    // Same hue family: the link still reads as a blue, not as body ink.
    assert.ok(ink.startsWith('#') && ink.length === 7, `${scheme}: link ink is a literal #RRGGBB`)
    // The rule anchors on every bubble and carries the underline affordance.
    assert.ok(css.includes(`  color: ${ink};`), `${scheme}-${strength}: link ink is painted`)
    assert.ok(css.includes('  text-decoration: underline solid;'), `${scheme}-${strength}: link carries the underline`)
    assert.ok(css.includes('  text-decoration-color: currentColor;'), `${scheme}-${strength}: underline follows the ink`)
  }
  // The sheet must not touch anything outside the bubble: the color-mode sheet
  // still owns the canvas file-link aqua, so no bare `[class*="fileLink"]` rule
  // may appear without a bubble anchor.
  for (const rule of css.split('\n\n')) {
    if (!rule.includes('[class*="fileLink"]')) continue
    assert.ok(rule.includes('_bubble'), 'file-link rule is scoped to a bubble anchor')
  }
  // Pinned measured pairs (G26 in `scripts/check-contrast.mjs`).
  for (const { scheme, strength } of VARIANTS) {
    const { fill } = chatBubbleRole(scheme, strength)
    const pinned = { light: 4.53, dark: 4.80 }[scheme]
    assert.equal(Math.round(contrastRatio(CHAT_BUBBLE_LINK_INK[scheme], fill) * 100) / 100, pinned, `${scheme}-${strength}: measured link ratio`)
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
