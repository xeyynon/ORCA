import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, declarations, measureTokens, parseHex, themesFromCss } from './contrast.ts'

test('hex parsing accepts 3 and 6 digit colours and nothing else', () => {
  assert.deepEqual(parseHex('#fff'), [255, 255, 255])
  assert.deepEqual(parseHex('#0b0f14'), [11, 15, 20])
  assert.equal(parseHex('rgba(0, 0, 0, 0.5)'), null)
  assert.equal(parseHex('var(--x)'), null)
  assert.equal(parseHex('#12345'), null)
})

test('contrast matches the WCAG reference values', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(2), '21.00')
  assert.equal(contrastRatio([255, 255, 255], [255, 255, 255]).toFixed(2), '1.00')
  // #767676 on white is the well-known 4.54:1 threshold grey.
  assert.equal(contrastRatio([0x76, 0x76, 0x76], [255, 255, 255]).toFixed(2), '4.54')
  // symmetric
  assert.equal(contrastRatio([10, 20, 30], [200, 210, 220]), contrastRatio([200, 210, 220], [10, 20, 30]))
})

test('declarations ignore comments and read every custom property', () => {
  assert.deepEqual(declarations('/* --no: #000; */ --a: #111; --b : rgba(1,2,3,.5);'), { '--a': '#111', '--b': 'rgba(1,2,3,.5)' })
})

test('light inherits any name it does not redefine from dark', () => {
  const css = ':root,\n:root[data-theme="dark"] {\n --bg: #000; --keep: #123456;\n}\n:root[data-theme="light"] {\n --bg: #fff;\n}\n'
  const t = themesFromCss(css)
  assert.equal(t.dark['--bg'], '#000')
  assert.equal(t.light['--bg'], '#fff')
  assert.equal(t.light['--keep'], '#123456')
})

test('a pair below its minimum is reported as failing, not skipped', () => {
  // Build a tiny token set where text-primary has almost no contrast against every surface.
  const names = ['--bg-canvas', '--bg-panel', '--bg-card', '--text-primary', '--text-secondary', '--text-tertiary', '--text-faint', '--accent-ink',
    '--risk-critical-ink', '--risk-high-ink', '--risk-medium-ink', '--risk-low-ink', '--risk-negligible-ink', '--ok-ink', '--warn-ink', '--bad-ink',
    '--accent', '--risk-critical', '--risk-high', '--risk-medium', '--risk-low', '--ok', '--warn', '--bad', '--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5',
    '--paper-bg', '--paper-fill', '--paper-ink', '--paper-ink-2', '--paper-ink-3', '--paper-accent',
    '--paper-risk-critical', '--paper-risk-high', '--paper-risk-medium', '--paper-risk-low', '--paper-risk-negligible']
  const decl = (over: Record<string, string>) => names.map((n) => `${n}: ${over[n] ?? '#ffffff'};`).join(' ')
  const css = `:root,\n:root[data-theme="dark"] {\n ${decl({ '--bg-canvas': '#000000', '--bg-panel': '#000000', '--bg-card': '#000000', '--text-primary': '#010101' })}\n}\n:root[data-theme="light"] {\n --x: #fff;\n}\n`
  const bad = measureTokens(css).filter((m) => m.theme === 'dark' && m.fg === '--text-primary')
  assert.equal(bad.length, 3)
  assert.ok(bad.every((m) => !m.pass && m.ratio < 1.1))
})
