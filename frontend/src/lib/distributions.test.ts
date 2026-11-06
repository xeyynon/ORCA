import { test } from 'node:test'
import assert from 'node:assert/strict'
import { columnsToRows } from './distributions.ts'
import { deriveSeries } from './catalog.ts'
import { topGroups } from './groups.ts'
import type { CatalogColumns } from '../api/types.ts'

const cols: CatalogColumns = {
  count: 3,
  name: ['STARLINK-1', 'STARLINK-2', 'ISS (ZARYA)'],
  epoch_unix_s: [Date.UTC(2026, 9, 30) / 1000, Date.UTC(2026, 9, 29) / 1000, Date.UTC(2026, 9, 1) / 1000],
  inclination_deg: [53, 53.05, 51.6416],
  eccentricity: [0.0001, 0.0002, 0.0007536],
  mean_motion_rev_per_day: [15.06, 15.07, 15.49484232],
}

test('columnsToRows rebuilds one row per object, with the epoch as a UTC ISO string', () => {
  const rows = columnsToRows(cols)!
  assert.equal(rows.length, 3)
  assert.equal(rows[2].object_name, 'ISS (ZARYA)')
  assert.equal(rows[2].epoch, '2026-10-01T00:00:00.000Z')
  assert.equal(rows[0].mean_motion, 15.06)
})

test('the rebuilt rows feed the same series code as the loaded rows (age in days, altitude from mean motion)', () => {
  const s = deriveSeries(columnsToRows(cols)!, new Date('2026-11-01T00:00:00Z'))
  assert.deepEqual(s.ageDays.map(Math.round), [2, 3, 31])
  assert.ok(s.altKm.every((a) => a > 300 && a < 700))
  assert.deepEqual(topGroups(s.names, 8), [{ label: 'STARLINK', count: 2 }, { label: 'ISS', count: 1 }])
})

test('columns of different lengths, or a wrong count, are refused rather than drawn', () => {
  assert.equal(columnsToRows({ ...cols, eccentricity: [0.1] }), null)
  assert.equal(columnsToRows({ ...cols, count: 4 }), null)
})

test('an empty catalog gives no rows', () => {
  assert.deepEqual(columnsToRows({ count: 0, name: [], epoch_unix_s: [], inclination_deg: [], eccentricity: [], mean_motion_rev_per_day: [] }), [])
})
