import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeFilter, filterCatalog, isFilterActive, NO_FILTER, regimeCounts, toggleRegime } from './catalogFilter.ts'
import type { TleRecord } from '../api/types.ts'

const base = { inclination: 50, raan: 0, arg_of_perigee: 0, mean_anomaly: 0, epoch: '2026-09-30T00:00:00' }
const rec = (id: string, name: string, ecc: number, mm: number): TleRecord => ({ ...base, norad_cat_id: id, object_name: name, eccentricity: ecc, mean_motion: mm })
const iss = rec('25544', 'ISS (ZARYA)', 0.0007, 15.49)
const sl1 = rec('44713', 'STARLINK-1007', 0.0001, 15.06)
const sl2 = rec('44714', 'Starlink-1008', 0.0001, 15.06)
const geo = rec('36516', 'SES-1', 0.0002, 1.0027)
const heo = rec('20000', 'MOLNIYA 1-90', 0.74, 2.0)
const bad = rec('99999', 'BROKEN', 0, 0)
const all = [iss, sl1, sl2, geo, heo, bad]

test('no filter returns the very same rows', () => {
  assert.equal(filterCatalog(all, NO_FILTER), all)
  assert.equal(isFilterActive(NO_FILTER), false)
})

test('text matches name case-insensitively and trims', () => {
  const r = filterCatalog(all, { query: '  StarLink ', regimes: [] })
  assert.deepEqual(r.map((t) => t.norad_cat_id), ['44713', '44714'])
})

test('text matches NORAD id, including partial ids', () => {
  assert.deepEqual(filterCatalog(all, { query: '25544', regimes: [] }), [iss])
  assert.equal(filterCatalog(all, { query: '447', regimes: [] }).length, 2)
})

test('whitespace only is not a filter', () => {
  assert.equal(isFilterActive({ query: '   ', regimes: [] }), false)
  assert.equal(filterCatalog(all, { query: '   ', regimes: [] }), all)
})

test('regime chips filter by derived regime, several chips are an OR', () => {
  assert.deepEqual(filterCatalog(all, { query: '', regimes: ['GEO'] }), [geo])
  assert.deepEqual(filterCatalog(all, { query: '', regimes: ['GEO', 'HEO'] }), [geo, heo])
})

test('text and regime combine as AND; unclassifiable rows never match a regime', () => {
  assert.deepEqual(filterCatalog(all, { query: 'ses', regimes: ['LEO'] }), [])
  assert.deepEqual(filterCatalog(all, { query: 'broken', regimes: ['LEO', 'MEO', 'GEO', 'HEO'] }), [])
  assert.deepEqual(filterCatalog(all, { query: 'broken', regimes: [] }), [bad])
})

test('regimeCounts follows the text query, not the chips, and skips unclassifiable rows', () => {
  assert.deepEqual(regimeCounts(all, ''), { LEO: 3, MEO: 0, GEO: 1, HEO: 1 })
  assert.deepEqual(regimeCounts(all, 'starlink'), { LEO: 2, MEO: 0, GEO: 0, HEO: 0 })
})

test('toggleRegime adds, removes and keeps canonical order', () => {
  assert.deepEqual(toggleRegime([], 'GEO'), ['GEO'])
  assert.deepEqual(toggleRegime(['GEO'], 'LEO'), ['LEO', 'GEO'])
  assert.deepEqual(toggleRegime(['LEO', 'GEO'], 'LEO'), ['GEO'])
})

test('describeFilter names every active part', () => {
  assert.equal(describeFilter({ query: ' zz ', regimes: ['GEO', 'HEO'] }), 'name or NORAD id containing "zz" and regime GEO or HEO')
  assert.equal(describeFilter({ query: '', regimes: ['LEO'] }), 'regime LEO')
})
