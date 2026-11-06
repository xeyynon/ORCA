import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { composite, measureGlass, parseRgba } from './glassContrast.ts'

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8')

test('composite blends like the browser', () => {
  assert.deepEqual(composite([255, 255, 255], 0.5, [0, 0, 0]), [128, 128, 128])
  assert.deepEqual(composite([10, 20, 30], 1, [200, 200, 200]), [10, 20, 30])
})

test('parseRgba reads the glass token form', () => {
  assert.deepEqual(parseRgba('rgba(17, 22, 29, 0.9)'), { rgb: [17, 22, 29], alpha: 0.9 })
  assert.equal(parseRgba('#ffffff'), null)
})

test('text on the glass reaches 4.5:1 over the worst case behind it, in both themes (design_system_v2, Glassmorphism)', () => {
  const failed = measureGlass(css).filter((r) => !r.pass).map((r) => `${r.theme} ${r.text} over ${r.behind}: ${r.ratio.toFixed(2)}`)
  assert.deepEqual(failed, [])
})

test('the check can fail: the first glass alphas (0.66 dark, 0.74 light) did not pass', () => {
  const failed = measureGlass(css, { dark: 0.66, light: 0.74 }).filter((r) => !r.pass)
  assert.ok(failed.some((r) => r.theme === 'dark'))
  assert.ok(failed.some((r) => r.theme === 'light'))
})
