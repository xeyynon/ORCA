import type { ConjunctionEvent, RiskLevel } from '@/api/types'
import { pairKey } from './pair'
import { RISK_ORDER } from './risk'

/**
 * The Reports view: what a report can hold, and the pure decisions behind it (which sections, in what order, whether it
 * can be generated, its file name). The document itself is components/organisms/ReportDocument.
 */

export type ReportSectionId = 'summary' | 'approaches' | 'pair' | 'quality'

export const REPORT_SECTIONS: ReadonlyArray<{ id: ReportSectionId; title: string; about: string }> = [
  { id: 'summary', title: 'Situation summary', about: 'Catalogue size, where objects orbit, and the headline figures of the run.' },
  { id: 'approaches', title: 'Close approaches', about: 'Risk tier counts and the top approaches: pair, TCA, miss distance, Pc, risk.' },
  { id: 'pair', title: 'Single pair analysis', about: 'One approach in depth: geometry, probability, uncertainty, data age and caveats.' },
  { id: 'quality', title: 'Data quality and method', about: 'How old the data is, where it comes from, how screening and Pc work, and the limits.' },
]

export const TOP_N_OPTIONS = [10, 25, 50, 100] as const
export type TopN = (typeof TOP_N_OPTIONS)[number]

export interface ReportOptions {
  sections: Record<ReportSectionId, boolean>
  topN: TopN
  /** The pair for the single-pair section (pairKey), or null for none chosen. */
  pairKey: string | null
}

export const DEFAULT_REPORT: ReportOptions = { sections: { summary: true, approaches: true, pair: false, quality: true }, topN: 10, pairKey: null }

/** The included sections, in report order. */
export function includedSections(o: ReportOptions): ReportSectionId[] {
  return REPORT_SECTIONS.map((s) => s.id).filter((id) => o.sections[id])
}

/**
 * Why the report cannot be generated yet, in words for the button's hint; null when it can. A report never goes out
 * with an empty section: a run-based section needs the run, the pair section needs a pair.
 */
export function blockedReason(o: ReportOptions, haveRun: boolean, events: readonly ConjunctionEvent[]): string | null {
  const ids = includedSections(o)
  if (ids.length === 0) return 'Choose at least one section.'
  if ((o.sections.approaches || o.sections.pair) && !haveRun) return 'The close-approach run is still loading.'
  if (o.sections.pair && (o.pairKey === null || !events.some((e) => pairKey(e) === o.pairKey))) return 'Choose the pair to analyse.'
  return null
}

/** The pair to preselect: the one already selected on Conjunctions if it is in the run, else the worst of the run. */
export function defaultPairKey(events: readonly ConjunctionEvent[], selected: string | null, worst: ConjunctionEvent | undefined): string | null {
  if (selected && events.some((e) => pairKey(e) === selected)) return selected
  return worst ? pairKey(worst) : null
}

/** Tier counts in severity order, every tier present (0 when the run had none), for the report's tier table. */
export function tierRows(counts: Partial<Record<RiskLevel, number>>): Array<{ level: RiskLevel; count: number }> {
  return RISK_ORDER.map((level) => ({ level, count: counts[level] ?? 0 }))
}

/** The file name the browser offers when saving the PDF (it uses the document title): "ORCA-report-2026-11-07-0930-UTC". */
export function reportFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `ORCA-report-${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())}-${p(now.getUTCHours())}${p(now.getUTCMinutes())}-UTC`
}

/** A short reference for the report header, stable for one generation time: "ORCA-20261107-0930". */
export function reportReference(now: Date): string {
  return reportFileName(now).replace('ORCA-report-', 'ORCA-').replace(/-UTC$/, '').replace(/^(ORCA-\d{4})-(\d{2})-(\d{2})-/, '$1$2$3-')
}
