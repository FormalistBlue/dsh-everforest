/**
 * Unit tests for the Client-side durability helpers (`src/durable.js`).
 *
 * These functions are the contract between three parties: the Host settings
 * form (`ctx.configForms`), the first-paint boot hint
 * (`window.__EVERFOREST_BOOT__`), and the localStorage cache. They are pure,
 * so they are tested directly instead of through the VM bundle harness.
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
  for (const hostile of [undefined, null, 'hard', 42, ['soft'], true]) {
    assert.equal(hasUserLayer(hostile), false)
  }
})

test('stateFromHost validates each field against the supported strengths', () => {
  assert.deepEqual(stateFromHost({ light: 'soft', dark: 'medium' }), { light: 'soft', dark: 'medium' })

  // One invalid side keeps the valid one.
  assert.deepEqual(stateFromHost({ light: 'nope', dark: 'hard' }), { light: DEFAULT_STATE.light, dark: 'hard' })
  assert.deepEqual(stateFromHost({ light: 'medium', dark: 'nope' }), { light: 'medium', dark: DEFAULT_STATE.dark })

  // Missing/undefined sections resolve to the shipped defaults.
  for (const hostile of [undefined, null, {}, [], 'hard']) {
    assert.deepEqual(stateFromHost(hostile), { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark })
  }

  // A Host value can never escape the enum.
  for (const strength of STRENGTHS) {
    const pair = stateFromHost({ light: strength, dark: strength })
    assert.ok(STRENGTHS.includes(pair.light))
    assert.ok(STRENGTHS.includes(pair.dark))
  }
})

test('statesEqual and isDefaultPair compare the full pairing', () => {
  assert.equal(statesEqual({ light: 'hard', dark: 'soft' }, { light: 'hard', dark: 'soft' }), true)
  assert.equal(statesEqual({ light: 'hard', dark: 'soft' }, { light: 'soft', dark: 'hard' }), false)
  assert.equal(statesEqual({ light: 'hard', dark: 'soft' }, { light: 'hard', dark: 'medium' }), false)

  assert.equal(isDefaultPair({ light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }), true)
  assert.equal(isDefaultPair({ light: DEFAULT_STATE.light, dark: 'hard' }), false)
  assert.equal(isDefaultPair({ light: 'medium', dark: DEFAULT_STATE.dark }), false)
})

test('set ops carry both strengths in one atomic mutation', () => {
  assert.deepEqual(stateToSetOps({ light: 'soft', dark: 'hard' }), [
    { op: 'set', path: ['light'], value: 'soft' },
    { op: 'set', path: ['dark'], value: 'hard' },
  ])
})

test('unset ops clear both fields so the config editor can drop the override row', () => {
  assert.deepEqual(stateToUnsetOps(), [
    { op: 'unset', path: ['light'] },
    { op: 'unset', path: ['dark'] },
  ])
})

test('shouldSeed only migrates a real non-default cache when the Host has no choice', () => {
  const chosen = { light: 'soft', dark: 'hard' }
  const defaults = { light: DEFAULT_STATE.light, dark: DEFAULT_STATE.dark }

  assert.equal(shouldSeed({}, chosen), true, 'a pre-0.3.0 choice must be seeded once')
  assert.equal(shouldSeed({}, { ...chosen }), true)
  assert.equal(shouldSeed({}, defaults), false, 'seeding the shipped default is pointless')
  assert.equal(shouldSeed({}, null), false, 'no cache means nothing to migrate')
  assert.equal(shouldSeed({ light: 'medium' }, chosen), false, 'the Host already has a choice')

  // A partial Host layer still counts as a choice: never overwrite it.
  assert.equal(shouldSeed({ light: 'medium' }, chosen), false)
})

test('bootHintState accepts only the versioned pair the Host row publishes', () => {
  assert.deepEqual(bootHintState({ version: STATE_VERSION, light: 'soft', dark: 'medium' }), {
    light: 'soft',
    dark: 'medium',
  })

  // Invalid fields fall back per side, exactly like the cache normalizer.
  assert.deepEqual(bootHintState({ version: STATE_VERSION, light: 'nope', dark: 'hard' }), {
    light: DEFAULT_STATE.light,
    dark: 'hard',
  })

  // No hint (old Host bundle, direct Client load) or a foreign shape means
  // "fall back to the localStorage cache".
  for (const hostile of [undefined, null, 'hard', 42, [], {}, { light: 'soft', dark: 'hard' }]) {
    assert.equal(bootHintState(hostile), null)
  }
  assert.equal(bootHintState({ version: 99, light: 'soft', dark: 'hard' }), null)
})
