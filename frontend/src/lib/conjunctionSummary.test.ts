import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expectedRuntimeMinutes, resultHeadline, tierCounts } from './conjunctionSummary.ts'
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
