import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HOME_SUB, hookLines } from './homeHook.ts'

test('the headline quotes the real object count, and still reads before it arrives', () => {
  assert.equal(hookLines(15970).headline, '15,970 objects currently orbit around the Earth')
  assert.equal(hookLines(null).headline, 'Thousands of objects currently orbit around the Earth')
  assert.equal(hookLines(0).headline, 'Thousands of objects currently orbit around the Earth')
})

test('the supporting line says what ORCA does and quotes no run figure (those carry their run name in the KPIs)', () => {
  assert.equal(hookLines(15970).sub, HOME_SUB)
  assert.doesNotMatch(HOME_SUB, /\d/)
})

test('"right now" only while the catalogue is fresh; a stale one is dated, in the past tense', () => {
  assert.equal(hookLines(15970, { stale: false, asOf: '2026-10-08T05:26:00' }).headline, '15,970 objects currently orbit around the Earth')
  assert.equal(hookLines(15970, { stale: true, asOf: '2026-10-08T05:26:00' }).headline, '15,970 objects were orbiting the Earth on 8 Oct 2026')
  assert.equal(hookLines(15970, { stale: true, asOf: null }).headline, 'There are 15,970 objects in our stored catalogue')
})
