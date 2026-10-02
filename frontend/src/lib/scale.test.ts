import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linearScale, logScale, decadeTicks } from './scale.ts'
import { compact } from './format.ts'
import { deriveSeries } from './catalog.ts'
import type { TleRecord } from '../api/types.ts'

test('linearScale maps the domain ends to the range ends and never returns NaN for a flat domain', () => {
  const s = linearScale(0, 10, 100, 200)
  assert.equal(s(0), 100)
  assert.equal(s(10), 200)
  assert.equal(s(5), 150)
  assert.equal(linearScale(3, 3, 0, 100)(3), 50)
})

test('logScale puts a decade at an equal distance: 100 -> 1,000 spans as far as 1,000 -> 10,000', () => {
  const s = logScale(100, 100000, 0, 300)
  assert.ok(Math.abs(s(100) - 0) < 1e-9 && Math.abs(s(100000) - 300) < 1e-9)
  assert.ok(Math.abs((s(1000) - s(100)) - (s(10000) - s(1000))) < 1e-9)
})

test('decadeTicks gives the powers of ten inside the range, and nothing for an invalid range', () => {
  assert.deepEqual(decadeTicks(1e-7, 1e-3), [1e-7, 1e-6, 1e-5, 1e-4, 1e-3])
  assert.deepEqual(decadeTicks(150, 5000), [1000])
  assert.deepEqual(decadeTicks(0, 100), [])
})

test('compact keeps axis ticks short and never prints NaN', () => {
  assert.equal(compact(173), '173')
  assert.equal(compact(1499), '1.5k')
  assert.equal(compact(35786), '35.8k')
  assert.equal(compact(240000), '240k')
  assert.equal(compact(0.5), '0.5')
  assert.equal(compact(0), '0')
  assert.equal(compact(NaN), '—')
})

const rec = (id: string, epoch: string, mm: number, incl: number): TleRecord => ({
  norad_cat_id: id, object_name: `OBJ-${id}`, epoch, inclination: incl, raan: 0, eccentricity: 0.001, arg_of_perigee: 0, mean_anomaly: 0, mean_motion: mm,
})

test('deriveSeries keeps columns aligned and leaves future epochs and non-physical orbits out of the right series only', () => {
  const now = new Date('2026-10-02T00:00:00Z')
  const s = deriveSeries([rec('1', '2026-10-01T00:00:00', 15.5, 51), rec('2', '2026-10-05T00:00:00', 15.5, 53), rec('3', '2026-09-01T00:00:00', 0, 97)], now)
  assert.equal(s.names.length, 3)
  assert.equal(s.inclDeg.length, 3) // inclination is read directly, so all three
  assert.equal(s.ageDays.length, 2) // the 2026-10-05 epoch is ahead of the clock
  assert.equal(s.altKm.length, 2) // mean motion 0 cannot be derived
  assert.equal(s.points.length, s.altKm.length)
})
