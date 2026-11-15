import type { ConjunctionEvent, FetchOutcome } from '@/api/types'
import { integer } from './format'
import type { HookRun } from './homeHook'
import { riskRank } from './risk'
import { STALE_MEDIAN_DAYS } from './staleness'
import { formatDayRange, parseUtc } from './time'

/**
 * The home page's command-centre figures (MD/ORCA_Homepage_Redesign_Context.md). Pure, so every label can be tested:
 * the rule is that a figure from a run always says which run (the stored example, or your search), and that none is
 * ever presented as live monitoring.
 */

/** Which run a figure comes from, in words for a label, with its article ("the stored example run"). */
export function runName(run: Pick<HookRun, 'saved'>): string {
  return run.saved ? 'the stored example run' : 'your latest search'
}

export type KpiId = 'objects' | 'pairs' | 'high' | 'critical'

export interface HomeKpi {
  id: KpiId
  label: string
  /** The figure; null while it loads. */
  value: string | null
  /** The words under the figure: what it counts, and from which run. */
  context: string
}

/**
 * The four headline figures. The pair count is pairs that came within the report distance, not conjunctions or
 * collisions, and its label says so; the risk tiers keep the run's name attached.
 */
export function homeKpis(objects: number | null, run: HookRun | null): HomeKpi[] {
  const where = run ? runName(run) : null
  return [
    { id: 'objects', label: 'Catalogued objects', value: objects !== null && objects > 0 ? integer(objects) : null, context: 'Objects in the tracked catalogue' },
    {
      id: 'pairs',
      label: 'Close pairs',
      value: run ? integer(run.totalEvents) : null,
      context: run ? `Pairs within ${run.reportKm} km in ${where}` : 'Pairs within the report distance',
    },
    { id: 'high', label: 'High-risk approaches', value: run ? integer(run.highRisk) : null, context: where ? `Flagged in ${where}` : 'Flagged by screening' },
    { id: 'critical', label: 'Critical approaches', value: run ? integer(run.critical) : null, context: where ? `In ${where}` : 'Flagged by screening' },
  ]
}

/** The rows for the home preview: worst risk first, then the higher Pc, then the sooner closest approach. */
export function previewEvents(events: readonly ConjunctionEvent[], n = 5): ConjunctionEvent[] {
  return [...events]
    .sort((a, b) => riskRank(a.risk_level) - riskRank(b.risk_level)
      || b.probability_of_collision - a.probability_of_collision
      || Date.parse(a.tca) - Date.parse(b.tca))
    .slice(0, n)
}

export interface Freshness {
  tone: 'ok' | 'warn'
  word: string
  /** One sentence on what the age means for the figures. */
  explain: string
}

/** How far to trust positions, from the median element-set age. Never calls old data real-time. */
export function freshness(medianAgeDays: number): Freshness {
  const d = Math.round(medianAgeDays)
  if (medianAgeDays <= STALE_MEDIAN_DAYS) {
    return { tone: 'ok', word: 'Fresh', explain: `Half the element sets are under ${Math.max(1, d)} ${d === 1 ? 'day' : 'days'} old: positions are as good as public TLEs allow.` }
  }
  return {
    tone: 'warn',
    word: 'Indicative only',
    explain: `Half the element sets are over ${d} days old. Positions lose accuracy as element sets age, so treat the close approaches as indicative, not operational.`,
  }
}

/** The last Celestrak fetch in words, with a tone. Null outcome: none recorded yet. */
export function fetchSummary(f: FetchOutcome | null | undefined): { tone: 'ok' | 'warn' | 'bad'; text: string } {
  if (!f) return { tone: 'warn', text: 'No fetch recorded yet' }
  switch (f.status) {
    case 'ok': return { tone: 'ok', text: 'Succeeded' }
    case 'empty': return { tone: 'warn', text: 'Returned no data' }
    case 'rate_limited': return { tone: 'warn', text: 'Refused: rate limited by Celestrak' }
    case 'not_found': return { tone: 'bad', text: 'Refused: source not found' }
    case 'http_error': return { tone: 'bad', text: `Failed${f.http_status ? ` (HTTP ${f.http_status})` : ''}` }
    case 'network_error': return { tone: 'bad', text: 'Failed: network error' }
    default: return { tone: 'warn', text: f.detail }
  }
}

/**
 * When a run's approaches happen, in words, and whether that is over: "Closest approaches from 6 to 7 Nov 2026 in the
 * stored example run. That window ended 8 days ago." A past window must never read as upcoming (audit 2026-11-15, P0 #2).
 */
export function runWindowLine(run: Pick<HookRun, 'saved' | 'windowStart'>, windowEnd: string, now: Date): string {
  const range = formatDayRange(run.windowStart, windowEnd)
  const base = `Closest approaches ${range.includes(' to ') ? 'from' : 'on'} ${range} in ${runName(run)}.`
  const endMs = parseUtc(windowEnd).getTime()
  if (Number.isNaN(endMs) || endMs > now.getTime()) return base
  const days = Math.floor((now.getTime() - endMs) / 86_400_000)
  return `${base} That window ended ${days >= 2 ? `${days} days ago` : days === 1 ? 'a day ago' : 'today'}.`
}

/** True when a closest approach is already in the past at `now`. */
export function isPast(tcaIso: string, now: Date): boolean {
  return parseUtc(tcaIso).getTime() < now.getTime()
}
