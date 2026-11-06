import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hookLines, riskStat } from './homeHook.ts'
import type { HookRun } from './homeHook.ts'

const run: HookRun = { totalEvents: 442786, reportKm: 10, horizonDays: 1, highRisk: 29, critical: 0, windowStart: '2026-11-06T18:23:26.126528', saved: true }

test('the headline quotes the real object count, and still reads before it arrives', () => {
  assert.equal(hookLines(15970, null).headline, '15,970 objects are circling Earth right now.')
  assert.equal(hookLines(null, null).headline, 'Thousands of objects are circling Earth right now.')
  assert.equal(hookLines(0, null).headline, 'Thousands of objects are circling Earth right now.')
})

test('with a run, the second sentence quotes its pair count and says where it came from', () => {
  const l = hookLines(15970, run)
  assert.equal(l.sub, 'In one day of their orbits, 442,786 pairs came within 10 km of each other. ORCA finds those close approaches and shows how risky each one is.')
  assert.match(l.source ?? '', /^Pair and risk counts from a stored example run starting 2026-11-06 18:23/)
  assert.match(hookLines(15970, { ...run, saved: false, horizonDays: 3 }).sub, /^In 3 days of their orbits/)
  assert.match(hookLines(15970, { ...run, saved: false }).source ?? '', /^Pair and risk counts from your search/)
})

test('without a run (or an empty one) no figure is quoted and no source is claimed', () => {
  for (const r of [null, { ...run, totalEvents: 0 }]) {
    const l = hookLines(15970, r)
    assert.doesNotMatch(l.sub, /\d/)
    assert.equal(l.source, null)
  }
})

test('the risk stat leads with the most severe tier that has any, never the alarming total', () => {
  assert.deepEqual(riskStat(run), { figure: '29', caption: 'high-risk approaches', note: 'none critical' })
  assert.deepEqual(riskStat({ ...run, critical: 2 }), { figure: '2', caption: 'critical approaches', note: 'plus 29 high-risk' })
  assert.deepEqual(riskStat({ ...run, critical: 1, highRisk: 1 }), { figure: '1', caption: 'critical approach', note: 'plus 1 high-risk' })
  assert.deepEqual(riskStat({ ...run, totalEvents: 0 }), { figure: '0', caption: 'pairs within 10 km', note: null })
  assert.equal(riskStat(null), null)
})
