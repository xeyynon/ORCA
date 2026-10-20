import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { FetchOutcome } from '../api/types.ts'
import { groupLabel, isSmallCatalog, whyCatalogEmpty } from './catalogState.ts'

const outcome = (status: FetchOutcome['status'], detail = ''): FetchOutcome => ({ status, http_status: null, detail, at: '2026-10-20T06:58:03' })

test('no recorded fetch reads as never loaded', () => {
  assert.deepEqual(whyCatalogEmpty(null), { kind: 'never' })
  assert.deepEqual(whyCatalogEmpty(undefined), { kind: 'never' })
})

test('every kind of refusal or error is a failure and carries the API sentence', () => {
  for (const status of ['rate_limited', 'not_found', 'http_error', 'network_error'] as const) {
    assert.deepEqual(whyCatalogEmpty(outcome(status, 'Celestrak said no')), { kind: 'failed', detail: 'Celestrak said no', at: '2026-10-20T06:58:03' })
  }
})

test('an empty reply and a success with nothing stored are different from a failure', () => {
  assert.equal(whyCatalogEmpty(outcome('empty')).kind, 'empty')
  assert.equal(whyCatalogEmpty(outcome('ok')).kind, 'nothing')
})

test('a small catalog is one with some objects but fewer than 200', () => {
  assert.equal(isSmallCatalog(17), true)
  assert.equal(isSmallCatalog(199), true)
  assert.equal(isSmallCatalog(200), false)
  assert.equal(isSmallCatalog(0), false)
  assert.equal(isSmallCatalog(null), false)
})

test('the group name is trimmed, and absent from an older API', () => {
  assert.equal(groupLabel(' stations '), 'stations')
  assert.equal(groupLabel(''), null)
  assert.equal(groupLabel(undefined), null)
})
