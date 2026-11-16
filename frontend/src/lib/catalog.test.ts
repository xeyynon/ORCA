import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCatalog } from './catalog.ts'
import { tleAgeTone } from './tleAge.ts'
import type { TleRecord } from '../api/types.ts'

const base = { norad_cat_id: '1', object_name: 'X', inclination: 50, raan: 0, arg_of_perigee: 0, mean_anomaly: 0 }
const iss: TleRecord = { ...base, epoch: '2026-09-30T00:00:00', eccentricity: 0.0007, mean_motion: 15.49 }
const geo: TleRecord = { ...base, norad_cat_id: '2', epoch: '2026-09-20T00:00:00', eccentricity: 0.0002, mean_motion: 1.0027 }
const bad: TleRecord = { ...base, norad_cat_id: '3', epoch: '2026-09-25T00:00:00', eccentricity: 0, mean_motion: 0 }
const ahead: TleRecord = { ...base, norad_cat_id: '4', epoch: '2026-10-03T00:00:00', eccentricity: 0.0007, mean_motion: 15.49 }

test('summarizeCatalog counts regimes, ages and median, and reports unclassifiable objects instead of guessing', () => {
  const s = summarizeCatalog([iss, geo, bad], new Date('2026-10-01T00:00:00Z'))
  assert.equal(s.count, 3)
  assert.equal(s.regimes.LEO, 1)
  assert.equal(s.regimes.GEO, 1)
  assert.equal(s.unclassified, 1)
  assert.equal(Math.round(s.newestAgeDays!), 1)
  assert.equal(Math.round(s.oldestAgeDays!), 11)
  assert.ok(s.medianAltKm! > 1000) // median of {~400, ~35786}, the unclassified object excluded
  assert.equal(s.futureEpochs, 0)
})

test('summarizeCatalog on an empty catalog yields nulls, not zeros or NaN', () => {
  const s = summarizeCatalog([], new Date())
  assert.equal(s.count, 0)
  assert.equal(s.newestAgeDays, null)
  assert.equal(s.medianAltKm, null)
  assert.equal(s.medianAgeDays, null)
})

test('an epoch ahead of the clock is counted apart and cannot make "newest" negative', () => {
  // Real case: one object (CXO) published an epoch 2 days ahead and showed "Newest TLE -2.0 d".
  const s = summarizeCatalog([iss, geo, ahead], new Date('2026-10-01T00:00:00Z'))
  assert.equal(s.futureEpochs, 1)
  assert.ok(s.newestAgeDays! >= 0, `newest ${s.newestAgeDays}`)
  assert.equal(Math.round(s.newestAgeDays!), 1) // the iss record, not the future one
  assert.equal(s.count, 3) // it is still an object in the catalog
})

test('tleAgeTone: fresh, aging, stale, and a negative age is flagged rather than shown as fresh', () => {
  assert.equal(tleAgeTone(0.5), 'ok')
  assert.equal(tleAgeTone(10), 'warn')
  assert.equal(tleAgeTone(45), 'bad')
  assert.equal(tleAgeTone(-2), 'warn')
})

test('a one-band age spread is said in words, a mixed one is left to the chart', async () => {
  const { ageVerdict } = await import('./tleAge.ts')
  assert.equal(ageVerdict({ ok: 0, warn: 0, bad: 15970 }, 15970), 'All 15,970 sets of orbit data are more than 30 days old.')
  assert.equal(ageVerdict({ ok: 3, warn: 0, bad: 15967 }, 15970), null)
  assert.equal(ageVerdict({ ok: 0, warn: 0, bad: 0 }, 0), null)
})
