import { test } from 'node:test'
import assert from 'node:assert/strict'
import { durationText, expectedRuntimeMinutes, resultAnswer, tableLine, tierCounts, windowText } from './conjunctionSummary.ts'

test('tier counts are zero-filled and keep every tier', () => {
  assert.deepEqual(tierCounts({ tier_counts: { HIGH: 3, LOW: 10 } }), { CRITICAL: 0, HIGH: 3, MEDIUM: 0, LOW: 10, NEGLIGIBLE: 0 })
})

test('runtime estimate scales with objects and horizon and never reads as zero', () => {
  assert.equal(expectedRuntimeMinutes(16000, 1), 2)
  assert.equal(expectedRuntimeMinutes(16000, 3), 6)
  assert.equal(expectedRuntimeMinutes(19, 1), 0.1)
})

const counts = (o: Partial<Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE', number>>) => ({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NEGLIGIBLE: 0, ...o })

const win = { start: '2026-11-18T10:54:12.5', end: '2026-11-19T10:54:12.5' }

test('the answer leads with what needs attention, over every approach found', () => {
  const a = resultAnswer(counts({ HIGH: 29, MEDIUM: 916, LOW: 65851, NEGLIGIBLE: 376022 }), 442818, win, 10)
  assert.equal(a.tone, 'watch')
  assert.equal(a.headline, 'No approaches ranked critical and 29 ranked high, 18 Nov 10:54 to 19 Nov 10:54 UTC')
  assert.match(a.detail, /442,818 approaches closer than 10 km/)
  assert.match(a.detail, /Of these, 441,873 were ranked low or negligible/)
})

test('critical wins the tone, and an all-quiet result still names its window', () => {
  assert.equal(resultAnswer(counts({ CRITICAL: 5, HIGH: 166 }), 313514, win, 10).headline, '5 approaches ranked critical and 166 ranked high, 18 Nov 10:54 to 19 Nov 10:54 UTC')
  assert.equal(resultAnswer(counts({ CRITICAL: 1 }), 5, win, 10).headline, '1 approach ranked critical and 0 ranked high, 18 Nov 10:54 to 19 Nov 10:54 UTC')
  const calm = resultAnswer(counts({ LOW: 2 }), 2, { start: '2026-11-06T18:23:26', end: '2026-11-08T18:23:26' }, 10)
  assert.equal(calm.tone, 'calm')
  assert.equal(calm.headline, 'No approaches ranked critical or high, 6 Nov 18:23 to 8 Nov 18:23 UTC')
})

test('a window is named by its dates, never as "the next" hours (the saved run lies in the past)', () => {
  const saved = resultAnswer(counts({ HIGH: 29 }), 442786, { start: '2026-11-06T18:23:26.126528', end: '2026-11-07T18:23:26.126528' }, 10)
  assert.doesNotMatch(saved.headline, /next|within/)
  assert.equal(windowText('2026-12-31T22:00:00Z', '2027-01-01T22:00:00Z'), '31 Dec 2026 22:00 to 1 Jan 2027 22:00 UTC')
  assert.equal(windowText('not a date', '2026-11-19T10:54:00'), '—')
})

test('the run time reads as a person says it', () => {
  assert.equal(durationText(45.4), '45 s')
  assert.equal(durationText(200), '3 min 20 s')
  assert.equal(durationText(180), '3 min')
  assert.equal(durationText(3900), '1 h 5 min')
})

test('tableLine names which approaches are listed, without repeating the total', () => {
  assert.equal(tableLine(100, 442786), 'The 100 most likely approaches')
  assert.equal(tableLine(12, 12), 'Showing all 12, with the most likely first')
})
