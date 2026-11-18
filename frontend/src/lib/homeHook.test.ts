import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HOME_SUB, hookLines } from './homeHook.ts'

test('the headline quotes the real object count, and still reads before it arrives', () => {
  assert.equal(hookLines(15970).headline, 'ORCA follows 15,970 active satellites')
  assert.equal(hookLines(null).headline, 'ORCA follows thousands of active satellites')
  assert.equal(hookLines(0).headline, 'ORCA follows thousands of active satellites')
})

test('the headline names what the list holds (active satellites), never every object in orbit (audit 2026-11-18 #1)', () => {
  for (const f of [null, { stale: false, asOf: null }, { stale: true, asOf: '2026-10-08T05:26:00' }, { stale: true, asOf: null }]) {
    const h = hookLines(15970, f).headline
    assert.match(h, /active satellites/)
    assert.doesNotMatch(h, /objects|orbit around/)
  }
})

test('the supporting line says what ORCA does and quotes no run figure (those carry their run name in the KPIs)', () => {
  assert.equal(hookLines(15970).sub, HOME_SUB)
  assert.doesNotMatch(HOME_SUB, /\d/)
})

test('present tense only while the catalog is fresh; a stale one is dated, in the past tense', () => {
  assert.equal(hookLines(15970, { stale: false, asOf: '2026-10-08T05:26:00' }).headline, 'ORCA follows 15,970 active satellites')
  assert.equal(hookLines(15970, { stale: true, asOf: '2026-10-08T05:26:00' }).headline, 'ORCA was following 15,970 active satellites on 8 Oct 2026')
  assert.equal(hookLines(15970, { stale: true, asOf: null }).headline, 'There are 15,970 active satellites in our stored catalog')
})
