import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BUILDS, LATEST_BUILD, formatBuildDate } from './builds.ts'

const README = fileURLToPath(new URL('../../../MD/builds/README.md', import.meta.url))

/** `build-N` rows of MD/builds/README.md: number and date. */
function tagged(): { build: number; date: string }[] {
  return readFileSync(README, 'utf8').split('\n')
    .map((l) => /^\|\s*`build-(\d+)`\s*\|[^|]*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ build: Number(m[1]), date: m[2] }))
}

test("What's new lists exactly the tagged builds, with their dates (MD/builds/README.md is the source)", () => {
  const fromReadme = tagged().sort((a, b) => b.build - a.build)
  assert.ok(fromReadme.length >= 10, 'the README table was read')
  assert.deepEqual(BUILDS.map((b) => ({ build: b.build, date: b.date })), fromReadme)
})

test('builds are newest first, each says what changed, and the latest is the first', () => {
  for (let i = 1; i < BUILDS.length; i++) assert.ok(BUILDS[i - 1].build > BUILDS[i].build, `${BUILDS[i - 1].build} before ${BUILDS[i].build}`)
  for (const b of BUILDS) {
    assert.ok(b.title.trim() && b.changes.length > 0, `build ${b.build} has a title and changes`)
    for (const c of b.changes) assert.doesNotMatch(c, /—/, `build ${b.build}: no em dashes`)
  }
  assert.equal(LATEST_BUILD, BUILDS[0])
})

test('formatBuildDate writes the day out, independent of locale', () => {
  assert.equal(formatBuildDate('2026-11-18'), '18 November 2026')
  assert.equal(formatBuildDate('2026-10-03'), '3 October 2026')
  assert.equal(formatBuildDate('not a date'), 'not a date')
})
