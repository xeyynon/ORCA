import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseUtc, formatUtc, formatLongUtc, formatRelative, formatSimTime, NO_DATA } from './time.ts'

test('formatLongUtc writes a moment out in words, with the right ordinal', () => {
  assert.equal(formatLongUtc('2026-11-06T18:23:26'), 'November 6th, 2026 at 18:23')
  assert.equal(formatLongUtc('2026-01-01T00:05:00Z'), 'January 1st, 2026 at 00:05')
  assert.equal(formatLongUtc('2026-03-22T09:00:00'), 'March 22nd, 2026 at 09:00')
  assert.equal(formatLongUtc('2026-05-13T12:00:00'), 'May 13th, 2026 at 12:00')
  assert.equal(formatLongUtc(null), NO_DATA)
})
import { pc, fixed, integer, formatLat, formatLon } from './format.ts'
import { riskRank, countByRisk, riskTierSentence, RISK_ORDER } from './risk.ts'

test('riskTierSentence states every threshold in one plain sentence', () => {
  assert.equal(riskTierSentence(), 'A pair is rated CRITICAL when its Pc is greater than 10⁻⁴, HIGH when it is greater than 10⁻⁵, MEDIUM when it is greater than 10⁻⁶ and LOW when it is greater than 10⁻⁷. Any pair at or below all of these thresholds is rated NEGLIGIBLE.')
})
import { deriveOrbit, classifyRegime } from './orbit.ts'
import { toCsv } from './csv.ts'

test('parseUtc treats zone-less backend timestamps as UTC, not local', () => {
  assert.equal(parseUtc('2026-08-18T04:18:27').toISOString(), '2026-08-18T04:18:27.000Z')
  assert.equal(parseUtc('2026-08-18T04:18:27Z').toISOString(), '2026-08-18T04:18:27.000Z')
  assert.equal(parseUtc('2026-08-18T05:18:27+01:00').toISOString(), '2026-08-18T04:18:27.000Z')
})

test('formatUtc and formatRelative', () => {
  assert.equal(formatUtc('2026-08-18T04:18:27'), '2026-08-18 04:18 UTC')
  assert.equal(formatUtc(null), NO_DATA)
  assert.equal(formatUtc('not a date'), NO_DATA)
  const now = new Date('2026-10-02T00:00:00Z')
  assert.equal(formatRelative('2026-10-05T04:00:00', now), 'in 3d 4h')
  assert.equal(formatRelative('2026-10-01T21:55:00', now), '2h 05m ago')
})

test('pc is scientific and never fabricates', () => {
  assert.equal(pc(0.000123), '1.23 × 10⁻⁴')
  assert.equal(pc(2.5e-7), '2.50 × 10⁻⁷')
  assert.equal(pc(0), '0')
  assert.equal(pc(NaN), NO_DATA)
  assert.equal(pc(undefined), NO_DATA)
})

test('fixed / integer show an em dash for missing values', () => {
  assert.equal(fixed(3.14159, 2), '3.14')
  assert.equal(fixed(null, 2), NO_DATA)
  assert.equal(integer(9812.4), '9,812')
  assert.equal(integer(Infinity), NO_DATA)
})

test('risk ordering is worst-first and unknown levels sort last', () => {
  assert.deepEqual([...RISK_ORDER], ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NEGLIGIBLE'])
  assert.ok(riskRank('CRITICAL') < riskRank('NEGLIGIBLE'))
  assert.equal(riskRank('WAT'), RISK_ORDER.length)
  assert.deepEqual(
    countByRisk([{ risk_level: 'HIGH' }, { risk_level: 'HIGH' }, { risk_level: 'LOW' }, { risk_level: 'WAT' }]),
    { CRITICAL: 0, HIGH: 2, MEDIUM: 0, LOW: 1, NEGLIGIBLE: 0 },
  )
})

test('deriveOrbit: ISS mean motion gives ~93 min and a LEO orbit (rev/day -> rad/s boundary)', () => {
  const o = deriveOrbit({ mean_motion: 15.49484232, eccentricity: 0.0007536 })!
  assert.ok(Math.abs(o.periodMinutes - 92.93) < 0.05, `period ${o.periodMinutes}`)
  assert.ok(o.meanAltKm > 380 && o.meanAltKm < 430, `alt ${o.meanAltKm}`)
  assert.equal(o.regime, 'LEO')
})

test('deriveOrbit rejects non-physical mean motion instead of returning NaN', () => {
  assert.equal(deriveOrbit({ mean_motion: 0, eccentricity: 0 }), null)
  assert.equal(deriveOrbit({ mean_motion: NaN, eccentricity: 0 }), null)
})

test('regimes: GEO, MEO, HEO', () => {
  const geo = deriveOrbit({ mean_motion: 1.0027, eccentricity: 0.0002 })!
  assert.equal(geo.regime, 'GEO')
  assert.equal(deriveOrbit({ mean_motion: 2.0, eccentricity: 0.001 })!.regime, 'MEO')
  assert.equal(classifyRegime(500, 39000, 0.7), 'HEO')
})

test('toCsv quotes commas, quotes and newlines', () => {
  const out = toCsv(['a', 'b'], [['x,y', 'say "hi"'], [1, 'line\nbreak']])
  assert.equal(out, 'a,b\r\n"x,y","say ""hi"""\r\n1,"line\nbreak"\r\n')
})

test('latitude and longitude always carry their hemisphere letter', () => {
  assert.equal(formatLat(20.34), '20.3° N'); assert.equal(formatLat(-33.9), '33.9° S')
  assert.equal(formatLon(78.6), '78.6° E'); assert.equal(formatLon(-122.44), '122.4° W')
  assert.equal(formatLat(NaN), NO_DATA)
})

test('formatSimTime is UTC, zero-padded, and includes the seconds', () => {
  assert.equal(formatSimTime(Date.UTC(2026, 9, 3, 12, 0, 0)), 'On 03 Oct 2026 · At 12:00:00 UTC')
  assert.equal(formatSimTime(Date.UTC(2026, 0, 5, 7, 8, 9)), 'On 05 Jan 2026 · At 07:08:09 UTC')
  assert.equal(formatSimTime(NaN), NO_DATA)
})

import { percentileRank, rankWords } from './percentile'
test('percentileRank: below/above/tie/empty', () => {
  const v = [1, 2, 3, 4]
  assert.equal(percentileRank(v, 0), 0)
  assert.equal(percentileRank(v, 5), 100)
  assert.equal(percentileRank(v, 3), 62.5) // 2 below + half of 1 tie = 2.5 of 4
  assert.equal(percentileRank([], 1), null)
  assert.equal(percentileRank(v, NaN), null)
})

test('plural agrees the noun with the count', async () => {
  const { plural } = await import('./format.ts')
  assert.equal(plural(1, 'object'), '1 object')
  assert.equal(plural(108, 'object'), '108 objects')
  assert.equal(plural(2, 'entry', 'entries'), '2 entries')
})

test('rankWords: higher or lower in words, never 100% or 0%, nothing for no rank', () => {
  assert.equal(rankWords(54.2, 'loaded objects'), 'Higher than 54% of loaded objects')
  assert.equal(rankWords(50, 'loaded objects'), 'Higher than 50% of loaded objects')
  assert.equal(rankWords(17, 'loaded objects'), 'Lower than 83% of loaded objects')
  assert.equal(rankWords(99.8, 'loaded objects'), 'Higher than nearly all loaded objects')
  assert.equal(rankWords(0.1, 'loaded objects'), 'Lower than nearly all loaded objects')
  assert.equal(rankWords(null, 'loaded objects'), null)
})
