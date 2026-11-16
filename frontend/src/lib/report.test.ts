import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ConjunctionEvent } from '../api/types.ts'
import { blockedReason, DEFAULT_REPORT, defaultPairKey, includedSections, reportFileName, reportReference, tierRows } from './report.ts'
import type { ReportOptions } from './report.ts'

const ev = (id: string, risk: ConjunctionEvent['risk_level'] = 'HIGH'): ConjunctionEvent => ({
  sat1_id: id, sat1_name: `A${id}`, sat2_id: `${id}b`, sat2_name: `B${id}`, tca: '2026-11-07T10:00:00', min_distance_km: 1,
  probability_of_collision: 1e-5, risk_level: risk, relative_velocity_kms: 7, tle_age_days: 3, uncertainty_km: 1, long_encounter: false,
})
const key = (id: string) => `${id}|${id}b|2026-11-07T10:00:00`

test('sections come out in report order, whatever order they were ticked in', () => {
  const o: ReportOptions = { ...DEFAULT_REPORT, sections: { quality: true, pair: true, summary: false, approaches: true } }
  assert.deepEqual(includedSections(o), ['approaches', 'pair', 'quality'])
  assert.deepEqual(includedSections(DEFAULT_REPORT), ['summary', 'approaches', 'quality'])
})

test('a report never goes out with an empty section', () => {
  const none: ReportOptions = { ...DEFAULT_REPORT, sections: { summary: false, approaches: false, pair: false, quality: false } }
  assert.equal(blockedReason(none, true, []), 'Choose at least one section.')
  assert.equal(blockedReason(DEFAULT_REPORT, false, []), 'The close-approach run is still loading.')
  const pair: ReportOptions = { ...DEFAULT_REPORT, sections: { ...DEFAULT_REPORT.sections, pair: true } }
  assert.equal(blockedReason({ ...pair, pairKey: null }, true, [ev('1')]), 'Choose which pair to analyse.')
  assert.equal(blockedReason({ ...pair, pairKey: key('9') }, true, [ev('1')]), 'Choose which pair to analyse.')
  assert.equal(blockedReason({ ...pair, pairKey: key('1') }, true, [ev('1')]), null)
  // Summary and quality alone do not need the run.
  assert.equal(blockedReason({ ...DEFAULT_REPORT, sections: { summary: true, approaches: false, pair: false, quality: true } }, false, []), null)
})

test('the preselected pair is the one already chosen on Conjunctions, else the worst of the run', () => {
  const events = [ev('1'), ev('2')]
  assert.equal(defaultPairKey(events, key('2'), events[0]), key('2'))
  assert.equal(defaultPairKey(events, key('7'), events[0]), key('1'))
  assert.equal(defaultPairKey([], null, undefined), null)
})

test('every risk tier is listed in severity order, with 0 where the run had none', () => {
  assert.deepEqual(tierRows({ HIGH: 29, MEDIUM: 400 }), [
    { level: 'CRITICAL', count: 0 }, { level: 'HIGH', count: 29 }, { level: 'MEDIUM', count: 400 }, { level: 'LOW', count: 0 }, { level: 'NEGLIGIBLE', count: 0 },
  ])
})

test('the file name and reference are UTC and sortable', () => {
  const t = new Date(Date.UTC(2026, 10, 7, 9, 5))
  assert.equal(reportFileName(t), 'ORCA-report-2026-11-07-0905-UTC')
  assert.equal(reportReference(t), 'ORCA-20261107-0905')
})
