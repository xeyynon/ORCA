import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cameraGeo, eciToScene, extrapolate, occludedBySphere, occludedXYZ, nearestIndex, nearestScreenPoint } from './coords.ts'

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

test('cameraGeo: a camera on the equator over longitude 0 reports lat 0, lon 0 and its height above the surface', () => {
  const g = cameraGeo([20, 0, 0], 0)
  assert.ok(Math.abs(g.latDeg) < 1e-9 && Math.abs(g.lonDeg) < 1e-9)
  assert.ok(Math.abs(g.altKm - (20000 - 6371)) < 1e-6)
})

test('cameraGeo: north is up, east is toward scene -z, and the Earth turning moves the longitude the opposite way', () => {
  assert.ok(cameraGeo([0, 15, 0], 0).latDeg > 89.9)
  assert.ok(Math.abs(cameraGeo([0, 0, -15], 0).lonDeg - 90) < 1e-9) // ECI +y is scene -z
  assert.ok(Math.abs(cameraGeo([0, 0, -15], Math.PI / 2).lonDeg) < 1e-9) // the Earth has turned 90 deg east under it
  assert.ok(Math.abs(cameraGeo([-15, 0, 0], 0).lonDeg - 180) < 1e-9)
})

test('nearestIndex ignores hidden points, respects the radius, and returns -1 when nothing is close', () => {
  const xs = [100, 106, 200], ys = [100, 100, 200], hidden = [1, 0, 0]
  assert.equal(nearestIndex(xs, ys, hidden, 100, 100, 10), 1) // index 0 is closer but hidden
  assert.equal(nearestIndex(xs, ys, hidden, 150, 150, 10), -1)
  assert.equal(nearestIndex([], [], [], 0, 0, 10), -1)
})

test('occludedXYZ agrees with occludedBySphere on a grid of cases', () => {
  const cam: [number, number, number] = [20, 3, -2]
  for (let x = -12; x <= 12; x += 3) for (let y = -12; y <= 12; y += 3) for (let z = -12; z <= 12; z += 4) {
    assert.equal(occludedXYZ(cam[0], cam[1], cam[2], x, y, z, 6.371), occludedBySphere(cam, [x, y, z], 6.371), `${x},${y},${z}`)
  }
})
