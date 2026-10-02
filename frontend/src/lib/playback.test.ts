import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_OFFSET_H, advance, clampOffset, offsetForTca, refetchEveryMs } from './playback.ts'

test('advance moves the sim clock by speed x real time, in hours', () => {
  assert.equal(advance(0, 60, 60).offsetH, 1) // 60x for 60 real seconds = 1 sim hour
  assert.equal(advance(2, 10, 360).offsetH, 3)
})

test('advance stops exactly at the end of the 7-day window and reports it', () => {
  const r = advance(MAX_OFFSET_H - 0.001, 60, 600)
  assert.equal(r.offsetH, MAX_OFFSET_H)
  assert.equal(r.atEnd, true)
  assert.equal(advance(1, 1, 1).atEnd, false)
})

test('the snapshot cadence is one per sim minute, but never faster than 1.2 s nor slower than 20 s', () => {
  assert.equal(refetchEveryMs(60), 1200) // 1 s would be asked for, clamped to the server-friendly floor
  assert.equal(refetchEveryMs(30), 2000)
  assert.equal(refetchEveryMs(10), 6000)
  assert.equal(refetchEveryMs(1), 20000) // 60 s would be asked for, clamped
})

test('clampOffset keeps the clock inside the window', () => {
  assert.equal(clampOffset(-5), 0)
  assert.equal(clampOffset(500), MAX_OFFSET_H)
  assert.equal(clampOffset(12.5), 12.5)
})

test('a closest approach can be jumped to only if it is between now and +7 days', () => {
  const now = Date.parse('2026-10-02T12:00:00Z')
  assert.deepEqual(offsetForTca(now + 3 * 3_600_000, now), { offsetH: 3 })
  assert.deepEqual(offsetForTca(now - 1000, now), { reason: 'past' })
  assert.deepEqual(offsetForTca(now + 200 * 3_600_000, now), { reason: 'beyond' })
})
