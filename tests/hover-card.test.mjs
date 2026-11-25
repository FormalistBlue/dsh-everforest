import assert from 'node:assert/strict'
import { test } from 'node:test'

import { contrastRatio } from '../src/color.js'
import { COLOR_MODE_ON } from '../src/color-mode.js'
import {
  HOVER_CARD_CARD,
  HOVER_CARD_CONTENT,
  HOVER_CARD_SHADOW_FALLBACK,
  hoverCardStyles
} from '../src/hover-card.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS } from '../src/palette.js'
import { tokensFor } from '../src/tokens.js'

const CSS = hoverCardStyles()

test('the anchor is the hover content local name, not the card module hash', () => {
  // ui-workspace renders `WorkspaceHoverContent` / `SessionHoverContent` with the
  // stable `hoverContent` local class; the card itself is `_card_l6gf9_9`, whose
  // `l6gf9` segment is CSS-module build output.
  assert.equal(HOVER_CARD_CONTENT, '[class*="hoverContent"]')
  assert.ok(HOVER_CARD_CARD.startsWith(COLOR_MODE_ON), 'must stay inside the theme scope')
  assert.match(HOVER_CARD_CARD, /div:has\(> \[class\*="hoverContent"\]\)$/)
  assert.doesNotMatch(CSS, /l6gf9|_card_/)
  // A direct child keeps the rim on the portalled card itself; a descendant
  // match would also hit the page containers.
  assert.match(CSS, /:has\(> /)
})

test('one rule layers a token hairline over DSH elevation instead of replacing it', () => {
  assert.equal((CSS.match(/\{/g) ?? []).length, 1, 'exactly one rule')
  assert.match(
    CSS,
    new RegExp(
      `box-shadow: 0 0 0 1px var\\(--dsw-alias-border-l4\\), var\\(--dsw-shadow-lv3, ${HOVER_CARD_SHADOW_FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\);`
    )
  )
  // DSH's own lv3 opens with a 1px black 20% ring, invisible on the dark card;
  // the theme hairline is what gives both schemes an edge.
  assert.doesNotMatch(CSS, /!important/)
  assert.doesNotMatch(CSS, /#[0-9a-f]{3,8}\b/i, 'no palette literals in the sheet')
  assert.match(CSS, /\n$/)
})

test('the card surface is the elevated bg2 and the dark card sits above the canvas', () => {
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const layer = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
      const card = layer['--dsw-alias-hovercard-bg'][scheme]
      // One surface token, six variants: the same `bg2` the menus and tips use.
      assert.equal(card, layer['--dsw-alias-bg-layer-2'][scheme], `${scheme}-${strength}: bg2`)

      // The rim must be a real hairline, not a fully transparent token.
      assert.notEqual(layer['--dsw-alias-border-l4'][scheme].slice(-2), '00', `${scheme}-${strength}: rim`)

      const ink = layer['--dsw-alias-hovercard-label-primary'][scheme]
      const ratio = contrastRatio(ink, card)
      assert.ok(ratio >= 4.5, `${scheme}-${strength}: title ${ratio.toFixed(2)}:1 < 4.5`)

      // DSH's inherited card was darker than the dark canvas; the elevated card
      // must be a clear step *above* it (the report: the card blended in).
      const canvas = layer['--dsw-alias-bg-base'][scheme]
      const step = contrastRatio(card, canvas)
      if (scheme === 'dark') {
        assert.ok(step >= 1.25, `${scheme}-${strength}: card vs canvas ${step.toFixed(2)}:1`)
      } else {
        // The cream ramp is compressed; the hairline carries the edge there.
        assert.ok(step >= 1.0, `${scheme}-${strength}: card vs canvas ${step.toFixed(2)}:1`)
      }
    }
  }
})

test('the muted roles keep the theme hierarchy on the card', () => {
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const layer = tokensFor({ ...DEFAULT_STATE, [scheme]: strength })
      const card = layer['--dsw-alias-hovercard-bg'][scheme]
      for (const role of ['secondary', 'tertiary']) {
        const ratio = contrastRatio(layer[`--dsw-alias-hovercard-label-${role}`][scheme], card)
        assert.ok(ratio >= 2.2, `${scheme}-${strength}: ${role} ${ratio.toFixed(2)}:1 < 2.2`)
        assert.ok(ratio < 4.5, `${scheme}-${strength}: ${role} must stay below the title`)
      }
    }
  }
})
