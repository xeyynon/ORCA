/** WCAG 2.x contrast, and the check of ORCA's own design tokens against it. Pure: no DOM, no file access. */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** "#rgb" or "#rrggbb" to [r, g, b] (0-255), or null for anything else (rgba(), var(), a name). */
export function parseHex(value: string): [number, number, number] | null {
  const v = value.trim()
  if (!HEX.test(v)) return null
  const h = v.slice(1)
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Contrast ratio between two opaque colours, 1 to 21. */
export function contrastRatio(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export type Tokens = Record<string, string>

/** Declarations of one CSS block: `--name: value;` pairs. Comments are dropped first. */
export function declarations(block: string): Tokens {
  const out: Tokens = {}
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/**
 * Dark and light token sets from tokens.css. Light redefines names on top of dark, so a name light does not mention
 * keeps its dark value (exactly what the cascade does).
 */
export function themesFromCss(css: string): { dark: Tokens; light: Tokens } {
  const darkBlock = css.match(/:root,\s*:root\[data-theme="dark"\][^{]*\{([\s\S]*?)\n\}/)
  const lightBlock = css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)
  if (!darkBlock || !lightBlock) throw new Error('tokens.css: could not find the dark and light blocks')
  const dark = declarations(darkBlock[1])
  return { dark, light: { ...dark, ...declarations(lightBlock[1]) } }
}

export type PairKind = 'text' | 'faint' | 'mark'
export interface Pair { fg: string; bg: string; kind: PairKind }
export interface Measurement extends Pair { theme: 'dark' | 'light'; ratio: number; min: number; pass: boolean }

/** Minimum ratio per kind: body text 4.5; faint (placeholders, decoration-adjacent text) 3; graphics on a canvas 3. */
export const MIN_RATIO: Record<PairKind, number> = { text: 4.5, faint: 3, mark: 3 }

const SURFACES = ['--bg-canvas', '--bg-panel', '--bg-card'] as const
const TEXT = ['--text-primary', '--text-secondary', '--text-tertiary', '--accent-ink', '--risk-critical-ink', '--risk-high-ink',
  '--risk-medium-ink', '--risk-low-ink', '--risk-negligible-ink', '--ok-ink', '--warn-ink', '--bad-ink'] as const
/** The report paper (always white, both themes): its text and the risk marks drawn on it. */
const PAPER_TEXT = ['--paper-ink', '--paper-ink-2', '--paper-ink-3', '--paper-accent'] as const
const PAPER_MARKS = ['--paper-risk-critical', '--paper-risk-high', '--paper-risk-medium', '--paper-risk-low', '--paper-risk-negligible'] as const
const MARKS = ['--accent', '--risk-critical', '--risk-high', '--risk-medium', '--risk-low', '--ok', '--warn', '--bad', '--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5'] as const

/** Every text/surface and mark/surface pair the interface actually draws. */
export function tokenPairs(): Pair[] {
  const pairs: Pair[] = []
  for (const bg of SURFACES) {
    for (const fg of TEXT) pairs.push({ fg, bg, kind: 'text' })
    pairs.push({ fg: '--text-faint', bg, kind: 'faint' })
    for (const fg of MARKS) pairs.push({ fg, bg, kind: 'mark' })
  }
  for (const fg of PAPER_TEXT) pairs.push({ fg, bg: '--paper-bg', kind: 'text' })
  for (const fg of PAPER_TEXT) pairs.push({ fg, bg: '--paper-fill', kind: 'text' })
  for (const fg of PAPER_MARKS) pairs.push({ fg, bg: '--paper-bg', kind: 'mark' })
  return pairs
}

export function measureTokens(css: string): Measurement[] {
  const themes = themesFromCss(css)
  const out: Measurement[] = []
  for (const theme of ['dark', 'light'] as const) {
    for (const p of tokenPairs()) {
      const fg = parseHex(themes[theme][p.fg] ?? '')
      const bg = parseHex(themes[theme][p.bg] ?? '')
      if (!fg || !bg) throw new Error(`tokens.css (${theme}): ${p.fg} or ${p.bg} is missing or not a hex colour`)
      const ratio = contrastRatio(fg, bg)
      const min = MIN_RATIO[p.kind]
      out.push({ ...p, theme, ratio, min, pass: ratio >= min })
    }
  }
  return out
}
