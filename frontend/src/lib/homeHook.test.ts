import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HOME_SUB, hookLines } from './homeHook.ts'

test('the headline quotes the real object count, and still reads before it arrives', () => {
  assert.equal(hookLines(15970).headline, '15,970 objects are circling Earth right now.')
  assert.equal(hookLines(null).headline, 'Thousands of objects are circling Earth right now.')
  assert.equal(hookLines(0).headline, 'Thousands of objects are circling Earth right now.')
})

test('the supporting line says what ORCA does and quotes no run figure (those carry their run name in the KPIs)', () => {
  assert.equal(hookLines(15970).sub, HOME_SUB)
  assert.doesNotMatch(HOME_SUB, /\d/)
})
