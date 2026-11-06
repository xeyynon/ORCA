// Prints the contrast of every token pair in src/styles/tokens.css and exits 1 if any falls below its minimum.
// Run: npm run contrast
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { measureTokens } from '../src/lib/contrast.ts'

const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8')
const rows = measureTokens(css)
const failed = rows.filter((r) => !r.pass)

for (const r of rows) {
  const flag = r.pass ? '  ok ' : ' FAIL'
  console.log(`${flag}  ${r.theme.padEnd(5)} ${r.kind.padEnd(5)} ${r.fg.padEnd(22)} on ${r.bg.padEnd(12)} ${r.ratio.toFixed(2)}:1 (min ${r.min})`)
}
console.log(`\n${rows.length} pairs, ${failed.length} below minimum`)
process.exit(failed.length ? 1 : 0)
