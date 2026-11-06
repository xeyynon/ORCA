import type { ConjunctionSearchResult, RiskLevel } from '@/api/types'
import { integer } from './format'
import { RISK_ORDER } from './risk'

/** Tier counts over EVERY approach the search found, not only the rows returned; missing tiers are 0. */
export function tierCounts(result: Pick<ConjunctionSearchResult, 'tier_counts'>): Record<RiskLevel, number> {
  const out = {} as Record<RiskLevel, number>
  for (const level of RISK_ORDER) out[level] = result.tier_counts[level] ?? 0
  return out
}

/**
 * What the table holds, said so a short list is never mistaken for everything found:
 * "Top 100 of 426,418 approaches closer than 10 km" or "All 12 approaches closer than 10 km".
 */
export function resultHeadline(shown: number, total: number, reportKm: number): string {
  const what = `${total === 1 ? 'approach' : 'approaches'} closer than ${reportKm} km`
  if (total === 0) return `No approaches closer than ${reportKm} km`
  return shown < total ? `Top ${integer(shown)} of ${integer(total)} ${what}` : `All ${integer(total)} ${what}`
}

/** Runtime estimate shown before a search: measured ~1.5-2 min per day of horizon for ~16,000 objects on a laptop. */
export function expectedRuntimeMinutes(objects: number, horizonDays: number): number {
  const perObjectDay = 2.0 / 16000
  return Math.max(0.1, objects * horizonDays * perObjectDay)
}

export type AnswerTone = 'alert' | 'watch' | 'calm'
export interface ResultAnswer { tone: AnswerTone; headline: string; detail: string }

const window = (days: number) => (days === 1 ? 'the next 24 hours' : `the next ${days} days`)

/**
 * The one-sentence answer a reader wants before any table: how many approaches need attention. It counts over EVERY
 * approach found (tier counts), not the rows shown, and it names the window so "none" is never read as "none ever".
 */
export function resultAnswer(counts: Record<RiskLevel, number>, total: number, horizonDays: number, reportKm: number): ResultAnswer {
  const c = counts.CRITICAL
  const h = counts.HIGH
  const w = window(horizonDays)
  const minor = counts.LOW + counts.NEGLIGIBLE
  const detail = `${integer(total)} ${total === 1 ? 'approach' : 'approaches'} closer than ${reportKm} km found in all; ${integer(minor)} of them rank low or negligible.`
  if (c > 0) return { tone: 'alert', headline: `${integer(c)} critical and ${integer(h)} high-risk ${c + h === 1 ? 'approach' : 'approaches'} in ${w}`, detail }
  if (h > 0) return { tone: 'watch', headline: `No critical approaches; ${integer(h)} high-risk in ${w}`, detail }
  return { tone: 'calm', headline: `No critical or high-risk approaches in ${w}`, detail }
}
