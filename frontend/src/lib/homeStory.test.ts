import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asSentence, catalogStory, dominantRegime, regimeShares, sharePercent, shortMeaning, storyScope } from './homeStory.ts'
import { GLOSSARY } from './glossary.ts'

const counts = { LEO: 15170, MEO: 260, GEO: 420, HEO: 100 }

test('shares: whole percents, a sliver is never shown as none, unknown total gives nothing', () => {
  assert.equal(sharePercent(15170, 15970), '95%')
  assert.equal(sharePercent(10, 15970), '<1%')
  assert.equal(sharePercent(0, 15970), '0%')
  assert.equal(sharePercent(15969, 15970), '>99%')
  assert.equal(sharePercent(5, 5), '100%')
  assert.equal(sharePercent(5, null), null)
  assert.equal(sharePercent(5, 0), null)
})

test('regime shares keep the standard order and divide by the whole total, unclassified included', () => {
  const s = regimeShares(counts, 16000)
  assert.deepEqual(s.map((r) => r.regime), ['LEO', 'MEO', 'GEO', 'HEO'])
  assert.equal(s[0].fraction, 15170 / 16000)
  assert.ok(s.reduce((a, r) => a + r.fraction, 0) < 1, 'the unclassified 50 are not handed to any regime')
  assert.deepEqual(regimeShares(counts, 0).map((r) => r.fraction), [0, 0, 0, 0])
})

test('the dominant regime is the largest, none when everything is zero', () => {
  assert.equal(dominantRegime(counts), 'LEO')
  assert.equal(dominantRegime({ LEO: 1, MEO: 5, GEO: 2, HEO: 0 }), 'MEO')
  assert.equal(dominantRegime({ LEO: 0, MEO: 0, GEO: 0, HEO: 0 }), null)
})

test('the story says only what the numbers support', () => {
  assert.equal(catalogStory({ regimes: counts, total: 15970, medianAgeDays: 30.4 }), '95% in low Earth orbit; element sets a median 30 days old.')
  assert.equal(catalogStory({ regimes: counts, total: 15970, medianAgeDays: null }), '95% in low Earth orbit.')
  assert.equal(catalogStory({ regimes: null, total: null, medianAgeDays: 1.2 }), 'Element sets a median 1 day old.')
  assert.equal(catalogStory({ regimes: counts, total: null, medianAgeDays: 0.3 }), 'Element sets a median of under a day old.')
  assert.equal(catalogStory({ regimes: null, total: null, medianAgeDays: null }), null)
  assert.equal(catalogStory({ regimes: { LEO: 0, MEO: 0, GEO: 0, HEO: 0 }, total: 10, medianAgeDays: null }), null)
})

test('the scope is stated only when the numbers do not cover every stored object', () => {
  assert.equal(storyScope({ wholeCounts: true, loaded: 15970, total: 15970 }), null)
  assert.equal(storyScope({ wholeCounts: true, loaded: null, total: 15970 }), null)
  assert.equal(storyScope({ wholeCounts: true, loaded: 5000, total: 15970 }), 'The share counts every stored object; the age is from the first 5,000 of 15,970 objects (by name), as loaded here.')
  assert.equal(storyScope({ wholeCounts: false, loaded: 5000, total: 15970 }), 'The share and the age are from the first 5,000 of 15,970 objects (by name), as loaded here.')
})

test('a server phrase becomes a caption sentence', () => {
  assert.equal(asSentence('inferred from object names'), 'Inferred from object names.')
  assert.equal(asSentence('Already a sentence.'), 'Already a sentence.')
  assert.equal(asSentence('  '), '')
})

test('a glossary entry gives its short name', () => {
  assert.equal(shortMeaning(GLOSSARY.TLE), 'Two-line element set')
  assert.equal(shortMeaning(GLOSSARY.Pc), 'Probability of collision')
  assert.equal(shortMeaning('No colon here'), 'No colon here')
})
