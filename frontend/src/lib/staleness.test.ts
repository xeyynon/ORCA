import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STALE_MEDIAN_DAYS, staleNotice } from './staleness.ts'

test('fresh or unknown data raises no notice', () => {
  assert.equal(staleNotice(null, null), null)
  assert.equal(staleNotice(STALE_MEDIAN_DAYS, 20), null)
  assert.equal(staleNotice(1.2, 3), null)
})

test('old data raises one notice that states the median and the oldest', () => {
  const n = staleNotice(30.1, 80.6)
  assert.ok(n)
  assert.equal(n.title, 'The orbit data has a median age of 30 days')
  assert.match(n.body, /The oldest is 81 days/)
  assert.match(n.body, /rough guide/)
})

import { staleBand } from './staleness.ts'

test('the stale band changes once a week, and an unknown age has no band', () => {
  assert.equal(staleBand(null), null)
  assert.equal(staleBand(Number.NaN), null)
  assert.equal(staleBand(6.9), 0)
  assert.equal(staleBand(7), 1)
  assert.equal(staleBand(30.1), 4)
  assert.equal(staleBand(34.9), 4)
  assert.equal(staleBand(35), 5)
})
