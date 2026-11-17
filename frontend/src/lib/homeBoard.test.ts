import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ConjunctionEvent } from '../api/types.ts'
import { fetchSummary, freshness, homeKpis, isPast, previewEvents, runName, runWindowLine } from './homeBoard.ts'
import type { HookRun } from './homeHook.ts'

const run: HookRun = { totalEvents: 442786, reportKm: 10, horizonDays: 1, highRisk: 29, critical: 0, windowStart: '2026-11-06T18:23:26', saved: true }

test('three figures, no object count (the headline says it); every run figure names its run, and the pair count is pairs within the distance, not conjunctions', () => {
  const k = homeKpis(run)
  assert.deepEqual(k.map((x) => x.value), ['442,786', '29', '0'])
  assert.equal(k[0].context, 'Pairs that came within 10 km in the sample run')
  assert.equal(k[1].context, 'Marked high risk in the sample run')
  assert.equal(k[2].context, 'Found in the sample run')
  assert.doesNotMatch(k.map((x) => `${x.label} ${x.context}`).join(' '), /live|real-time|collisions? found/i)
  assert.equal(homeKpis({ ...run, saved: false })[0].context, 'Pairs that came within 10 km in your latest search')
  assert.equal(runName({ saved: false }), 'your latest search')
  assert.equal(homeKpis({ ...run, saved: false })[1].context, 'Marked high risk in your latest search')
  assert.equal(runName({ saved: true }), 'the sample run')
})

test('figures that are not there yet are null (a skeleton), never 0', () => {
  assert.deepEqual(homeKpis(null).map((x) => x.value), [null, null, null])
})

test('a risk figure above zero carries its tier ink; zero stays neutral', () => {
  const k = homeKpis(run)
  assert.equal(k[1].tone, 'high')
  assert.equal(k[2].tone, undefined)
  assert.equal(homeKpis({ ...run, critical: 2 })[2].tone, 'critical')
})

const ev = (risk: ConjunctionEvent['risk_level'], pc: number, tca: string, id: string): ConjunctionEvent => ({
  sat1_id: id, sat1_name: `A${id}`, sat2_id: `${id}b`, sat2_name: `B${id}`, tca, min_distance_km: 1, probability_of_collision: pc,
  risk_level: risk, relative_velocity_kms: 7, tle_age_days: 3, uncertainty_km: 1, long_encounter: false,
})

test('the preview leads with the worst risk, then the higher Pc, then the sooner approach, and keeps five', () => {
  const events = [
    ev('LOW', 1e-7, '2026-11-06T20:00:00', '1'),
    ev('HIGH', 2e-5, '2026-11-06T22:00:00', '2'),
    ev('HIGH', 5e-5, '2026-11-06T23:00:00', '3'),
    ev('HIGH', 5e-5, '2026-11-06T21:00:00', '4'),
    ev('CRITICAL', 1e-4, '2026-11-07T01:00:00', '5'),
    ev('MEDIUM', 3e-6, '2026-11-06T19:00:00', '6'),
  ]
  assert.deepEqual(previewEvents(events).map((e) => e.sat1_id), ['5', '4', '3', '2', '6'])
  assert.equal(previewEvents([]).length, 0)
})

test('freshness never calls a month-old median fresh', () => {
  assert.equal(freshness(30).word, 'Rough guide only')
  assert.match(freshness(30).explain, /at least 30 days old/)
  assert.match(freshness(30).explain, /not for operational use/)
  assert.equal(freshness(3).tone, 'ok')
})

test('freshness wording stays true for the median it is given', () => {
  assert.match(freshness(2.4).explain, /no more than 3 days old/) // never "within 2 days" for a 2.4-day median
  assert.match(freshness(0.4).explain, /no more than twenty four hours old/)
  assert.match(freshness(0.4).explain, /epoch/)
  assert.doesNotMatch(freshness(0.4).explain, /measured/)
  assert.match(freshness(29.6).explain, /at least 29 days old/) // never "more than 30" for a 29.6-day median
})

test('the last fetch outcome is said in words', () => {
  assert.deepEqual(fetchSummary(null), { tone: 'warn', text: 'No download recorded yet' })
  assert.equal(fetchSummary({ status: 'ok', http_status: 200, detail: '', at: '' }).text, 'Successful')
  assert.equal(fetchSummary({ status: 'http_error', http_status: 503, detail: 'x', at: '' }).text, 'Failed (HTTP 503)')
  assert.equal(fetchSummary({ status: 'rate_limited', http_status: 403, detail: 'x', at: '' }).tone, 'warn')
})

test('a run window says when it was and, once over, how long ago (never reads as upcoming)', () => {
  const now = new Date(Date.UTC(2026, 10, 15, 15, 0))
  assert.equal(runWindowLine(run, '2026-11-07T18:23:26', now), 'Closest approaches during the sample run from 6 to 7 Nov 2026 (that window ended 7 days ago).')
  assert.equal(runWindowLine({ saved: false, windowStart: '2026-11-15T10:00:00' }, '2026-11-16T10:00:00', now), 'Closest approaches during your latest search from 15 to 16 Nov 2026.')
  assert.equal(runWindowLine({ saved: true, windowStart: '2026-11-14T01:00:00' }, '2026-11-14T20:00:00', now), 'Closest approaches during the sample run on 14 Nov 2026 (that window ended today).')
  assert.equal(isPast('2026-11-07T13:09:00', now), true)
  assert.equal(isPast('2026-11-16T13:09:00', now), false)
})
