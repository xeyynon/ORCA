import { integer } from './format'
import { REGIMES } from './orbit'
import type { Regime } from './orbit'

/** The regimes in words, for a sentence a newcomer can read. */
export const REGIME_NAME: Record<Regime, string> = {
  LEO: 'low Earth orbit',
  MEO: 'medium Earth orbit',
  GEO: 'geostationary orbit',
  HEO: 'highly elliptical orbits',
}

/**
 * A share as a whole percent for a label. A non-zero share that rounds to 0 is "<1%", so a sliver is never read as
 * none; a share that rounds to 100 but is not all of it is ">99%". Null when the total is unknown or zero.
 */
export function sharePercent(count: number, total: number | null): string | null {
  if (total === null || !(total > 0) || !Number.isFinite(count) || count < 0) return null
  if (count === 0) return '0%'
  const p = (count / total) * 100
  if (p < 1) return '<1%'
  if (p > 99 && count < total) return '>99%'
  return `${Math.round(p)}%`
}

export interface RegimeShare { regime: Regime; count: number; fraction: number }

/** Each regime's count and its fraction of `total` (which includes any unclassified objects), in the standard order. */
export function regimeShares(counts: Record<Regime, number>, total: number): RegimeShare[] {
  return REGIMES.map((regime) => {
    const count = counts[regime] ?? 0
    return { regime, count, fraction: total > 0 ? count / total : 0 }
  })
}

/** The regime holding the most objects; null when every count is zero. Ties go to the earlier regime in REGIMES. */
export function dominantRegime(counts: Record<Regime, number>): Regime | null {
  let best: Regime | null = null
  for (const r of REGIMES) if ((counts[r] ?? 0) > 0 && (best === null || counts[r] > counts[best])) best = r
  return best
}

export interface StoryInput {
  regimes: Record<Regime, number> | null
  /** Denominator for the regime share: every object counted, classified or not. */
  total: number | null
  medianAgeDays: number | null
}

/**
 * The catalog's story in one sentence, built only from the numbers given: "95% in low Earth orbit; element sets a
 * median 30 days old." A part whose number is missing is left out, and null comes back when there is nothing to say.
 */
export function catalogStory({ regimes, total, medianAgeDays }: StoryInput): string | null {
  const parts: string[] = []
  const top = regimes ? dominantRegime(regimes) : null
  const pct = top && regimes ? sharePercent(regimes[top], total) : null
  if (top && pct) parts.push(`${pct} in ${REGIME_NAME[top]}`)
  if (medianAgeDays !== null && Number.isFinite(medianAgeDays) && medianAgeDays >= 0) {
    const d = Math.round(medianAgeDays)
    parts.push(medianAgeDays < 1 ? 'element sets a median of under a day old' : `element sets a median ${d} ${d === 1 ? 'day' : 'days'} old`)
  }
  if (parts.length === 0) return null
  const s = parts.join('; ')
  return `${s[0].toUpperCase()}${s.slice(1)}.`
}

/**
 * Which objects the story's numbers cover, said when they are not all the stored ones: the regime share may come from
 * the server's whole-catalog count while the ages come from the rows loaded in the browser (the first N by name).
 * Null when everything shown covers the whole catalog, or when the sizes are unknown.
 */
export function storyScope({ wholeCounts, loaded, total }: { wholeCounts: boolean; loaded: number | null; total: number | null }): string | null {
  if (loaded === null || total === null || loaded >= total) return null
  const slice = `the first ${integer(loaded)} of ${integer(total)} objects (by name), as loaded here`
  return wholeCounts ? `The share counts every stored object; the age is from ${slice}.` : `The share and the age are from ${slice}.`
}

/** "inferred from object names" -> "Inferred from object names." A server phrase shown as a caption. */
export function asSentence(phrase: string): string {
  const s = phrase.trim()
  if (!s) return ''
  return `${s[0].toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? '' : '.'}`
}

/** The short name at the head of a glossary definition ("Two-line element set. This is ..." gives "Two-line element set"). */
export function shortMeaning(definition: string): string {
  const ends = [definition.indexOf(':'), definition.indexOf('. ')].filter((i) => i > 0)
  const i = ends.length ? Math.min(...ends) : -1
  return (i > 0 ? definition.slice(0, i) : definition).trim()
}
