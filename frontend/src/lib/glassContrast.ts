/**
 * Text on glass (Glassmorphism): the glass is translucent, so its text must reach 4.5:1 against
 * the WORST thing that can sit behind it, composited through the glass. This measures that from tokens.css. Pure.
 *
 * Worst cases are the extremes the globe can draw behind the playback bar and legend, read from the shader in
 * globe/EarthScene.ts and the vendored maps in public/textures (measured 2026-11-07, unblurred, so the 14 px blur only
 * helps):
 *   dark  - the lit limb: day map x 0.56 + fresnel + atmosphere peaks at #a2b6d7; city lights x 0.9 peak at #e6e6e6;
 *           a selected object is drawn in --text-primary (#f2f5f9). The brightest of these binds.
 *   light - no terminator and day x 0.55, so the open ocean goes down to #000007; the page behind is --bg-abyss.
 */
import { contrastRatio, parseHex, themesFromCss } from './contrast.ts'
import type { Tokens } from './contrast.ts'

export type Rgb = [number, number, number]

export const GLASS_WORST_CASE: Record<'dark' | 'light', readonly { name: string; rgb: Rgb }[]> = {
  dark: [
    { name: 'lit limb', rgb: [162, 182, 215] },
    { name: 'city lights peak', rgb: [230, 230, 230] },
    { name: 'selected object', rgb: [242, 245, 249] },
  ],
  light: [
    { name: 'open ocean', rgb: [0, 0, 7] },
    { name: 'page behind the globe', rgb: [221, 229, 238] },
  ],
}

/** Text tokens drawn on the glass: legend labels and caption, the time readout, slider ticks, the Live/Paused badge. */
export const GLASS_TEXT = ['--text-primary', '--text-secondary', '--text-tertiary'] as const
/** Badges lay a 14% tint of their mark over whatever is under them (Badge.css), then write in the ink. */
export const GLASS_BADGES = ['ok', 'warn'] as const
const BADGE_TINT = 0.14

/** `top` at opacity `alpha` over an opaque `under`, as the browser composites it (8-bit, rounded). */
export function composite(top: Rgb, alpha: number, under: Rgb): Rgb {
  return top.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha))) as Rgb
}

/** "rgba(r, g, b, a)" to its colour and alpha, or null. */
export function parseRgba(value: string): { rgb: Rgb; alpha: number } | null {
  const m = value.trim().match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i)
  return m ? { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: Number(m[4]) } : null
}

export interface GlassRow { theme: 'dark' | 'light'; behind: string; text: string; ratio: number; pass: boolean }

function rowsFor(theme: 'dark' | 'light', tokens: Tokens, glass: { rgb: Rgb; alpha: number }): GlassRow[] {
  const hex = (name: string): Rgb => {
    const v = parseHex(tokens[name] ?? '')
    if (!v) throw new Error(`tokens.css (${theme}): ${name} is missing or not a hex colour`)
    return v
  }
  const out: GlassRow[] = []
  for (const w of GLASS_WORST_CASE[theme]) {
    const surface = composite(glass.rgb, glass.alpha, w.rgb)
    for (const t of GLASS_TEXT) {
      const ratio = contrastRatio(hex(t), surface)
      out.push({ theme, behind: w.name, text: t, ratio, pass: ratio >= 4.5 })
    }
    for (const b of GLASS_BADGES) {
      const ratio = contrastRatio(hex(`--${b}-ink`), composite(hex(`--${b}`), BADGE_TINT, surface))
      out.push({ theme, behind: w.name, text: `--${b}-ink on its badge`, ratio, pass: ratio >= 4.5 })
    }
  }
  return out
}

/** Every text-on-glass pair in both themes, measured over each worst case. `alphaOverride` tries another alpha. */
export function measureGlass(css: string, alphaOverride?: Partial<Record<'dark' | 'light', number>>): GlassRow[] {
  const themes = themesFromCss(css)
  return (['dark', 'light'] as const).flatMap((theme) => {
    const glass = parseRgba(themes[theme]['--glass-bg'] ?? '')
    if (!glass) throw new Error(`tokens.css (${theme}): --glass-bg is missing or not rgba()`)
    const alpha = alphaOverride?.[theme] ?? glass.alpha
    return rowsFor(theme, themes[theme], { rgb: glass.rgb, alpha })
  })
}
