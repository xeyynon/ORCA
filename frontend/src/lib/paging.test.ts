import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageOf, pageContaining } from './paging.ts'

const xs = Array.from({ length: 103 }, (_, i) => i)

test('pageOf: first, middle and last page', () => {
  assert.deepEqual({ ...pageOf(xs, 0, 25), rows: undefined }, { rows: undefined, page: 0, pages: 5, from: 1, to: 25, total: 103 })
  assert.deepEqual(pageOf(xs, 2, 25).rows[0], 50)
  const last = pageOf(xs, 4, 25)
  assert.deepEqual([last.from, last.to, last.rows.length], [101, 103, 3])
})

test('pageOf: a page past the end is clamped to the last (a filter shortened the list)', () => {
  assert.equal(pageOf(xs, 9, 25).page, 4)
  assert.equal(pageOf(xs.slice(0, 10), 3, 25).page, 0)
  assert.equal(pageOf(xs, -2, 25).page, 0)
  assert.equal(pageOf(xs, Number.NaN, 25).page, 0)
})

test('pageOf: an empty list is one empty page, positions 0', () => {
  assert.deepEqual(pageOf([], 0, 25), { rows: [], page: 0, pages: 1, from: 0, to: 0, total: 0 })
})

test('pageContaining: the page of a row index', () => {
  assert.equal(pageContaining(0, 25), 0)
  assert.equal(pageContaining(24, 25), 0)
  assert.equal(pageContaining(25, 25), 1)
  assert.equal(pageContaining(-1, 25), null)
})
