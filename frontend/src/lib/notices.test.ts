import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgeCount, buildNotices } from './notices.ts'

const calm = { apiStatus: 'online' as const, stale: null, searchPhase: 'idle' as const, searchSource: 'live' as const }

test('nothing is invented: a calm state has no notices and no badge', () => {
  assert.deepEqual(buildNotices(calm), [])
  assert.equal(badgeCount(buildNotices(calm)), 0)
})

test('real conditions are listed worst first, each with a place to act', () => {
  const n = buildNotices({ apiStatus: 'offline', stale: { title: 'Element sets are a median 30 days old' }, searchPhase: 'running', searchSource: 'live' })
  assert.deepEqual(n.map((x) => x.id), ['api', 'stale', 'search-running'])
  assert.deepEqual(n.map((x) => x.tone), ['bad', 'warn', 'ok'])
  assert.ok(n.every((x) => x.go))
  assert.equal(badgeCount(n), 2, 'good news does not count on the badge')
})

test('a finished live search is news; the stored example is not', () => {
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'done', searchSource: 'live' }).map((x) => x.id), ['search-done'])
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'done', searchSource: 'saved' }), [])
  assert.deepEqual(buildNotices({ ...calm, searchPhase: 'failed' }).map((x) => x.id), ['search-failed'])
})
