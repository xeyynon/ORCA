import test from 'node:test'
import assert from 'node:assert/strict'
import { positionsWaitNote, SLOW_AFTER_MS, STALLED_AFTER_MS } from './waitNote.ts'

test('a fresh wait gives the usual-time message and no retry', () => {
  const n = positionsWaitNote(0)
  assert.equal(n.title, 'Working out positions…')
  assert.equal(n.canRetry, false)
})

test('past the slow threshold the title carries the elapsed seconds', () => {
  assert.equal(positionsWaitNote(SLOW_AFTER_MS - 1).title, 'Working out positions…')
  assert.equal(positionsWaitNote(SLOW_AFTER_MS).title, 'Still working out positions (6 s)')
  assert.equal(positionsWaitNote(12_900).title, 'Still working out positions (12 s)')
  assert.equal(positionsWaitNote(12_900).canRetry, false)
})

test('a stalled wait offers retry and says so plainly', () => {
  const n = positionsWaitNote(STALLED_AFTER_MS)
  assert.equal(n.canRetry, true)
  assert.match(n.title, /longer than expected \(60 s\)/)
})

test('negative elapsed time is treated as zero', () => {
  assert.equal(positionsWaitNote(-5).title, 'Working out positions…')
})
