import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countUpValue, easeOutCubic } from './countUp.ts'

test('the easing runs from 0 to 1, rises monotonically and is clamped', () => {
  assert.equal(easeOutCubic(0), 0)
  assert.equal(easeOutCubic(1), 1)
  assert.equal(easeOutCubic(-2), 0)
  assert.equal(easeOutCubic(5), 1)
  let prev = -1
  for (let i = 0; i <= 20; i += 1) {
    const v = easeOutCubic(i / 20)
    assert.ok(v >= prev, `step ${i}`)
    prev = v
  }
  assert.ok(easeOutCubic(0.5) > 0.5, 'ease-out: past halfway at half time')
})

test('a count-up starts at 0, lands exactly on the target, and never passes it', () => {
  assert.equal(countUpValue(15970, 0, 900), 0)
  assert.equal(countUpValue(15970, 900, 900), 15970)
  assert.equal(countUpValue(15970, 5000, 900), 15970)
  for (let t = 0; t <= 900; t += 30) {
    const v = countUpValue(15970, t, 900)
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 15970, `t=${t}: ${v}`)
  }
})

test('a zero or missing duration shows the real value at once', () => {
  assert.equal(countUpValue(42, 0, 0), 42)
  assert.equal(countUpValue(42, 10, Number.NaN), 42)
  assert.equal(countUpValue(0, 300, 900), 0)
})
