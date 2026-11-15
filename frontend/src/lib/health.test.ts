import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agoShort, healthHeadline, healthJson } from './health.ts'

const base = { checkedAt: null, latencyMs: null, error: null, intervalMs: 15_000 }

test('agoShort counts seconds, then minutes, then hours', () => {
  const now = new Date('2026-11-15T12:00:00Z')
  assert.equal(agoShort(null, now), 'not yet')
  assert.equal(agoShort(new Date('2026-11-15T11:59:56Z'), now), '4 s ago')
  assert.equal(agoShort(new Date('2026-11-15T11:57:00Z'), now), '3 min ago')
  assert.equal(agoShort(new Date('2026-11-15T10:50:00Z'), now), '1 h 10 min ago')
})

test('healthHeadline says what the last check showed, with the measured time only when there is one', () => {
  assert.deepEqual(healthHeadline('online', { ...base, latencyMs: 42 }), { tone: 'ok', title: 'The API is online', detail: 'It answered in 42 ms. Checked every 15 s from this browser.' })
  assert.equal(healthHeadline('online', base).detail, 'Checked every 15 s from this browser.')
  const off = healthHeadline('offline', { ...base, error: 'Failed to fetch' })
  assert.equal(off.tone, 'bad')
  assert.match(off.detail, /^Last error: Failed to fetch\. /)
  assert.equal(healthHeadline('checking', base).tone, 'warn')
})

test('healthJson pretty-prints the response, and nothing when there is none', () => {
  assert.equal(healthJson(null), '')
  assert.equal(healthJson({ status: 'healthy', timestamp: 't', database: { tles_count: 1, last_update: null } }).split('\n')[1], '  "status": "healthy",')
})
