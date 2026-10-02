import { test } from 'node:test'
import assert from 'node:assert/strict'
import { histogram } from './histogram.ts'

test('histogram counts every finite value exactly once, max included in the last bin', () => {
  const bins = histogram([0, 1, 2, 3, 4, 10], 5)
  assert.equal(bins.length, 5)
  assert.equal(bins.reduce((n, b) => n + b.count, 0), 6)
  assert.equal(bins[4].count, 1) // 10 is the max and must not fall off the end
  assert.equal(bins[0].count, 2) // 0 and 1
})

test('histogram ignores NaN/Infinity and handles empty or constant input', () => {
  assert.deepEqual(histogram([], 5), [])
  assert.deepEqual(histogram([NaN, Infinity], 5), [])
  assert.deepEqual(histogram([7, 7, 7], 5), [{ x0: 7, x1: 7, count: 3 }])
  assert.equal(histogram([1, NaN, 2], 2).reduce((n, b) => n + b.count, 0), 2)
})
