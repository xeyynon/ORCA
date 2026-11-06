import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expectedRuntimeMinutes, resultAnswer, resultHeadline, tierCounts } from './conjunctionSummary.ts'
import { integer } from './format.ts'

test('tier counts are zero-filled and keep every tier', () => {
  assert.deepEqual(tierCounts({ tier_counts: { HIGH: 3, LOW: 10 } }), { CRITICAL: 0, HIGH: 3, MEDIUM: 0, LOW: 10, NEGLIGIBLE: 0 })
})

test('a truncated list says it is the top of a larger set', () => {
  assert.equal(resultHeadline(100, 426418, 10), `Top 100 of ${integer(426418)} approaches closer than 10 km`)
})

test('a complete list says all, and singular and empty read naturally', () => {
  assert.equal(resultHeadline(12, 12, 10), 'All 12 approaches closer than 10 km')
  assert.equal(resultHeadline(1, 1, 10), 'All 1 approach closer than 10 km')
  assert.equal(resultHeadline(0, 0, 10), 'No approaches closer than 10 km')
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
