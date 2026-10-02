import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FLASH_DURATION, FRAGMENT_LIFE, IMPACT_POINT, PERIOD, T_IMPACT,
  bodyAlpha, bodyPos, dustPos, flashAt, fragmentAt, loopTime, makeDust, makeFragments, mulberry32, orbitPoint, warning, GLOBE_R,
} from './orbitScene.ts'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

test('the generator is deterministic and stays in [0, 1)', () => {
  const a = mulberry32(5), b = mulberry32(5)
  for (let i = 0; i < 200; i++) { const v = a(); assert.equal(v, b()); assert.ok(v >= 0 && v < 1) }
})

test('the two objects start apart and meet exactly at the impact point at the impact time', () => {
  const a0 = bodyPos('A', 0.6)!, b0 = bodyPos('B', 0.6)!
  assert.ok(dist(a0, b0) > 0.3, 'they should start far apart')
  const a = bodyPos('A', T_IMPACT)!, b = bodyPos('B', T_IMPACT)!
  assert.ok(dist(a, IMPACT_POINT) < 1e-9 && dist(b, IMPACT_POINT) < 1e-9)
})

test('they approach monotonically (never pass through each other early) and are hidden outside the approach', () => {
  let last = Infinity
  for (let u = 0.5; u <= T_IMPACT; u += 0.1) {
    const d = dist(bodyPos('A', u)!, bodyPos('B', u)!)
    assert.ok(d <= last + 1e-12, `distance grew at u=${u}`)
    last = d
  }
  assert.equal(bodyPos('A', 0.1), null)
  assert.equal(bodyPos('B', T_IMPACT + 0.05), null)
  assert.equal(bodyAlpha(0.1), 0)
  assert.equal(bodyAlpha(T_IMPACT + 0.1), 0)
  assert.equal(bodyAlpha(2), 1)
})

test('the warning ring builds up only just before the impact', () => {
  assert.equal(warning(0.5), 0)
  assert.ok(warning(T_IMPACT - 0.2) > 0.8)
  assert.equal(warning(T_IMPACT + 0.1), 0)
})

test('the flash exists only in the short window after the impact, and fades', () => {
  assert.equal(flashAt(T_IMPACT - 0.01), null)
  assert.equal(flashAt(T_IMPACT + FLASH_DURATION + 0.01), null)
  const early = flashAt(T_IMPACT + 0.05)!, late = flashAt(T_IMPACT + FLASH_DURATION - 0.05)!
  assert.ok(early.glow > late.glow && early.ring < late.ring)
})

test('fragments appear only after the impact, spread outward, never come back, and fade to nothing', () => {
  const frags = makeFragments(46)
  assert.equal(frags.length, 46)
  for (const f of frags) {
    assert.equal(fragmentAt(f, T_IMPACT - 0.01), null)
    assert.equal(fragmentAt(f, T_IMPACT + FRAGMENT_LIFE + 0.01), null)
    let lastD = -1, lastA = 2
    for (let s = 0.05; s < FRAGMENT_LIFE; s += 0.1) {
      const p = fragmentAt(f, T_IMPACT + s)!
      const d = dist(p.pos, IMPACT_POINT)
      assert.ok(d >= lastD - 1e-12, 'a fragment moved back toward the impact point')
      assert.ok(p.alpha <= lastA + 1e-12 && p.alpha >= 0)
      lastD = d; lastA = p.alpha
    }
  }
})

test('the loop repeats exactly and handles negative time', () => {
  assert.ok(Math.abs(loopTime(PERIOD + 1.25) - 1.25) < 1e-9)
  assert.ok(Math.abs(loopTime(-1) - (PERIOD - 1)) < 1e-9)
  assert.deepEqual(bodyPos('A', loopTime(2.2)), bodyPos('A', loopTime(2.2 + 3 * PERIOD)))
})

test('the dust cloud stays in a ring around the globe, outside it, at every moment', () => {
  const dust = makeDust(160)
  for (const d of dust) {
    for (const t of [0, 3.3, 11.7]) {
      const r = Math.hypot(dustPos(d, t).x, dustPos(d, t).y)
      assert.ok(r > GLOBE_R * 0.9 && r < 0.5, `r=${r}`)
    }
  }
})

test('the orbit ellipse is a closed curve', () => {
  const p0 = orbitPoint(0), p1 = orbitPoint(Math.PI * 2)
  assert.ok(dist(p0, p1) < 1e-9)
})
