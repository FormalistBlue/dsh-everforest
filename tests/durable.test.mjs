/**
 * Unit tests for the Client-side durability helpers (`src/durable.js`).
 *
 * These functions are the contract between three parties: the Host settings
 * form (`ctx.configForms`), the first-paint boot hint
 * (`window.__EVERFOREST_BOOT__`), and the localStorage cache. They are pure,
 * so they are tested directly instead of through the VM bundle harness.
 *
 * Since 0.4.0 the state has three fields (`light`, `dark`, `colorMode`): every
 * Host write carries all three in one atomic mutation, and the first-paint hint
 * intentionally stays a strength-only pair.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from '../src/state.js'
import {
  ENTRY_ID,
  bootHintState,
  hasUserLayer,
  isDefaultPair,
  shouldSeed,
  stateFromHost,
  stateToSetOps,
  stateToUnsetOps,
  statesEqual,
} from '../src/durable.js'

test('ENTRY_ID and the storage/version constants are the documented contract', () => {
  assert.equal(ENTRY_ID, 'everforest')
  assert.equal(STORAGE_KEY, 'dsh-everforest/v1')
  assert.equal(STATE_VERSION, 1)
})

test('hasUserLayer treats the settings form\'s empty override object as "no choice"', () => {
  // The settings service defaults `user` to `{}` (not undefined); a truthiness
  // test would therefore report a user layer forever.
  assert.equal(hasUserLayer({}), false)
  assert.equal(hasUserLayer({ light: 'soft' }), true)
  assert.equal(hasUserLayer({ dark: 'hard' }), true)
  assert.equal(hasUserLayer({ colorMode: true }), true)
  for (const hostile of [undefined, null, 'hard', 42, ['soft'], true]) {
    assert.equal(hasUserLayer(hostile), false)
  }
})

test('stateFromHost validates each field against the supported strengths', () => {
  assert.deepEqual(stateFromHost({ light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
    colorMode: false,
  })
  assert.deepEqual(stateFromHost({ light: 'soft', dark: 'medium', colorMode: true }), {
    light: 'soft',
    dark: 'medium',
    colorMode: true,
  })

  // One invalid side keeps the valid one; a non-boolean flag means "off".
  assert.deepEqual(stateFromHost({ light: 'nope', dark: 'hard', colorMode: 'on' }), {
    light: DEFAULT_STATE.light,
    dark: 'hard',
    colorMode: false,
  })
  assert.deepEqual(stateFromHost({ light: 'medium', dark: 'nope' }), {
    light: 'medium',
    dark: DEFAULT_STATE.dark,
    colorMode: false,
  })

  // Missing/undefined sections resolve to the shipped defaults (a Host section
  // written by 0.3.x has no colorMode field at all).
  for (const hostile of [undefined, null, {}, [], 'hard']) {
    assert.deepEqual(stateFromHost(hostile), {
      light: DEFAULT_STATE.light,
      dark: DEFAULT_STATE.dark,
      colorMode: false,
    })
  }

  // A Host value can never escape the enum / the boolean type.
  for (const strength of STRENGTHS) {
    const state = stateFromHost({ light: strength, dark: strength, colorMode: 'yes' })
    assert.ok(STRENGTHS.includes(state.light))
    assert.ok(STRENGTHS.includes(state.dark))
    assert.equal(state.colorMode, false)
  }
})

test('statesEqual and isDefaultPair compare the full state', () => {
  const base = { light: 'hard', dark: 'soft', colorMode: false }
  assert.equal(statesEqual(base, { light: 'hard', dark: 'soft', colorMode: false }), true)
  assert.equal(statesEqual(base, { light: 'hard', dark: 'soft', colorMode: true }), false)
  assert.equal(statesEqual(base, { light: 'soft', dark: 'hard', colorMode: false }), false)
  assert.equal(statesEqual(base, { light: 'hard', dark: 'medium', colorMode: false }), false)

  assert.equal(isDefaultPair(base), true)
  // A legacy call without the field still means "off".
  assert.equal(isDefaultPair({ light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }), true)
  // Color mode on is a real choice even with the default pairing.
  assert.equal(isDefaultPair({ light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: true }), false)
  assert.equal(isDefaultPair({ light: DEFAULT_STATE.light, dark: 'hard', colorMode: false }), false)
  assert.equal(isDefaultPair({ light: 'medium', dark: DEFAULT_STATE.dark, colorMode: false }), false)
})

test('set ops carry both strengths and the color-mode flag in one atomic mutation', () => {
  assert.deepEqual(stateToSetOps({ light: 'soft', dark: 'hard', colorMode: true }), [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'hard' },
    { op: 'set', path: ['colorMode'], value: true },
  ])
  // The flag is always written explicitly so turning the mode off is durable.
  assert.deepEqual(stateToSetOps({ light: 'hard', dark: 'soft', colorMode: false }), [
    { op: 'set', path: ['light'], value: 'hard' },
    { op: 'set', path: ['dark'], value: 'soft' },
    { op: 'set', path: ['colorMode'], value: false },
  ])
})

test('unset ops clear all three fields so the config editor can drop the override row', () => {
  assert.deepEqual(stateToUnsetOps(), [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
    { op: 'unset', path: ['colorMode'] },
  ])
})

test('shouldSeed only migrates a real cache choice when the Host has no choice', () => {
  const chosen = { light: 'soft', dark: 'hard', colorMode: false }
  const defaults = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: false }

  assert.equal(shouldSeed({}, chosen), true, 'an older choice must be seeded once')
  assert.equal(shouldSeed({}, { ...chosen }), true)
  assert.equal(shouldSeed({}, defaults), false, 'seeding the shipped default is pointless')
  assert.equal(shouldSeed({}, null), false, 'no cache means nothing to migrate')
  assert.equal(shouldSeed({ light: 'medium' }, chosen), false, 'the Host already has a choice')
  assert.equal(shouldSeed({ colorMode: true }, defaults), false, 'the Host already has a color-mode choice')

  // Color mode on with the default pairing is a real choice and must migrate.
  assert.equal(shouldSeed({}, { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: true }), true)

  // A partial Host layer still counts as a choice: never overwrite it.
  assert.equal(shouldSeed({ light: 'medium' }, chosen), false)
})

test('bootHintState accepts only the versioned strength pair the Host row publishes', () => {
  assert.deepEqual(bootHintState({ version: STATE_VERSION, light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
  })

  // Invalid fields fall back per side, exactly like the cache normalizer.
  assert.deepEqual(bootHintState({ version: STATE_VERSION, light: 'nope', dark: 'hard' }), {
    light: DEFAULT_STATE.light,
    dark: 'hard',
  })

  // The hint is a pair-only contract: the Host boot row never publishes the
  // color-mode flag, so even a stray value must not leak into the Client state.
  assert.deepEqual(bootHintState({ version: STATE_VERSION, light: 'soft', dark: 'hard', colorMode: true }), {
    light: 'soft',
    dark: 'hard',
  })

  // No hint (old Host bundle, direct Client load) or a foreign shape means
  // "fall back to the localStorage cache".
  for (const hostile of [undefined, null, 'hard', 42, [], {}, { light: 'soft', dark: 'hard' }]) {
    assert.equal(bootHintState(hostile), null)
  }
  assert.equal(bootHintState({ version: 99, light: 'soft', dark: 'hard' }), null)
})
