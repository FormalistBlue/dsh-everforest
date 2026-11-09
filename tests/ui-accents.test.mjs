import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COLOR_MODE_ATTRS } from '../src/color-mode.js'
import { contrastRatio } from '../src/color.js'
import { DEFAULT_STATE, SCHEMES, STRENGTHS, resolvePalette } from '../src/palette.js'
import {
  MENU_CHECK,
  MENU_CHECK_RADIO,
  MENU_INK_TOKENS,
  MENU_SELECTED,
  MENU_SELECTED_FILL,
  MENU_SELECTED_FILL_RADIO,
  MENU_SELECTED_RADIO,
  UI_ACCENT_DARK_INK_CONTRAST,
  UI_ACCENT_LIGHT_INK_CONTRAST,
  uiAccentRoles,
  uiAccentStyles
} from '../src/ui-accents.js'

/** All six variants, `light-hard` … `dark-soft`. */
const VARIANT_NAMES = SCHEMES.flatMap((scheme) => STRENGTHS.map((strength) => `${scheme}-${strength}`))

/**
 * Pinned 2026-11-08 selected-item surfaces (palette review A7): `statusline1`
 * fill + scheme canvas `bg0` ink.
 */
const EXPECTED_FILL = {
  'light-hard': '#93B259',
  'light-medium': '#93B259',
  'light-soft': '#93B259',
  'dark-hard': '#A7C080',
  'dark-medium': '#A7C080',
  'dark-soft': '#A7C080'
}
const EXPECTED_INK = {
  'light-hard': '#FFFBEF',
  'light-medium': '#FDF6E3',
  'light-soft': '#F3EAD3',
  'dark-hard': '#272E33',
  'dark-medium': '#2D353B',
  'dark-soft': '#333C43'
}

/**
 * The 2026-11-09 floors that are left once the conversation title rule is gone
 * (the title no longer has a surface of its own: it is DSH's `label-primary`).
 * Pinned as literals so weakening the source constant cannot make both the
 * checker and this suite green at the same time.
 */
test('the two accent ink floors are pinned to literals', () => {
  assert.equal(UI_ACCENT_DARK_INK_CONTRAST, 4.5)
  assert.equal(UI_ACCENT_LIGHT_INK_CONTRAST, 1.95)
})

/** The scope of one variant's rules. */
function scopeOf(scheme, strength) {
  return scheme === 'dark'
    ? `html[${COLOR_MODE_ATTRS.dark}="${strength}"] body[data-ds-dark-theme]`
    : `html[${COLOR_MODE_ATTRS.light}="${strength}"] body:not([data-ds-dark-theme])`
}

const styleRules = (css) => css.split('\n\n').filter(Boolean)

test('one accent + canvas pair per variant, pinned to the palette', () => {
  const roles = uiAccentRoles()
  assert.deepEqual(Object.keys(roles).sort(), [...VARIANT_NAMES].sort())
  for (const variant of VARIANT_NAMES) {
    assert.equal(roles[variant].fill.toLowerCase(), EXPECTED_FILL[variant].toLowerCase(), `${variant} fill`)
    assert.equal(roles[variant].ink.toLowerCase(), EXPECTED_INK[variant].toLowerCase(), `${variant} ink`)
    const [scheme, strength] = variant.split('-')
    const palette = resolvePalette({ ...DEFAULT_STATE, [scheme]: strength })[scheme]
    assert.equal(roles[variant].fill, palette.fg.statusline1, `${variant}: fill must be the palette statusline1`)
    assert.equal(roles[variant].ink, palette.ramp.bg0, `${variant}: ink must be the scheme canvas bg0`)
    assert.match(roles[variant].fill, /^#[0-9a-f]{6}$/i, `${variant}: the selected fill is opaque`)
    assert.match(roles[variant].ink, /^#[0-9a-f]{6}$/i, `${variant}: the ink is opaque`)
    // 2026-11-09: the conversation title is no longer painted here, so a role
    // table with only { fill, ink } is the contract.
    assert.deepEqual(Object.keys(roles[variant]).sort(), ['fill', 'ink'])
  }
})

test('the canvas ink keeps its documented contrast on the accent fill', () => {
  const roles = uiAccentRoles()
  for (const variant of VARIANT_NAMES) {
    const [scheme] = variant.split('-')
    const ratio = contrastRatio(roles[variant].ink, roles[variant].fill)
    const floor = scheme === 'dark' ? UI_ACCENT_DARK_INK_CONTRAST : UI_ACCENT_LIGHT_INK_CONTRAST
    assert.ok(ratio >= floor, `${variant}: ink on the selected fill = ${ratio.toFixed(2)} < ${floor}`)
    if (scheme === 'dark') {
      assert.ok(ratio >= 4.5, `${variant}: dark selected item must stay WCAG AA (${ratio.toFixed(2)})`)
    }
    // The light palette's cream ink on statusline1 is soft by construction
    // (2.00–2.32:1); a guard would have to turn it into the grey ink, which is
    // exactly the white-on-accent look upstream does not use.
    if (scheme === 'light') {
      assert.ok(ratio <= 2.5, `${variant}: light ink unexpectedly deepened (${ratio.toFixed(2)})`)
    }
  }
})

test('the conversation title is left to DSH, not painted by this sheet', () => {
  // 2026-11-09 user request "标题不需要绿色显示了": the title rule was removed
  // and the header falls back to DSH's own `.crumbCurrent { color:
  // var(--dsw-alias-label-primary) }` — which the token layer already maps to
  // the scheme `fg`. Pin the absence so the rule cannot creep back in.
  const css = uiAccentStyles()
  assert.ok(!css.includes('crumbCurrent'), 'the conversation title must stay at DSH\'s label-primary')
  assert.ok(!css.includes('crumb'), 'no crumb surface belongs to this sheet')
  // The sidebar folder names keep their green — that is a different sheet.
  assert.ok(!css.includes('projectText'), 'folder names are `dsh-everforest/workspace-labels`, not part of this sheet')
})

test('the sheet emits three rules per variant with the stable menu hooks', () => {
  const css = uiAccentStyles()
  const rules = styleRules(css)
  assert.equal(rules.length, SCHEMES.length * STRENGTHS.length * 3)
  assert.equal(MENU_SELECTED, '[role="menu"] [role="menuitem"][class*="selected"]')
  assert.equal(MENU_SELECTED_RADIO, '[role="menu"] [role="menuitemradio"][aria-checked="true"]')
  assert.equal(MENU_CHECK, `${MENU_SELECTED} [class*="check"]`)
  assert.equal(MENU_CHECK_RADIO, `${MENU_SELECTED_RADIO} [class*="check"]`)
  assert.equal(MENU_SELECTED_FILL, `${MENU_SELECTED} [class*="selectedFill"]`)
  assert.equal(MENU_SELECTED_FILL_RADIO, `${MENU_SELECTED_RADIO} [class*="selectedFill"]`)
  for (const scheme of SCHEMES) {
    for (const strength of STRENGTHS) {
      const variant = `${scheme}-${strength}`
      const scope = scopeOf(scheme, strength)
      const selected = rules.find((rule) => rule.startsWith(`${scope} ${MENU_SELECTED},`))
      assert.ok(selected, `${variant}: missing the selected-item rule`)
      assert.ok(selected.includes(`background: ${EXPECTED_FILL[variant]}`), `${variant}: wrong selected fill`)
      assert.ok(selected.includes(`color: ${EXPECTED_INK[variant]}`), `${variant}: wrong selected ink`)
      assert.ok(selected.includes(MENU_SELECTED_RADIO), `${variant}: radio options must be covered`)
      // The option's icon / secondary text restate their own colour tokens, so
      // the band ink has to be written onto those tokens too (2026-11-08 user
      // report: the selected workspace icon and the selected mode text).
      for (const token of MENU_INK_TOKENS) {
        assert.ok(
          selected.includes(`${token}: ${EXPECTED_INK[variant]}`),
          `${variant}: ${token} must resolve to the band ink`
        )
      }
      const fill = rules.find((rule) => rule.startsWith(`${scope} ${MENU_SELECTED_FILL},`))
      assert.ok(fill, `${variant}: missing the selected-fill rule`)
      assert.ok(fill.includes(MENU_SELECTED_FILL_RADIO), `${variant}: radio fills must be covered`)
      const checks = rules.find((rule) => rule.startsWith(`${scope} ${MENU_CHECK},`))
      assert.ok(checks, `${variant}: missing the selected-check rule`)
      assert.ok(checks.includes(`color: ${EXPECTED_INK[variant]}`), `${variant}: check must use the canvas ink`)
      assert.ok(checks.includes(MENU_CHECK_RADIO), `${variant}: radio checks must be covered`)
    }
  }
})

test('the option ink tokens are pinned and only redeclared on the selected option', () => {
  // The nested parts of a dropdown option read these tokens instead of
  // inheriting a colour; pin the list so a token rename in DSH shows up here.
  assert.deepEqual(MENU_INK_TOKENS, [
    '--dsw-alias-menu-icon',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-label-tertiary',
    '--dsw-alias-label-caption',
    '--dsw-alias-label-dimmed'
  ])
  const css = uiAccentStyles()
  for (const rule of styleRules(css)) {
    const declarations = rule.split('\n').filter((line) => line.trim().startsWith('--dsw-alias-'))
    const selected = rule.includes(`${MENU_SELECTED},`)
    assert.equal(
      declarations.length,
      selected ? MENU_INK_TOKENS.length : 0,
      `token redeclarations must stay inside the selected-option rule (${rule.slice(0, 60)}…)`
    )
  }
})

test('the chrome accent sheet is always-on, un-gated and uses no !important', () => {
  const css = uiAccentStyles()
  assert.ok(!css.includes('data-everforest-color-mode'), 'the sheet must not be gated by the color mode')
  assert.ok(!css.includes('!important'))
  assert.ok(css.includes('body[data-ds-dark-theme]'))
  assert.ok(css.includes('body:not([data-ds-dark-theme])'))
  // The accent is used as a *background* only (upstream's `statusline1`
  // semantics); the conversation title is no longer painted here (2026-11-09).
  assert.ok(css.includes('background: '), 'the selected option needs its solid fill')
  assert.ok(!css.includes('color: #8DA101'), 'the text green must not be used by this sheet')
})
