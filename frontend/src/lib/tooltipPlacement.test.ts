import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tooltipAlign } from './tooltipPlacement.ts'

test('a term with room on the right keeps the tooltip left-aligned', () => {
  assert.equal(tooltipAlign({ left: 20, right: 60 }, 300, 1200), 'left')
})

test('a term near the right edge of a phone flips the tooltip to right-aligned', () => {
  assert.equal(tooltipAlign({ left: 300, right: 340 }, 281, 375), 'right')
})

test('exactly fitting inside the margin stays left-aligned', () => {
  assert.equal(tooltipAlign({ left: 100, right: 140 }, 300, 408), 'left')
  assert.equal(tooltipAlign({ left: 301, right: 341 }, 300, 408), 'right')
})

test('when neither side fits, the side that overflows less is chosen', () => {
  // viewport 300, tip 290: left-aligned at 150 overflows by 140+; right-aligned ending at 160 overflows by 138+
  assert.equal(tooltipAlign({ left: 150, right: 160 }, 290, 300), 'right')
  assert.equal(tooltipAlign({ left: 140, right: 150 }, 290, 300), 'left')
})
