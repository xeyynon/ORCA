import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgeCount, buildNotices } from './notices.ts'

const calm = { apiStatus: 'online' as const, stale: null, searchPhase: 'idle' as const, searchSource: 'live' as const }

test('nothing is invented: a calm state has no notices and no badge', () => {
  assert.deepEqual(buildNotices(calm), [])
  assert.equal(badgeCount(buildNotices(calm)), 0)
})

test('real conditions are listed worst first, each with a place to act', () => {
  const n = buildNotices({ apiStatus: 'offline', stale: { title: 'The orbit data has a median age of 30 days' }, searchPhase: 'running', searchSource: 'live' })
  assert.deepEqual(n.map((x) => x.id), ['api', 'stale', 'search-running'])
  assert.deepEqual(n.map((x) => x.tone), ['bad', 'warn', 'warn'])
  assert.ok(n.every((x) => x.go))
  assert.equal(badgeCount(n), 2, 'a search under way does not count on the badge')
})

test('a finished live search is news; the stored example is not', () => {
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'done', searchSource: 'live' }).map((x) => x.id), ['search-done'])
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'done', searchSource: 'saved' }), [])
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'failed' }).map((x) => x.id), ['search-failed'])
})

test('a running search has the same amber tone as the status bar, and does not count on the badge (audit 2026-11-18 #34)', () => {
  const n = buildNotices({ ...calm, searchPhase: 'running' })
  assert.deepEqual(n.map((x) => [x.id, x.tone]), [['search-running', 'warn']])
  assert.equal(badgeCount(n), 0)
})

test('the outage notice opens the API health page and says it in plain words (audit 2026-11-18 #19)', () => {
  const [api] = buildNotices({ ...calm, apiStatus: 'offline' })
  assert.equal(api.go, 'health')
  assert.doesNotMatch(api.title, /API/)
})
