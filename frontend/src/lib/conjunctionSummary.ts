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
 * The line above the table. The total is already in the answer above it, so this only says which of them are listed
 * (declutter plan 2026-11-15: one home per figure).
 */
export function tableLine(shown: number, total: number): string {
  if (shown >= total) return `Showing all ${integer(shown)}, with the most likely first`
  return `The ${integer(shown)} most likely approaches`
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
  const detail = `A total of ${integer(total)} ${total === 1 ? 'approach' : 'approaches'} closer than ${reportKm} km ${total === 1 ? 'was' : 'were'} found. Of these, ${integer(minor)} ${minor === 1 ? 'was' : 'were'} rated as low or negligible.`
  if (c > 0) return { tone: 'alert', headline: `There ${c + h === 1 ? 'is' : 'are'} ${integer(c)} critical and ${integer(h)} high-risk ${c + h === 1 ? 'approach' : 'approaches'} within ${w}`, detail }
  if (h > 0) return { tone: 'watch', headline: `There are no critical approaches and ${integer(h)} high-risk ${h === 1 ? 'approach' : 'approaches'} within ${w}`, detail }
  return { tone: 'calm', headline: `There are no critical or high-risk approaches within ${w}`, detail }
}
