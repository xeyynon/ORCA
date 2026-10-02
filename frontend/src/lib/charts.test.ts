import { test } from 'node:test'
import assert from 'node:assert/strict'
import { binLinear, binLog } from './histogram.ts'
import { binGrid, yEdge } from './heatmap.ts'
import { constellationOf, topGroups, UNNAMED } from './groups.ts'
import { inclinationClass, altitudeBand, INCLINATION_CLASSES } from './orbit.ts'
import { catColor, REGIME_COLOR, INCLINATION_COLOR, ALTITUDE_BAND_COLOR } from './chartColors.ts'

test('binLinear counts out-of-range values instead of hiding or clamping them', () => {
  const r = binLinear([0, 5, 10, 11, -1, NaN], { min: 0, max: 10, binCount: 2 })
  assert.equal(r.bins[0].count, 1) // 0
  assert.equal(r.bins[1].count, 2) // 5 and the inclusive max 10
  assert.equal(r.outside, 2) // 11 and -1
  assert.equal(r.unplottable, 1) // NaN
})

test('binLog separates a 170 km to 240,000 km spread that a linear axis would crush into one bar', () => {
  const alts = [...Array(50).fill(550), ...Array(5).fill(35786), 240000, 170]
  const r = binLog(alts, 12)
  assert.equal(r.bins.reduce((n, b) => n + b.count, 0), alts.length)
  const nonEmpty = r.bins.filter((b) => b.count > 0).length
  assert.ok(nonEmpty >= 4, `only ${nonEmpty} non-empty bins`) // 170, 550, 35786, 240000 are all visible
  assert.ok(r.bins[0].x0 <= 170.0001 && r.bins[11].x1 >= 239999)
})

test('binLog reports zeros as unplottable (a circular orbit has e = 0), not as a fake bin', () => {
  const r = binLog([0, 0, 1e-4, 1e-2, 0.5], 6)
  assert.equal(r.unplottable, 2)
  assert.equal(r.bins.reduce((n, b) => n + b.count, 0), 3)
})

test('binGrid: counts per cell, log y, and outside/unplottable are reported', () => {
  const spec = { xMin: 0, xMax: 180, xBins: 2, yMin: 100, yMax: 100000, yBins: 3, yLog: true }
  const g = binGrid([{ x: 10, y: 150 }, { x: 10, y: 160 }, { x: 100, y: 40000 }, { x: 10, y: 5 }, { x: 10, y: 0 }, { x: NaN, y: 1 }], spec)
  assert.equal(g.cells[0][0], 2) // 150 and 160 in the lowest row
  assert.equal(g.cells[2][1], 1) // 40000 in the top row, right column
  assert.equal(g.max, 2)
  assert.equal(g.total, 3)
  assert.equal(g.outside, 1) // y = 5 is below 100
  assert.equal(g.unplottable, 2) // y = 0 on a log axis, and NaN
  assert.ok(Math.abs(yEdge(spec, 0) - 100) < 1e-9 && Math.abs(yEdge(spec, 3) - 100000) < 1e-6)
})

test('constellationOf groups by leading word and keeps designator-only names apart', () => {
  assert.equal(constellationOf('STARLINK-32032'), 'STARLINK')
  assert.equal(constellationOf('ISS (ZARYA)'), 'ISS')
  assert.equal(constellationOf('COSMOS 2251 DEB'), 'COSMOS')
  assert.equal(constellationOf('2021-050D'), UNNAMED)
})

test('topGroups folds the tail into Other and conserves the total', () => {
  const names = [...Array(5).fill('STARLINK-1'), ...Array(3).fill('ONEWEB-2'), 'ISS (ZARYA)', 'NOAA 19']
  const g = topGroups(names, 2)
  assert.deepEqual(g.map((x) => x.label), ['STARLINK', 'ONEWEB', 'Other'])
  assert.equal(g.reduce((n, x) => n + x.count, 0), names.length)
})

test('inclinationClass and altitudeBand classify the well-known cases', () => {
  assert.equal(inclinationClass(0.05), 'equatorial')
  assert.equal(inclinationClass(51.6), 'mid')
  assert.equal(inclinationClass(53), 'mid')
  assert.equal(inclinationClass(87.9), 'polar')
  assert.equal(inclinationClass(97.6), 'retrograde')
  assert.equal(altitudeBand(550), 'LEO')
  assert.equal(altitudeBand(20200), 'MEO')
  assert.equal(altitudeBand(35786), 'GEO')
  assert.equal(altitudeBand(240000), 'BEYOND')
})

test('every chart colour is a CSS token reference, never a literal (rules.md §4)', () => {
  const all = [...Object.values(REGIME_COLOR), ...Object.values(INCLINATION_COLOR), ...Object.values(ALTITUDE_BAND_COLOR), catColor(0), catColor(7)]
  for (const c of all) assert.match(c, /^var\(--[a-z0-9-]+\)$/, c)
  for (const c of INCLINATION_CLASSES) assert.ok(INCLINATION_COLOR[c.id], c.id)
})

test('catColor cycles through the five categorical tokens', () => {
  assert.equal(catColor(0), 'var(--cat-1)')
  assert.equal(catColor(4), 'var(--cat-5)')
  assert.equal(catColor(5), 'var(--cat-1)')
})
