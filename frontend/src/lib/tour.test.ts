import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOUR_STEPS, TOUR_STORAGE_KEY, availableSteps, moveStep, reconcileStep, stepLabel } from './tour.ts'
import { placeCard, spotlightRect, SHEET_BELOW_PX } from './tourPlacement.ts'

test('the tour has the five steps in order, each with a target and short copy', () => {
  assert.deepEqual(TOUR_STEPS.map((s) => s.id), ['how', 'views', 'search', 'globe', 'conjunctions', 'ask', 'menu'])
  for (const s of TOUR_STEPS) {
    assert.ok(s.target.length > 0 && s.title.length > 0, s.id)
    // one or two sentences (the views step lists the six views in one, then the keys)
    assert.ok((s.body.match(/[.!?](\s|$)/g) ?? []).length <= 3, `${s.id} is short`)
  }
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, TOUR_STEPS.length)
})

test('the storage key is versioned', () => {
  assert.match(TOUR_STORAGE_KEY, /^orca:tour:v\d+$/)
})

test('the copy names the keys the app really binds', () => {
  const views = TOUR_STEPS.find((s) => s.id === 'views')!.body
  assert.match(views, /\bH\b/)
  assert.match(views, /1 to 6/)
  assert.match(views, /Reports/)
  assert.match(TOUR_STEPS.find((s) => s.id === 'search')!.body, /Press \//)
  assert.match(TOUR_STEPS.find((s) => s.id === 'conjunctions')!.body, /saved example run/)
  assert.match(TOUR_STEPS.find((s) => s.id === 'menu')!.body, /Take the tour/)
})

test('a step whose target is missing is skipped, never pointed at nothing', () => {
  const shown = availableSteps(TOUR_STEPS, (s) => s.id !== 'search')
  assert.deepEqual(shown.map((s) => s.id), ['how', 'views', 'globe', 'conjunctions', 'ask', 'menu'])
  assert.equal(stepLabel(1, shown.length), 'Step 2 of 6')
  // Off the home page the hero is not there, so "How ORCA works" is skipped.
  assert.deepEqual(availableSteps(TOUR_STEPS, (s) => s.id !== 'how').map((s) => s.id), ['views', 'search', 'globe', 'conjunctions', 'ask', 'menu'])
  assert.deepEqual(availableSteps(TOUR_STEPS, () => false), [])
})

test('next and back move one step; next on the last finishes; back on the first does nothing', () => {
  assert.equal(moveStep(0, 5, 'next'), 1)
  assert.equal(moveStep(3, 5, 'next'), 4)
  assert.equal(moveStep(4, 5, 'next'), 'finish')
  assert.equal(moveStep(4, 5, 'back'), 3)
  assert.equal(moveStep(0, 5, 'back'), null)
  assert.equal(moveStep(0, 1, 'next'), 'finish')
  assert.equal(moveStep(0, 0, 'next'), 'finish')
})

test('when the steps on screen change, the current step is kept, or the next one after it, or the last', () => {
  const all = TOUR_STEPS
  const without = (...ids: string[]) => all.filter((s) => !ids.includes(s.id))
  assert.equal(reconcileStep('globe', all, without('search')), 2)
  assert.equal(reconcileStep('search', all, without('search')), 2) // globe came next
  assert.equal(reconcileStep('menu', all, without('menu')), 5) // nothing after it: the last remaining
  assert.equal(reconcileStep('views', all, []), null)
})

test('stepLabel counts from one', () => {
  assert.equal(stepLabel(0, 5), 'Step 1 of 5')
  assert.equal(stepLabel(4, 5), 'Step 5 of 5')
})

const desktop = { width: 1280, height: 800 }
const card = { width: 320, height: 180 }

test('the spotlight pads the target and stays inside the viewport', () => {
  assert.deepEqual(spotlightRect({ left: 100, top: 10, width: 200, height: 30 }, desktop), { left: 94, top: 4, width: 212, height: 42 })
  // a target touching the top-right corner keeps its ring on screen
  const r = spotlightRect({ left: 1240, top: 0, width: 40, height: 40 }, desktop)
  assert.equal(r.top, 2)
  assert.equal(r.left + r.width, 1278)
})

test('a header target gets the card below it, centred and clamped into the viewport', () => {
  const p = placeCard({ left: 500, top: 4, width: 280, height: 40 }, card, desktop)
  assert.deepEqual(p, { mode: 'float', side: 'below', left: 480, top: 56 })
  // the menu button at the far right: centring would overflow, so the card is clamped 12 px from the edge
  const m = placeCard({ left: 1230, top: 4, width: 44, height: 40 }, card, desktop)
  assert.equal(m.mode, 'float')
  if (m.mode === 'float') { assert.equal(m.side, 'below'); assert.equal(m.left + card.width, 1280 - 12) }
})

test('a target near the bottom flips the card above it', () => {
  const p = placeCard({ left: 400, top: 700, width: 100, height: 40 }, card, desktop)
  assert.equal(p.mode === 'float' && p.side, 'above')
  if (p.mode === 'float') assert.equal(p.top, 700 - 12 - 180)
})

test('a tall target with no room above or below puts the card beside it', () => {
  const p = placeCard({ left: 20, top: 20, width: 300, height: 760 }, card, desktop)
  assert.equal(p.mode === 'float' && p.side, 'right')
})

test('when no side fits, the card still lands fully inside the viewport', () => {
  const vp = { width: 700, height: 300 }
  const p = placeCard({ left: 0, top: 0, width: 700, height: 300 }, card, vp)
  assert.equal(p.mode, 'float')
  if (p.mode === 'float') {
    assert.ok(p.left >= 12 && p.left + card.width <= vp.width - 12)
    assert.ok(p.top >= 12 && p.top + card.height <= vp.height - 12)
  }
})

test('phones get a bottom sheet', () => {
  assert.deepEqual(placeCard({ left: 10, top: 10, width: 100, height: 40 }, card, { width: SHEET_BELOW_PX - 1, height: 800 }), { mode: 'sheet' })
  assert.equal(placeCard({ left: 10, top: 10, width: 100, height: 40 }, card, { width: SHEET_BELOW_PX, height: 800 }).mode, 'float')
})
