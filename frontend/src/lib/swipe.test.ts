import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLICK_MIN_PX, SWIPE_MIN_PX, stepIndex, swipeStep } from './swipe.ts'

test('finger left is next, finger right is previous', () => {
  assert.equal(swipeStep(-SWIPE_MIN_PX, 0, 1000), 1)
  assert.equal(swipeStep(SWIPE_MIN_PX, 0, 1000), -1)
})

test('a slow drag shorter than the minimum is not a swipe', () => {
  assert.equal(swipeStep(-(SWIPE_MIN_PX - 1), 0, 1000), 0)
})

test('a quick flick needs less distance, but not less than the flick minimum', () => {
  assert.equal(swipeStep(-40, 0, 50), 1) // 0.8 px/ms
  assert.equal(swipeStep(-(FLICK_MIN_PX - 1), 0, 10), 0)
})

test('a mostly vertical movement (a scroll) is never a swipe', () => {
  assert.equal(swipeStep(-80, 60, 200), 0)
  assert.equal(swipeStep(-80, 50, 200), 1) // 80 > 1.5 x 50
})

test('stepIndex stops at both ends and ignores a non-swipe', () => {
  assert.equal(stepIndex(0, 1, 3), 1)
  assert.equal(stepIndex(2, 1, 3), null)
  assert.equal(stepIndex(0, -1, 3), null)
  assert.equal(stepIndex(1, 0, 3), null)
  assert.equal(stepIndex(-1, 1, 3), null) // selection not in the list
})
