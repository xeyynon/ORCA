import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breadcrumbTrail } from './breadcrumbs.ts'

test('no trail on Mission control itself', () => {
  assert.deepEqual(breadcrumbTrail({ view: 'home' }), [])
})

test('a view with nothing selected: Mission control / View, the view is the current page', () => {
  const t = breadcrumbTrail({ view: 'analytics' })
  assert.deepEqual(t.map((c) => c.label), ['Mission control', 'Analytics'])
  assert.equal(t[1].to, undefined)
  assert.deepEqual(t[0].to, { view: 'home', clearSelection: false })
})

test('a selected object is the deepest level, and the view crumb goes back up by clearing it', () => {
  const t = breadcrumbTrail({ view: 'overview', objectName: '2021-091D' })
  assert.deepEqual(t.map((c) => c.label), ['Mission control', 'Overview', '2021-091D'])
  assert.deepEqual(t[1].to, { view: 'overview', clearSelection: true })
  assert.equal(t[2].to, undefined)
})

test('a conjunction pair wins over an object on the Globe, and only a pair counts on Conjunctions', () => {
  assert.deepEqual(breadcrumbTrail({ view: 'globe', objectName: 'ISS', pairLabel: 'A × B' }).map((c) => c.label), ['Mission control', 'Globe', 'A × B'])
  assert.deepEqual(breadcrumbTrail({ view: 'globe', objectName: 'ISS' }).map((c) => c.label), ['Mission control', 'Globe', 'ISS'])
  assert.deepEqual(breadcrumbTrail({ view: 'conjunctions', objectName: 'ISS' }).map((c) => c.label), ['Mission control', 'Conjunctions'])
  assert.deepEqual(breadcrumbTrail({ view: 'conjunctions', pairLabel: 'A × B' }).map((c) => c.label), ['Mission control', 'Conjunctions', 'A × B'])
})

test('Analytics and Data ignore selections: they have no per-object level', () => {
  assert.deepEqual(breadcrumbTrail({ view: 'data', objectName: 'ISS', pairLabel: 'A × B' }).map((c) => c.label), ['Mission control', 'Data'])
})
