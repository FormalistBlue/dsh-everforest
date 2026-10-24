/**
 * Unit tests for the Client-side durability helpers (`src/durable.js`).
 *
 * These functions are the contract between three parties: the Host settings
 * form (`ctx.configForms`), the first-paint boot hint
 * (`window.__EVERFOREST_BOOT__`), and the localStorage cache. They are pure,
 * so they are tested directly instead of through the VM bundle harness.
 *
 * The state is the two palette strengths (`light`, `dark`): every Host write
 * carries both in one atomic mutation, and the first-paint hint stays a
 * strength-only pair. Color mode is a default feature with no switch since
 * 2026-10-24, so the retired `colorMode` flag of a 0.4.x Host section or cache
 * is ignored wherever it can still show up.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_STATE, STRENGTHS } from '../src/palette.js'
import { STORAGE_KEY, STATE_VERSION } from '../src/state.js'
import {
  ENTRY_ID,
  bootHintState,
  hasUserLayer,
  isDefaultState,
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
  // A 0.4.x patch that only ever stored the retired flag still counts as a user
  // layer; its strengths resolve to the shipped defaults either way.
  assert.equal(hasUserLayer({ colorMode: true }), true)
  for (const hostile of [undefined, null, 'hard', 42, ['soft'], true]) {
    assert.equal(hasUserLayer(hostile), false)
  }
})

test('stateFromHost validates each field against the supported strengths', () => {
  assert.deepEqual(stateFromHost({ light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
  })
  // A 0.4.x Host section still carries the retired colorMode flag: ignored.
  assert.deepEqual(stateFromHost({ light: 'soft', dark: 'medium', colorMode: false }), {
    light: 'soft',
    dark: 'medium',
  })

  // One invalid side keeps the valid one.
  assert.deepEqual(stateFromHost({ light: 'nope', dark: 'hard' }), {
    light: DEFAULT_STATE.light,
    dark: 'hard',
  })
  assert.deepEqual(stateFromHost({ light: 'medium', dark: 'nope' }), {
    light: 'medium',
    dark: DEFAULT_STATE.dark,
  })

  // Missing/undefined sections resolve to the shipped defaults.
  for (const hostile of [undefined, null, {}, [], 'hard']) {
    assert.deepEqual(stateFromHost(hostile), {
      light: DEFAULT_STATE.light,
      dark: DEFAULT_STATE.dark,
    })
  }

  // A Host value can never escape the enum.
  for (const strength of STRENGTHS) {
    const state = stateFromHost({ light: strength, dark: strength, colorMode: 'yes' })
    assert.ok(STRENGTHS.includes(state.light))
    assert.ok(STRENGTHS.includes(state.dark))
    assert.equal(Object.prototype.hasOwnProperty.call(state, 'colorMode'), false)
  }
})

test('statesEqual and isDefaultState compare the full state', () => {
  const base = { light: 'hard', dark: 'soft' }
  assert.equal(statesEqual(base, { light: 'hard', dark: 'soft' }), true)
  assert.equal(statesEqual(base, { light: 'soft', dark: 'hard' }), false)
  assert.equal(statesEqual(base, { light: 'hard', dark: 'medium' }), false)

  assert.equal(isDefaultState(base), true)
  // The retired flag no longer participates in the predicate: a legacy object
  // carrying it is still the default pairing.
  assert.equal(isDefaultState({ light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark, colorMode: false }), true)
  assert.equal(isDefaultState({ light: DEFAULT_STATE.light, dark: 'hard' }), false)
  assert.equal(isDefaultState({ light: 'medium', dark: DEFAULT_STATE.dark }), false)
})

test('set ops carry both strengths in one atomic mutation', () => {
  assert.deepEqual(stateToSetOps({ light: 'soft', dark: 'hard' }), [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'hard' },
  ])
  // A stale colorMode key in the input is not written back.
  assert.deepEqual(stateToSetOps({ light: 'hard', dark: 'soft', colorMode: false }), [
    { op: 'set', path: ['light'], value: 'hard' },
    { op: 'set', path: ['dark'], value: 'soft' },
  ])
})

test('unset ops clear both fields so the config editor can drop the override row', () => {
  assert.deepEqual(stateToUnsetOps(), [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
  ])
})

test('shouldSeed only migrates a real cache choice when the Host has no choice', () => {
  const chosen = { light: 'soft', dark: 'hard' }
  const defaults = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }

  assert.equal(shouldSeed({}, chosen), true, 'an older choice must be seeded once')
  assert.equal(shouldSeed({}, defaults), false, 'seeding the shipped default is pointless')
  assert.equal(shouldSeed({}, null), false, 'no cache means nothing to migrate')
  assert.equal(shouldSeed({ light: 'medium' }, chosen), false, 'the Host already has a choice')
  assert.equal(shouldSeed({ colorMode: true }, defaults), false, 'the Host already has a (legacy) user layer')

  // A legacy cache without the retired flag is just the pair.
  assert.equal(shouldSeed({}, { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }), false)

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

  // The hint is a pair-only contract: a stray colorMode value never leaks into
  // the Client state.
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
