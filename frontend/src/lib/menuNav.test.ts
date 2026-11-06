import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextMenuIndex } from './menuNav.ts'

test('arrows move one step and wrap at both ends', () => {
  assert.equal(nextMenuIndex(0, 3, 'ArrowDown'), 1)
  assert.equal(nextMenuIndex(2, 3, 'ArrowDown'), 0)
  assert.equal(nextMenuIndex(0, 3, 'ArrowUp'), 2)
  assert.equal(nextMenuIndex(1, 3, 'ArrowUp'), 0)
})

test('with nothing focused, down goes to the first item and up to the last', () => {
  assert.equal(nextMenuIndex(-1, 3, 'ArrowDown'), 0)
  assert.equal(nextMenuIndex(-1, 3, 'ArrowUp'), 2)
})

test('Home and End jump to the ends; other keys and an empty menu give null', () => {
  assert.equal(nextMenuIndex(1, 4, 'Home'), 0)
  assert.equal(nextMenuIndex(1, 4, 'End'), 3)
  assert.equal(nextMenuIndex(1, 4, 'a'), null)
  assert.equal(nextMenuIndex(0, 0, 'ArrowDown'), null)
})
