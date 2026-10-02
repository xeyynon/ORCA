import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sunDirectionEci } from './sun.ts'

const SIN_OBLIQUITY = Math.sin((23.44 * Math.PI) / 180) // 0.3978

test('the direction is a unit vector', () => {
  for (const d of ['2000-01-01T12:00:00Z', '2026-03-20T14:46:00Z', '2026-10-02T20:00:00Z']) {
    const v = sunDirectionEci(new Date(d))
    assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9)
  }
})

test('at the June solstice the Sun is over the northern hemisphere, at the December solstice over the southern', () => {
  assert.ok(Math.abs(sunDirectionEci(new Date('2026-06-21T09:00:00Z'))[2] - SIN_OBLIQUITY) < 0.01)
  assert.ok(Math.abs(sunDirectionEci(new Date('2026-12-21T15:00:00Z'))[2] + SIN_OBLIQUITY) < 0.01)
})

test('at the March equinox the Sun is on the equator toward +x', () => {
  const v = sunDirectionEci(new Date('2026-03-20T14:46:00Z'))
  assert.ok(Math.abs(v[2]) < 0.02, `z=${v[2]}`)
  assert.ok(v[0] > 0.99, `x=${v[0]}`)
})

test('at J2000 the Sun is near right ascension 281 degrees, declination -23 degrees (a well-known value)', () => {
  const v = sunDirectionEci(new Date('2000-01-01T12:00:00Z'))
  const ra = ((Math.atan2(v[1], v[0]) * 180) / Math.PI + 360) % 360
  const dec = (Math.asin(v[2]) * 180) / Math.PI
  assert.ok(Math.abs(ra - 281.3) < 0.6, `ra=${ra}`)
  assert.ok(Math.abs(dec + 23.0) < 0.3, `dec=${dec}`)
})

test('the Sun moves about one degree per day around the ecliptic', () => {
  const a = sunDirectionEci(new Date('2026-05-01T00:00:00Z')), b = sunDirectionEci(new Date('2026-05-02T00:00:00Z'))
  const deg = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI
  assert.ok(deg > 0.9 && deg < 1.05, `${deg} deg/day`)
})
