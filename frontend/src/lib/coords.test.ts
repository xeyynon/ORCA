import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eciToScene, extrapolate, occludedBySphere, nearestScreenPoint } from './coords.ts'

test('eciToScene maps north (+z) to three +y and ECI +y to three -z, scaled to 1000 km', () => {
  assert.deepEqual(eciToScene([0, 0, 6371]), [0, 6.371, -0])
  assert.deepEqual(eciToScene([1000, 0, 0]), [1, 0, -0])
  assert.deepEqual(eciToScene([0, 1000, 0]), [0, 0, -1])
})

test('the frame map is a proper rotation: cross(x,y) = z is preserved', () => {
  // 1000 km axes map to exact scene unit vectors, so the scale factor cancels.
  const ex = eciToScene([1000, 0, 0]), ey = eciToScene([0, 1000, 0]), ez = eciToScene([0, 0, 1000])
  const cross = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]]
  assert.deepEqual(cross.map((c) => c + 0), ez.map((c) => c + 0)) // +0 normalises -0
})

test('extrapolate moves along velocity', () => {
  assert.deepEqual(extrapolate([7000, 0, 0], [0, 7.5, 0], 20), [7000, 150, 0])
})

test('occlusion: a satellite on the far side of the Earth is hidden, one on the near side is not', () => {
  const cam: [number, number, number] = [20, 0, 0]
  assert.equal(occludedBySphere(cam, [-7, 0, 0], 6.371), true)
  assert.equal(occludedBySphere(cam, [7, 0, 0], 6.371), false)
  assert.equal(occludedBySphere(cam, [0, 9, 0], 6.371), false) // off to the side, clear of the limb
})

test('nearestScreenPoint ignores hidden points and respects the pick radius', () => {
  const pts = [
    { id: 'a', x: 100, y: 100, hidden: true },
    { id: 'b', x: 106, y: 100, hidden: false },
    { id: 'c', x: 200, y: 200, hidden: false },
  ]
  assert.equal(nearestScreenPoint(pts, 100, 100, 10), 'b') // 'a' is closer but hidden
  assert.equal(nearestScreenPoint(pts, 150, 150, 10), null)
})
