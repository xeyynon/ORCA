import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expectedRuntimeMinutes, resultAnswer, tableLine, tierCounts } from './conjunctionSummary.ts'

test('tier counts are zero-filled and keep every tier', () => {
  assert.deepEqual(tierCounts({ tier_counts: { HIGH: 3, LOW: 10 } }), { CRITICAL: 0, HIGH: 3, MEDIUM: 0, LOW: 10, NEGLIGIBLE: 0 })
})

test('runtime estimate scales with objects and horizon and never reads as zero', () => {
  assert.equal(expectedRuntimeMinutes(16000, 1), 2)
  assert.equal(expectedRuntimeMinutes(16000, 3), 6)
  assert.equal(expectedRuntimeMinutes(19, 1), 0.1)
})

const counts = (o: Partial<Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE', number>>) => ({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NEGLIGIBLE: 0, ...o })

test('the answer leads with what needs attention, over every approach found', () => {
  const a = resultAnswer(counts({ HIGH: 29, MEDIUM: 916, LOW: 65851, NEGLIGIBLE: 376022 }), 442818, 1, 10)
  assert.equal(a.tone, 'watch')
  assert.equal(a.headline, 'No critical approaches; 29 high-risk in the next 24 hours')
  assert.match(a.detail, /442,818 approaches closer than 10 km/)
  assert.match(a.detail, /441,873 of them rank low or negligible/)
})

test('critical wins the tone, and an all-quiet result still names its window', () => {
  assert.equal(resultAnswer(counts({ CRITICAL: 1, HIGH: 0 }), 5, 3, 10).headline, '1 critical and 0 high-risk approach in the next 3 days')
  const calm = resultAnswer(counts({ LOW: 2 }), 2, 2, 10)
  assert.equal(calm.tone, 'calm')
  assert.equal(calm.headline, 'No critical or high-risk approaches in the next 2 days')
})

test('tableLine names which approaches are listed, without repeating the total', () => {
  assert.equal(tableLine(100, 442786), 'The 100 most probable')
  assert.equal(tableLine(12, 12), 'All 12, most probable first')
})
