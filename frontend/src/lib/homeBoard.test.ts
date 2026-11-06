import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ConjunctionEvent } from '../api/types.ts'
import { fetchSummary, freshness, homeKpis, previewEvents, runName } from './homeBoard.ts'
import type { HookRun } from './homeHook.ts'

const run: HookRun = { totalEvents: 442786, reportKm: 10, horizonDays: 1, highRisk: 29, critical: 0, windowStart: '2026-11-06T18:23:26', saved: true }

test('every run figure names its run, and the pair count is pairs within the distance, not conjunctions', () => {
  const k = homeKpis(15970, run)
  assert.deepEqual(k.map((x) => x.value), ['15,970', '442,786', '29', '0'])
  assert.equal(k[1].context, 'Pairs within 10 km in the stored example run')
  assert.equal(k[2].context, 'Flagged in the stored example run')
  assert.equal(k[3].context, 'In the stored example run')
  assert.doesNotMatch(k.map((x) => `${x.label} ${x.context}`).join(' '), /live|real-time|collisions? found/i)
  assert.equal(homeKpis(15970, { ...run, saved: false })[1].context, 'Pairs within 10 km in your latest search')
  assert.equal(runName({ saved: false }), 'your latest search')
  assert.equal(homeKpis(15970, { ...run, saved: false })[2].context, 'Flagged in your latest search')
  assert.equal(runName({ saved: true }), 'the stored example run')
})

test('figures that are not there yet are null (a skeleton), never 0', () => {
  assert.deepEqual(homeKpis(null, null).map((x) => x.value), [null, null, null, null])
  assert.equal(homeKpis(0, null)[0].value, null)
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
  assert.equal(freshness(30).word, 'Indicative only')
  assert.match(freshness(30).explain, /over 30 days old/)
  assert.match(freshness(30).explain, /not operational/)
  assert.equal(freshness(3).tone, 'ok')
})

test('the last fetch outcome is said in words', () => {
  assert.deepEqual(fetchSummary(null), { tone: 'warn', text: 'No fetch recorded yet' })
  assert.equal(fetchSummary({ status: 'ok', http_status: 200, detail: '', at: '' }).text, 'Succeeded')
  assert.equal(fetchSummary({ status: 'http_error', http_status: 503, detail: 'x', at: '' }).text, 'Failed (HTTP 503)')
  assert.equal(fetchSummary({ status: 'rate_limited', http_status: 403, detail: 'x', at: '' }).tone, 'warn')
})
