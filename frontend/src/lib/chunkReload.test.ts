import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isChunkLoadError, RELOAD_COOLDOWN_MS, shouldAutoReload } from './chunkReload.ts'

test('one automatic reload is allowed, then none until the cooldown passes', () => {
  assert.equal(shouldAutoReload(null, 1_000_000), true)
  assert.equal(shouldAutoReload(1_000_000, 1_000_000 + 5_000), false)
  assert.equal(shouldAutoReload(1_000_000, 1_000_000 + RELOAD_COOLDOWN_MS), true)
  assert.equal(shouldAutoReload(Number.NaN, 1_000_000), true)
})

test('the usual missing-chunk errors are recognised and ordinary errors are not', () => {
  assert.equal(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/GlobeView-abc.js')), true)
  assert.equal(isChunkLoadError(new Error('error loading dynamically imported module')), true)
  assert.equal(isChunkLoadError(new Error('Loading chunk 12 failed.')), true)
  assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')), false)
  assert.equal(isChunkLoadError('Importing a module script failed.'), true)
})

import { autoReloadOnce } from './chunkReload.ts'

function fakeStorage(): { s: { getItem(k: string): string | null; setItem(k: string, v: string): void }; data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, s: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) } } }
}

test('autoReloadOnce reloads the first time, then refuses inside the cooldown, then allows again', () => {
  const { s } = fakeStorage()
  let reloads = 0
  const reload = () => { reloads++ }
  assert.equal(autoReloadOnce(s, 1_000, reload), true)
  assert.equal(autoReloadOnce(s, 2_000, reload), false)
  assert.equal(reloads, 1)
  assert.equal(autoReloadOnce(s, 1_000 + RELOAD_COOLDOWN_MS, reload), true)
  assert.equal(reloads, 2)
})

test('without usable storage it never reloads by itself, and a throwing store does not crash', () => {
  let reloads = 0
  assert.equal(autoReloadOnce(null, 1_000, () => { reloads++ }), false)
  const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.equal(autoReloadOnce(throwing, 1_000, () => { reloads++ }), false)
  assert.equal(reloads, 0)
})
