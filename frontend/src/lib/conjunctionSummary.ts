import type { ConjunctionSearchResult, RiskLevel } from '@/api/types'
import { integer } from './format'
import { RISK_ORDER } from './risk'
import { NO_DATA, parseUtc } from './time'

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "18 Nov 10:54" (UTC); the year is added only when the two ends of a window fall in different years. */
function stamp(d: Date, withYear: boolean): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

/**
 * A search window named by its dates: "18 Nov 10:54 to 19 Nov 10:54 UTC". Never "the next 24 hours": a window starts
 * when the search ran, so part of it (or all of it, for the saved example) can already be in the past (audit 2026-11-18 #5).
 */
export function windowText(startIso: string, endIso: string): string {
  const a = parseUtc(startIso)
  const b = parseUtc(endIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NO_DATA
  const years = a.getUTCFullYear() !== b.getUTCFullYear()
  return `${stamp(a, years)} to ${stamp(b, years)} UTC`
}

/** How long a search took, in words a person says: "45 s", "3 min 20 s", "1 h 5 min". */
export function durationText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return NO_DATA
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`
  const m = Math.round((s % 3600) / 60)
  return `${Math.floor(s / 3600)} h${m ? ` ${m} min` : ''}`
}

/**
 * The one-sentence answer a reader wants before any table: how many approaches need attention. It counts over EVERY
 * approach found (tier counts), not the rows shown, and it names the window by its dates so "none" is never read as
 * "none ever". Tiers are a ranking under an assumed uncertainty, not a fact about the pair, so they are "ranked".
 */
export function resultAnswer(counts: Record<RiskLevel, number>, total: number, window: { start: string; end: string }, reportKm: number): ResultAnswer {
  const c = counts.CRITICAL
  const h = counts.HIGH
  const w = windowText(window.start, window.end)
  const minor = counts.LOW + counts.NEGLIGIBLE
  const detail = `A total of ${integer(total)} ${total === 1 ? 'approach' : 'approaches'} closer than ${reportKm} km ${total === 1 ? 'was' : 'were'} found. Of these, ${integer(minor)} ${minor === 1 ? 'was' : 'were'} ranked low or negligible.`
  if (c > 0) return { tone: 'alert', headline: `${integer(c)} ${c === 1 ? 'approach' : 'approaches'} ranked critical and ${integer(h)} ranked high, ${w}`, detail }
  if (h > 0) return { tone: 'watch', headline: `No approaches ranked critical and ${integer(h)} ranked high, ${w}`, detail }
  return { tone: 'calm', headline: `No approaches ranked critical or high, ${w}`, detail }
}
