import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askFacts, askOrca, assistantFailure, findTerm, greeting, horizonFrom, normalize, objectQuery, unknownReply } from './askOrca.ts'
import type { AskContext } from './askOrca.ts'
import { GLOSSARY } from './glossary.ts'
import { VIEWS } from './views.ts'

const base: AskContext = {
  view: 'home',
  theme: 'dark',
  total: 29412,
  loaded: 5000,
  regimes: { counts: { LEO: 23105, MEO: 512, GEO: 1840, HEO: 3901 }, scope: 'catalog', of: 29412, unclassified: 54 },
  ages: { medianDays: 3.24, newestDays: 0.11, oldestDays: 41.6, lastRefreshUtc: '2026-11-07 09:12 UTC' },
  conjunction: { phase: 'idle', source: 'live', headline: null, detail: null, error: null },
  views: VIEWS,
  glossary: GLOSSARY,
}
const ctx = (over: Partial<AskContext> = {}): AskContext => ({ ...base, ...over })
const empty = ctx({ total: null, loaded: null, regimes: null, ages: { medianDays: null, newestDays: null, oldestDays: null, lastRefreshUtc: null } })

/** Every number written in a reply, digits and separators only. */
const numbersIn = (s: string) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[.,]$/, ''))

test('normalize: case, quotes, punctuation, spaces', () => {
  assert.equal(normalize('  What IS a “TLE”?!  '), 'what is a tle')
  assert.equal(normalize('Show   me, the globe.'), 'show me the globe')
  assert.equal(normalize('hard-body radius?'), 'hard-body radius')
})

test('greetings and "what can you do" explain the capabilities with chips', () => {
  for (const q of ['hi', 'Hello!', 'hey there', 'What can you do?', 'what can I ask', 'help', 'how does this work', '']) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'help', q)
    assert.match(r.text, /find an object/)
    assert.ok(r.chips && r.chips.length >= 3, q)
    assert.equal(r.action, undefined)
  }
})

test('the greeting offers four starters that fit the current view, and each starter is understood', () => {
  for (const view of VIEWS) {
    const g = greeting(view)
    assert.equal(g.chips?.length, 4, view)
    for (const chip of g.chips!) assert.notEqual(askOrca(chip.say ?? chip.label, ctx({ view })).intent, 'unknown', `${view}: ${chip.label}`)
  }
  assert.ok(greeting('conjunctions').chips!.some((c) => /saved example/i.test(c.label)))
  assert.ok(greeting('globe').chips!.some((c) => /find/i.test(c.label)))
})

test('every chip any reply offers is itself understood (no dead ends)', () => {
  const asks = ['hi', 'how many objects', 'how many in leo', 'is the data fresh', 'what is pc', 'any risks', 'run a search for 30 days', 'xyzzy', 'what is a quasar', 'conjunctions']
  const contexts = [base, empty, ctx({ conjunction: { phase: 'done', source: 'saved', headline: 'No critical or high-risk approaches in the next 24 hours', detail: '12 approaches.', error: null } })]
  for (const c of contexts) {
    for (const q of asks) {
      for (const chip of askOrca(q, c).chips ?? []) assert.notEqual(askOrca(chip.say ?? chip.label, c).intent, 'unknown', `${q} -> ${chip.label}`)
    }
  }
})

test('find / show / where is -> showObject with the name cleaned of filler, case kept', () => {
  const cases: [string, string][] = [
    ['find the ISS', 'ISS'],
    ['Show me the satellite NOAA 19 on the globe', 'NOAA 19'],
    ['where is STARLINK-1007?', 'STARLINK-1007'],
    ["where's hubble", 'hubble'],
    ['show 25544', '25544'],
    ['show norad id 25544', '25544'],
    ['locate object #43013', '43013'],
    ['25544', '25544'],
    ['please find cosmos 2251 debris', 'cosmos 2251 debris'],
    ['track envisat please', 'envisat'],
    ['find GEO-KOMPSAT 2A', 'GEO-KOMPSAT 2A'],
  ]
  for (const [q, want] of cases) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'showObject', q)
    assert.deepEqual(r.action, { kind: 'showObject', query: want }, q)
  }
  assert.equal(objectQuery('hello there'), null)
})

test('find with nothing after it asks which object, and does nothing', () => {
  const r = askOrca('find the', base)
  assert.equal(r.intent, 'showObject')
  assert.equal(r.action, undefined)
  assert.match(r.text, /Which object/)
})

test('open / go to a view, including home and mission control', () => {
  const cases: [string, string][] = [
    ['open analytics', 'analytics'], ['go to the globe', 'globe'], ['take me to mission control', 'home'], ['go home', 'home'],
    ['show me the globe', 'globe'], ['open the data page', 'data'], ['Open Conjunctions', 'conjunctions'], ['overview', 'overview'],
    ['switch to the overview tab', 'overview'], ['stats', 'analytics'], ['Open Data', 'data'],
  ]
  for (const [q, view] of cases) assert.deepEqual(askOrca(q, ctx({ view: view === 'home' ? 'globe' : 'home' })).action, { kind: 'go', view }, q)
})

test('opening the view you are on says so and does nothing', () => {
  const r = askOrca('open the globe', ctx({ view: 'globe' }))
  assert.equal(r.intent, 'go')
  assert.equal(r.action, undefined)
  assert.match(r.text, /already on Globe/)
})

test('how many objects: the stored total, and the loaded subset when it is smaller', () => {
  const r = askOrca('How many objects are there?', base)
  assert.equal(r.intent, 'count')
  assert.match(r.text, /29,412 objects/)
  assert.match(r.text, /loaded 5,000 of them/)
  assert.doesNotMatch(askOrca('how many objects', ctx({ loaded: 29412 })).text, /loaded/)
})

test('how many in a regime: from the context, with what the count covers', () => {
  const leo = askOrca('how many in LEO?', base)
  assert.equal(leo.intent, 'count')
  assert.match(leo.text, /LEO \(low Earth orbit\): 23,105/)
  assert.doesNotMatch(leo.text, /GEO/)
  assert.match(leo.text, /whole stored catalog of 29,412/)
  const two = askOrca('how many satellites in geo and heo', base).text
  assert.match(two, /GEO \(geosynchronous orbit\): 1,840/)
  assert.match(two, /HEO \(high or highly elliptical orbit\): 3,901/)
  const all = askOrca('how many objects by orbit?', base).text
  for (const n of ['23,105', '512', '1,840', '3,901', '54']) assert.ok(all.includes(n), n)
  const loadedOnly = askOrca('objects in meo', ctx({ regimes: { counts: { LEO: 4000, MEO: 100, GEO: 600, HEO: 300 }, scope: 'loaded', of: 5000 } })).text
  assert.match(loadedOnly, /MEO \(medium Earth orbit\): 100/)
  assert.match(loadedOnly, /only covers the 5,000 loaded objects/)
})

test('counts never invented: "not loaded yet" when the context lacks them', () => {
  assert.match(askOrca('how many objects', empty).text, /not loaded yet/)
  assert.match(askOrca('how many in leo', empty).text, /not loaded yet/)
  assert.equal(numbersIn(askOrca('how many in leo', empty).text).length, 0)
  const onlyLoaded = askOrca('how many objects', ctx({ total: null })).text
  assert.match(onlyLoaded, /loaded 5,000/)
  assert.match(onlyLoaded, /total for the stored catalog has not loaded yet/)
})

test('how old is the data / is it fresh: median, range, threshold, last fetch', () => {
  for (const q of ['how old is the data', 'Is the data fresh?', 'are the TLEs up to date', 'when was the data last updated', 'data age']) {
    assert.equal(askOrca(q, base).intent, 'freshness', q)
  }
  const r = askOrca('how old is the data', base).text
  assert.match(r, /median age of 3\.2 days/)
  assert.match(r, /newest is 0\.1 days/)
  assert.match(r, /oldest is 41\.6 days/)
  assert.match(r, /5,000 loaded objects/)
  assert.match(r, /within ORCA's 7-day threshold/)
  assert.match(r, /2026-11-07 09:12 UTC/)
  const stale = askOrca('is the data stale', ctx({ ages: { ...base.ages, medianDays: 12.4 } })).text
  assert.match(stale, /past ORCA's 7-day threshold/)
  const none = askOrca('how old is the data', empty).text
  assert.match(none, /not loaded yet/)
  assert.equal(numbersIn(none).length, 0)
})

test('what is / define <term>: the glossary text, for every term and its common names', () => {
  const cases: [string, keyof typeof GLOSSARY][] = [
    ['what is a TLE', 'TLE'], ['define tle', 'TLE'], ['What is Pc?', 'Pc'], ['what does probability of collision mean', 'Pc'],
    ['what is TCA', 'TCA'], ['explain sgp4', 'SGP4'], ["what's the miss distance", 'miss distance'], ['what is uncertainty', 'uncertainty'],
    ['what is mahalanobis distance', 'Mahalanobis'], ['what is the hard body radius', 'hard-body radius'], ['what is a long encounter', 'long encounter'],
    ['TLE?', 'TLE'], ['pc', 'Pc'], ['tell me about long encounters', 'long encounter'],
    ['what is a conjunction', 'conjunction'], ['what is a close approach', 'conjunction'], ['what is the report distance', 'report distance'],
    ['what is relative speed', 'relative velocity'], ['what is a risk tier', 'risk tier'], ['what do the risk levels mean', 'risk tier'],
    ['what is screening', 'screening'], ['what is an epoch', 'epoch'], ['what is a NORAD id', 'NORAD ID'], ['what is celestrak', 'CelesTrak'],
    ['what is an orbit regime', 'orbit regime'],
  ]
  for (const [q, term] of cases) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'define', q)
    assert.equal(r.text, `${term}: ${GLOSSARY[term]}`, q)
  }
})

test('the new basic terms do not take over questions that have live answers', () => {
  // A bare plural still asks for the search result; count and age questions still get numbers.
  assert.equal(askOrca('conjunctions', base).intent, 'conjunctions')
  assert.equal(askOrca('what is the breakdown by orbit regime', base).intent, 'count')
  assert.equal(askOrca('how many objects per regime', base).intent, 'count')
  assert.equal(askOrca('how old is the data', base).intent, 'freshness')
  assert.equal(askOrca('what is the tle age', base).intent, 'freshness')
})

test('findTerm prefers the longest alias', () => {
  assert.equal(findTerm('what is the mahalanobis distance', GLOSSARY), 'Mahalanobis')
  assert.equal(findTerm('time of closest approach', GLOSSARY), 'TCA')
  assert.equal(findTerm('nothing here', GLOSSARY), null)
})

test('a term ORCA has no meaning for is not invented: it lists the terms it knows', () => {
  const r = askOrca('what is a quasar', base)
  assert.equal(r.intent, 'unknown')
  assert.match(r.text, /not in ORCA's glossary/)
  for (const term of Object.keys(GLOSSARY)) assert.ok(r.text.includes(term), term)
})

test('conjunctions with no result: says so and offers to run or open the example', () => {
  for (const q of ['conjunctions', 'any risks?', 'closest approaches', 'any close approaches', 'how many critical']) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'conjunctions', q)
    assert.equal(r.action, undefined)
  }
  const r = askOrca('any risks', base)
  assert.match(r.text, /No conjunction search has been run/)
  assert.deepEqual(r.chips?.map((c) => c.label), ['Run a search', 'Explore the saved example'])
})

test('conjunctions with a result: the answer sentence, labelled saved or live', () => {
  const headline = '2 critical and 5 high-risk approaches in the next 24 hours'
  const detail = '426,418 approaches closer than 10 km found in all; 426,411 of them rank low or negligible.'
  const saved = askOrca('any risks', ctx({ conjunction: { phase: 'done', source: 'saved', headline, detail, error: null } })).text
  assert.match(saved, /saved example run/)
  assert.match(saved, /not live/)
  assert.ok(saved.includes(headline) && saved.includes(detail))
  const live = askOrca('closest approaches', ctx({ conjunction: { phase: 'done', source: 'live', headline, detail, error: null } })).text
  assert.match(live, /comes from the search you ran/)
  assert.doesNotMatch(live, /saved/)
  // Every number in the reply is one from the context.
  for (const n of numbersIn(live)) assert.ok(headline.includes(n) || detail.includes(n), n)
})

test('no chip opens the view you are already on', () => {
  const done = { phase: 'done' as const, source: 'saved' as const, headline: 'No critical or high-risk approaches in the next 24 hours', detail: null, error: null }
  assert.ok(askOrca('any risks', ctx({ conjunction: done })).chips!.some((c) => c.label === 'Open Conjunctions'))
  assert.ok(!askOrca('any risks', ctx({ view: 'conjunctions', conjunction: done })).chips!.some((c) => c.label === 'Open Conjunctions'))
  assert.ok(!askOrca('how many in leo', ctx({ view: 'globe' })).chips!.some((c) => c.label === 'Open the globe'))
  assert.ok(!greeting('globe').chips!.some((c) => /open the globe/i.test(c.label)))
})

test('conjunctions while running or after a failure', () => {
  assert.match(askOrca('any risks', ctx({ conjunction: { ...base.conjunction, phase: 'running' } })).text, /is running/)
  const failed = askOrca('any risks', ctx({ conjunction: { ...base.conjunction, phase: 'failed', error: 'Cannot reach the ORCA API.' } }))
  assert.match(failed.text, /failed: Cannot reach the ORCA API/)
  assert.equal(failed.chips?.length, 2)
})

test('run a search [for N days]: 1 to 7, default 1', () => {
  const cases: [string, number][] = [
    ['run a search', 1], ['Run a search for 3 days', 3], ['start a 7-day search', 7], ['run a search for a week', 7],
    ['search for conjunctions over two days', 2], ['new search, 5 days', 5], ['Run a 1-day search', 1], ['run a 24 hour search', 1],
  ]
  for (const [q, d] of cases) assert.deepEqual(askOrca(q, base).action, { kind: 'runSearch', horizonDays: d }, q)
  for (const q of ['run a search for 30 days', 'run a search for 0 days', 'run a search for 2.5 days']) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'runSearch', q)
    assert.equal(r.action, undefined, q)
    assert.match(r.text, /1 to 7 days/)
  }
})

test('a run states the runtime estimate only when the object count is known', () => {
  assert.match(askOrca('run a search', base).text, /29,412 objects expect roughly/)
  assert.doesNotMatch(askOrca('run a search', empty).text, /expect/)
})

test('a run while one is running does not start another', () => {
  const r = askOrca('run a search', ctx({ conjunction: { ...base.conjunction, phase: 'running' } }))
  assert.equal(r.action, undefined)
  assert.match(r.text, /already running/)
})

test('search for <name> is an object search, not a conjunction run', () => {
  assert.deepEqual(askOrca('search for starlink', base).action, { kind: 'showObject', query: 'starlink' })
})

test('saved example opens it, except while a live search is running', () => {
  for (const q of ['saved example', 'Explore the saved example', 'show me an example', 'open the demo run']) assert.deepEqual(askOrca(q, base).action, { kind: 'openSavedExample' }, q)
  const r = askOrca('saved example', ctx({ conjunction: { ...base.conjunction, phase: 'running' } }))
  assert.equal(r.action, undefined)
})

test('dark / light theme, toggle, and already-set', () => {
  assert.deepEqual(askOrca('light theme', base).action, { kind: 'setTheme', theme: 'light' })
  assert.deepEqual(askOrca('switch to light mode please', base).action, { kind: 'setTheme', theme: 'light' })
  assert.deepEqual(askOrca('go light', base).action, { kind: 'setTheme', theme: 'light' })
  assert.deepEqual(askOrca('dark mode', ctx({ theme: 'light' })).action, { kind: 'setTheme', theme: 'dark' })
  assert.deepEqual(askOrca('toggle the theme', base).action, { kind: 'setTheme', theme: 'light' })
  const same = askOrca('dark theme', base)
  assert.equal(same.action, undefined)
  assert.match(same.text, /already dark/)
})

test('tour and shortcuts', () => {
  assert.deepEqual(askOrca('take the tour', base).action, { kind: 'startTour' })
  assert.deepEqual(askOrca('show me around', base).action, { kind: 'startTour' })
  assert.deepEqual(askOrca('keyboard shortcuts', base).action, { kind: 'showShortcuts' })
  assert.deepEqual(askOrca('what are the hotkeys?', base).action, { kind: 'showShortcuts' })
})

test('thanks is acknowledged without an action', () => {
  const r = askOrca('thanks!', base)
  assert.equal(r.intent, 'thanks')
  assert.equal(r.action, undefined)
})

test('unknown: says plainly what it can do and offers 3 to 4 chips, no action', () => {
  for (const q of ['xyzzy', 'tell me a joke', 'should I launch my cubesat tuesday']) {
    const r = askOrca(q, base)
    assert.equal(r.intent, 'unknown', q)
    assert.equal(r.action, undefined)
    assert.match(r.text, /can't answer that/)
    assert.ok(r.chips && r.chips.length >= 3 && r.chips.length <= 4)
  }
  assert.match(unknownReply('The AI assistant was unavailable.').text, /^The AI assistant was unavailable\. I answer/)
})

test('horizonFrom reads numbers, words, weeks and hours', () => {
  assert.equal(horizonFrom('for 3 days'), 3)
  assert.equal(horizonFrom('a 7-day run'), 7)
  assert.equal(horizonFrom('four days'), 4)
  assert.equal(horizonFrom('next week'), null)
  assert.equal(horizonFrom('a week'), 7)
  assert.equal(horizonFrom('2 weeks'), 14)
  assert.equal(horizonFrom('next 24 hours'), 1)
  assert.equal(horizonFrom('soon'), null)
})

test('facts for the AI: aggregate numbers from the context, labelled, no object names', () => {
  const f = askFacts(ctx({ view: 'globe', conjunction: { phase: 'done', source: 'saved', headline: 'No critical or high-risk approaches in the next 24 hours', detail: '12 approaches closer than 10 km found in all.', error: null } }))
  assert.equal(f[0], 'Current view: Globe')
  assert.ok(f.some((x) => x.includes('29,412')))
  assert.ok(f.some((x) => /LEO 23,105, MEO 512, GEO 1,840, HEO 3,901/.test(x) && /whole stored catalog/.test(x)))
  assert.ok(f.some((x) => /median 3\.2 days/.test(x)))
  assert.ok(f.some((x) => /saved example run, not live/.test(x)))
  assert.ok(f.some((x) => /not an operational system/.test(x)))
  const e = askFacts(empty)
  assert.ok(e.some((x) => /stored catalog: not loaded yet/.test(x)))
  assert.ok(e.some((x) => /regime: not loaded yet/.test(x)))
  assert.ok(e.some((x) => /No conjunction search/.test(x)))
})

test('assistantFailure names the reason for each contract status', () => {
  assert.match(assistantFailure(503), /turned off/)
  assert.match(assistantFailure(404), /turned off/)
  assert.match(assistantFailure(429), /too many/)
  assert.match(assistantFailure(400), /could not be sent/)
  assert.match(assistantFailure(null), /could not be reached/)
  assert.match(assistantFailure(500), /500/)
})

test('a why/how-does question goes to the AI path, not a keyword answer it happens to mention', () => {
  for (const q of [
    'Why does an old TLE make a close-approach forecast less reliable?',
    'how does the conjunction screening work?',
    'what happens if two satellites collide?',
    'is it safe to use these results for a manoeuvre?',
    'explain why Starlink has so many approaches',
  ]) assert.equal(askOrca(q, base).intent, 'unknown', q)
})

test('questions with exact answers keep them: how many, how old, explain a term', () => {
  assert.equal(askOrca('how many objects are in GEO?', base).intent, 'count')
  assert.equal(askOrca('how old is the data?', base).intent, 'freshness')
  assert.equal(askOrca('explain Pc', base).intent, 'define')
  assert.equal(askOrca('what is a TLE?', base).intent, 'define')
  assert.equal(askOrca('any risks?', base).intent, 'conjunctions')
})
