// The standing rules (MD/rules.md) as checks, so a decided rule cannot quietly stop being true.
// Each check reads source files. A rule test that has never failed has not been shown to test anything:
// when you add one, put the bug back once and watch it fail (see MD/rules.md section 10).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { measureTokens } from './contrast.ts'
import { THEME_COLOR } from './theme.ts'
import { declarations, themesFromCss } from './contrast.ts'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const COMPONENTS = join(SRC, 'components')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const rel = (p: string) => relative(SRC, p).replaceAll('\\', '/')
const read = (p: string) => readFileSync(p, 'utf8')
const inComponents = (ext: RegExp) => walk(COMPONENTS).filter((p) => ext.test(p))

/** Canvas art that draws pixels directly and cannot use CSS variables. Listed so the exception is visible and finite. */
const COLOUR_EXCEPTIONS = new Set(['components/organisms/DebrisBackdrop/DebrisBackdrop.tsx'])

function offenders(files: string[], pattern: RegExp, except: ReadonlySet<string> = new Set()): string[] {
  const bad: string[] = []
  for (const f of files) {
    if (except.has(rel(f))) continue
    read(f).split('\n').forEach((line, i) => { if (pattern.test(line)) bad.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 90)}`) })
  }
  return bad
}

test('every colour pair in tokens.css meets its contrast minimum, in both themes', () => {
  const css = read(join(SRC, 'styles/tokens.css'))
  const failing = measureTokens(css).filter((m) => !m.pass).map((m) => `${m.theme} ${m.fg} on ${m.bg}: ${m.ratio.toFixed(2)} < ${m.min}`)
  assert.deepEqual(failing, [])
})

test('no literal colours in component files: every colour is a token (rules.md §4)', () => {
  const files = inComponents(/\.(css|tsx|ts)$/)
  assert.deepEqual(offenders(files, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(/, COLOUR_EXCEPTIONS), [])
})

test('the colour exception list only names files that still exist', () => {
  for (const f of COLOUR_EXCEPTIONS) assert.doesNotThrow(() => statSync(join(SRC, f)), f)
})

test('no !important in component styles (rules.md §1.6)', () => {
  assert.deepEqual(offenders(inComponents(/\.css$/), /!important/), [])
})

test('one component per file (rules.md §1)', () => {
  const bad = inComponents(/\.tsx$/).filter((f) => (read(f).match(/^export (default )?(function|class) [A-Z]/gm) ?? []).length > 1).map(rel)
  assert.deepEqual(bad, [])
})

test('each component lives in a folder of its own name, with styles named after it', () => {
  const bad: string[] = []
  for (const f of inComponents(/\.(tsx|css)$/)) {
    const parts = rel(f).split('/')
    const file = parts[parts.length - 1].replace(/\.(tsx|css)$/, '')
    const folder = parts[parts.length - 2]
    if (file !== folder) bad.push(rel(f))
  }
  assert.deepEqual(bad, [])
})

test('components never fetch or touch storage; data comes in as props (rules.md §1.2)', () => {
  assert.deepEqual(offenders(inComponents(/\.tsx$/), /\bfetch\(|apiFetch|localStorage|sessionStorage/), [])
})

test('text from outside is shown as text, never as HTML', () => {
  const files = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.ts$/.test(p))
  assert.deepEqual(offenders(files, /innerHTML|outerHTML|insertAdjacentHTML|dangerouslySetInnerHTML|document\.write\(|\beval\(|new Function\(/), [])
})

test('a lower level never imports a higher one: atoms < molecules < organisms < views', () => {
  const bad: string[] = []
  const rule: Record<string, RegExp> = {
    atoms: /from '(\.\.\/\.\.\/|@\/components\/)(molecules|organisms|views)\//,
    molecules: /from '(\.\.\/\.\.\/|@\/components\/)(organisms|views)\//,
    organisms: /from '(\.\.\/\.\.\/|@\/components\/)views\//,
  }
  for (const f of inComponents(/\.tsx$/)) {
    const level = rel(f).split('/')[1]
    const re = rule[level]
    if (re) read(f).split('\n').forEach((line, i) => { if (re.test(line)) bad.push(`${rel(f)}:${i + 1}`) })
  }
  assert.deepEqual(bad, [])
})

test('the browser theme-color matches the page background token, in both themes', () => {
  const t = themesFromCss(read(join(SRC, 'styles/tokens.css')))
  assert.equal(THEME_COLOR.dark.toLowerCase(), t.dark['--bg-canvas'].toLowerCase())
  assert.equal(THEME_COLOR.light.toLowerCase(), t.light['--bg-canvas'].toLowerCase())
})

test('index.html repeats the theme-color values: they must equal THEME_COLOR', () => {
  const html = read(join(SRC, '../index.html'))
  assert.ok(html.includes(`content="${THEME_COLOR.dark}"`), 'the meta tag holds the dark colour')
  assert.ok(html.includes(`'${THEME_COLOR.light}'`) && html.includes(`'${THEME_COLOR.dark}'`), 'the inline script holds both colours')
})

test('base styles keep a visible focus ring and honour reduced motion (rules.md §7)', () => {
  const base = read(join(SRC, 'styles/base.css'))
  assert.match(base, /^:focus-visible\s*\{[^}]*outline:\s*\d+px solid/m)
  assert.match(base, /prefers-reduced-motion:\s*reduce/)
})

test('declarations helper still reads the real tokens file', () => {
  assert.ok(Object.keys(declarations(read(join(SRC, 'styles/tokens.css')))).length > 50)
})

test('both logo files exist at both sizes, and the stylesheet shows one per theme with no backdrop chip', () => {
  for (const f of ['logo-320.png', 'logo-320-light.png', 'logo-640.png', 'logo-640-light.png']) assert.doesNotThrow(() => statSync(join(SRC, '../public', f)), f)
  const t = themesFromCss(read(join(SRC, 'styles/tokens.css')))
  assert.deepEqual([t.dark['--logo-on-dark-display'], t.dark['--logo-on-light-display']], ['block', 'none'])
  assert.deepEqual([t.light['--logo-on-dark-display'], t.light['--logo-on-light-display']], ['none', 'block'])
  assert.equal(t.light['--logo-backdrop'], undefined)
})
