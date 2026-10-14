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
