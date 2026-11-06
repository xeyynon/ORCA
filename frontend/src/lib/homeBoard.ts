import type { ConjunctionEvent, FetchOutcome } from '@/api/types'
import { integer } from './format'
import type { HookRun } from './homeHook'
import { riskRank } from './risk'
import { STALE_MEDIAN_DAYS } from './staleness'

/**
 * The home page's command-centre figures (MD/ORCA_Homepage_Redesign_Context.md). Pure, so every label can be tested:
 * the rule is that a figure from a run always says which run (the stored example, or your search), and that none is
 * ever presented as live monitoring.
 */

/** Which run a figure comes from, in words for a label. */
export function runName(run: Pick<HookRun, 'saved'>): string {
  return run.saved ? 'stored example run' : 'your latest search'
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
      context: run ? `Pairs within ${run.reportKm} km in the ${where}` : 'Pairs within the report distance',
    },
    { id: 'high', label: 'High-risk approaches', value: run ? integer(run.highRisk) : null, context: where ? `Flagged in the ${where}` : 'Flagged by screening' },
    { id: 'critical', label: 'Critical approaches', value: run ? integer(run.critical) : null, context: where ? `In the ${where}` : 'Flagged by screening' },
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
