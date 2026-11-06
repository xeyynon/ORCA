import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLICK_PX_PER_MS, SNAP_FRACTION, dragOffset, isDrag, offsetFor, releaseVelocity, settleExpanded } from './sheetSnap.ts'

const MAX = 400

test('offsetFor: expanded is 0, collapsed is the full travel', () => {
  assert.equal(offsetFor(true, MAX), 0)
  assert.equal(offsetFor(false, MAX), MAX)
  assert.equal(offsetFor(false, -10), 0) // a sheet with no travel cannot be pushed up
})

test('dragOffset follows the finger and stays within the travel', () => {
  assert.equal(dragOffset(MAX, -150, MAX), 250)
  assert.equal(dragOffset(0, 120, MAX), 120)
  assert.equal(dragOffset(0, -50, MAX), 0)
  assert.equal(dragOffset(MAX, 80, MAX), MAX)
})

test('isDrag ignores a few px of jitter on a tap', () => {
  assert.equal(isDrag(2, 3), false)
  assert.equal(isDrag(0, 12), true)
})

test('releaseVelocity uses only the last 100 ms and is signed (down positive)', () => {
  assert.equal(releaseVelocity([]), 0)
  assert.equal(releaseVelocity([{ t: 0, y: 0 }]), 0)
  // a slow start, then 100 px up in the last 50 ms
  const v = releaseVelocity([{ t: 0, y: 0 }, { t: 400, y: -10 }, { t: 450, y: -60 }, { t: 500, y: -110 }])
  assert.equal(v, -1)
  assert.equal(releaseVelocity([{ t: 0, y: 0 }, { t: 20, y: 10 }]), 0.5)
})

test('a slow short drag springs back; past a quarter of the travel it changes state', () => {
  const short = MAX * SNAP_FRACTION - 1
  assert.equal(settleExpanded(false, MAX - short, MAX, 0), false)
  assert.equal(settleExpanded(false, MAX - MAX * SNAP_FRACTION - 1, MAX, 0), true)
  assert.equal(settleExpanded(true, short, MAX, 0), true)
  assert.equal(settleExpanded(true, MAX * SNAP_FRACTION + 1, MAX, 0), false)
})

test('a flick decides by its direction, however short the drag', () => {
  assert.equal(settleExpanded(false, MAX - 10, MAX, -FLICK_PX_PER_MS), true)
  assert.equal(settleExpanded(true, 10, MAX, FLICK_PX_PER_MS), false)
  // a flick the other way overrides distance
  assert.equal(settleExpanded(false, 50, MAX, FLICK_PX_PER_MS * 2), false)
})

test('a sheet with no travel keeps its state', () => {
  assert.equal(settleExpanded(true, 0, 0, 5), true)
})
