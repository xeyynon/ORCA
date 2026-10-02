import { test } from 'node:test'
import assert from 'node:assert/strict'
import { smoothstep, spherePoint } from './sphere.ts'

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`)

test('the point facing the viewer, with no tilt or spin, is lon 0 / lat 0: the middle of the map', () => {
  const p = spherePoint(0, 0, 0, 0)!
  close(p.u, 0.5); close(p.v, 0.5); close(p.nz, 1)
})

test('outside the disc there is no sphere', () => {
  assert.equal(spherePoint(0.8, 0.8, 0, 0), null)
  assert.equal(spherePoint(1.0001, 0, 0, 0), null)
})

test('the top of the disc is near the north pole (top of the map) and the bottom near the south', () => {
  assert.ok(spherePoint(0, 0.999, 0, 0)!.v < 0.05)
  assert.ok(spherePoint(0, -0.999, 0, 0)!.v > 0.95)
})

test('spinning the sphere east by 90 degrees moves the facing longitude a quarter of the map', () => {
  const a = spherePoint(0, 0, 0, 0)!, b = spherePoint(0, 0, 0, Math.PI / 2)!
  close((b.u - a.u + 1) % 1, 0.25)
})

test('a full turn returns to the same place, and u always stays in [0, 1)', () => {
  const a = spherePoint(0.3, -0.2, 0.4, 1.1)!, b = spherePoint(0.3, -0.2, 0.4, 1.1 + 2 * Math.PI)!
  close(a.u, b.u, 1e-9); close(a.v, b.v)
  for (const rot of [-7, -0.1, 0, 3.3, 20]) { const u = spherePoint(0.2, 0.1, 0.3, rot)!.u; assert.ok(u >= 0 && u < 1) }
})

test('leaning the north pole toward the viewer lifts the facing point above the equator', () => {
  const flat = spherePoint(0, 0, 0, 0)!, tilted = spherePoint(0, 0, 0.4, 0)!
  close(flat.v, 0.5)
  assert.ok(tilted.v < 0.5, 'facing point should now be north of the equator')
  close(tilted.v, 0.5 - 0.4 / Math.PI, 1e-9) // lat = tilt
})

test('east is to the right: a point right of centre is at a larger longitude', () => {
  assert.ok(spherePoint(0.5, 0, 0, 0)!.u > spherePoint(-0.5, 0, 0, 0)!.u)
})

test('smoothstep clamps and is monotonic', () => {
  assert.equal(smoothstep(0, 1, -5), 0); assert.equal(smoothstep(0, 1, 5), 1)
  assert.ok(smoothstep(0, 1, 0.3) < smoothstep(0, 1, 0.7))
})
