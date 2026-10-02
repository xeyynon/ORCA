import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCatalog } from './catalog.ts'
import type { TleRecord } from '../api/types.ts'

const base = { norad_cat_id: '1', object_name: 'X', inclination: 50, raan: 0, arg_of_perigee: 0, mean_anomaly: 0 }
const iss: TleRecord = { ...base, epoch: '2026-09-30T00:00:00', eccentricity: 0.0007, mean_motion: 15.49 }
const geo: TleRecord = { ...base, norad_cat_id: '2', epoch: '2026-09-20T00:00:00', eccentricity: 0.0002, mean_motion: 1.0027 }
const bad: TleRecord = { ...base, norad_cat_id: '3', epoch: '2026-09-25T00:00:00', eccentricity: 0, mean_motion: 0 }

test('summarizeCatalog counts regimes, ages and median, and reports unclassifiable objects instead of guessing', () => {
  const s = summarizeCatalog([iss, geo, bad], new Date('2026-10-01T00:00:00Z'))
  assert.equal(s.count, 3)
  assert.equal(s.regimes.LEO, 1)
  assert.equal(s.regimes.GEO, 1)
  assert.equal(s.unclassified, 1)
  assert.equal(Math.round(s.newestAgeDays!), 1)
  assert.equal(Math.round(s.oldestAgeDays!), 11)
  assert.ok(s.medianAltKm! > 1000) // median of {~400, ~35786}, the unclassified object excluded
})

test('summarizeCatalog on an empty catalog yields nulls, not zeros or NaN', () => {
  const s = summarizeCatalog([], new Date())
  assert.equal(s.count, 0)
  assert.equal(s.newestAgeDays, null)
  assert.equal(s.medianAltKm, null)
})
