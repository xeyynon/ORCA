import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countPast, pairKey } from './pair.ts'

const now = new Date('2026-10-02T12:00:00Z')

test('countPast counts events whose TCA is before now, treating zone-less timestamps as UTC', () => {
  const events = [{ tca: '2026-08-22T10:47:00' }, { tca: '2026-10-02T11:59:59' }, { tca: '2026-10-02T12:00:01' }, { tca: '2026-10-09T00:00:00' }]
  assert.equal(countPast(events, now), 2)
  assert.equal(countPast([], now), 0)
})

test('pairKey distinguishes the same pair at different closest-approach times', () => {
  const a = { sat1_id: '1', sat2_id: '2', tca: '2026-08-22T10:47:00' }
  assert.notEqual(pairKey(a), pairKey({ ...a, tca: '2026-08-23T10:47:00' }))
  assert.equal(pairKey(a), pairKey({ ...a }))
})
