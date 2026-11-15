import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PREFS, filterObjects, parsePrefs } from './globePrefs.ts'
import type { GlobePrefs } from './globePrefs.ts'
import type { ObjectType } from '../api/types.ts'

// radius from the Earth's centre (km): 6371 + altitude
const obj = (id: string, type: ObjectType, altKm: number) => ({ id, type, r: [6371 + altKm, 0, 0] as [number, number, number] })
const LEO = obj('leo', 'payload', 550)
const MEO = obj('meo', 'payload', 20200)
const GEO = obj('geo', 'payload', 35786)
const DEB = obj('deb', 'debris', 700)
const RB = obj('rb', 'rocket_body', 800)
const ALL = [LEO, MEO, GEO, DEB, RB]
const none = new Set<string>()
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort()
const prefs = (over: Partial<GlobePrefs>): GlobePrefs => ({ ...DEFAULT_PREFS, ...over, bands: { ...DEFAULT_PREFS.bands, ...(over.bands ?? {}) } })

test('with the defaults every object is drawn', () => {
  assert.deepEqual(ids(filterObjects(ALL, DEFAULT_PREFS, none, none)), ids(ALL))
})

test('the object-type filter keeps only that type', () => {
  assert.deepEqual(ids(filterObjects(ALL, prefs({ typeFilter: 'debris' }), none, none)), ['deb'])
  assert.deepEqual(ids(filterObjects(ALL, prefs({ typeFilter: 'rocket_body' }), none, none)), ['rb'])
})

test('unticking an altitude band hides objects in it', () => {
  assert.deepEqual(ids(filterObjects(ALL, prefs({ bands: { LEO: false } as GlobePrefs['bands'] }), none, none)), ['geo', 'meo'])
})

test('a selected object is never hidden by a filter, and "show satellites" off leaves only selected and conjunction objects', () => {
  assert.deepEqual(ids(filterObjects(ALL, prefs({ typeFilter: 'debris' }), new Set(['geo']), none)), ['deb', 'geo'])
  assert.deepEqual(ids(filterObjects(ALL, prefs({ showSatellites: false }), new Set(['leo']), new Set(['rb']))), ['leo', 'rb'])
  assert.deepEqual(filterObjects(ALL, prefs({ showSatellites: false }), none, none), [])
})

test('"only conjunction objects" leaves just the pair', () => {
  assert.deepEqual(ids(filterObjects(ALL, prefs({ onlyConjunction: true }), none, new Set(['leo', 'deb']))), ['deb', 'leo'])
  assert.deepEqual(filterObjects(ALL, prefs({ onlyConjunction: true }), none, none), []) // no active conjunction -> nothing matches
})

test('parsePrefs falls back field by field and never throws on junk', () => {
  assert.deepEqual(parsePrefs(null), DEFAULT_PREFS)
  assert.deepEqual(parsePrefs('nonsense'), DEFAULT_PREFS)
  assert.deepEqual(parsePrefs({ showOrbits: 'yes', colorBy: 'weird', typeFilter: 'aliens', bands: 7 }), DEFAULT_PREFS)
  const p = parsePrefs({ showOrbits: false, colorBy: 'type', typeFilter: 'debris', bands: { LEO: false, MEO: 'x' }, onlyConjunction: true })
  assert.equal(p.showOrbits, false); assert.equal(p.colorBy, 'type'); assert.equal(p.typeFilter, 'debris')
  assert.equal(parsePrefs({ colorBy: 'constellation' }).colorBy, 'constellation')
  assert.equal(parsePrefs({ panelOpen: false }).panelOpen, false)
  assert.equal(parsePrefs({}).panelOpen, true)
  assert.equal(parsePrefs({ footOpen: false }).footOpen, false)
  assert.equal(parsePrefs({}).footOpen, true)
  assert.equal(p.bands.LEO, false); assert.equal(p.bands.MEO, true); assert.equal(p.onlyConjunction, true)
})
