import { integer } from './format'
import { formatUtc } from './time'

/** The figures of one conjunction run that the home page's opening sentence may quote. */
export interface HookRun {
  totalEvents: number
  reportKm: number
  horizonDays: number
  highRisk: number
  critical: number
  /** When the run's window started (naive UTC from the API). */
  windowStart: string
  /** A stored example shipped with the app, not a search run in this session. */
  saved: boolean
}

export interface HookLines {
  headline: string
  /** The second sentence: what happens up there, and what ORCA does about it. */
  sub: string
  /** Where the run figures come from. Null when the sub-line quotes no run. */
  source: string | null
}

const WHAT_ORCA_DOES = 'ORCA finds those close approaches and shows how risky each one is.'

/**
 * The opening of the home page, written for someone who has never heard of ORCA: one striking, true sentence and why it
 * matters. Every figure is real: the object count from the catalog, the pair count from a run (live or the stored
 * example, and the source line says which). With no count yet the headline still reads, without a number.
 */
export function hookLines(objects: number | null, run: HookRun | null): HookLines {
  const headline = objects !== null && objects > 0
    ? `${integer(objects)} objects are circling Earth right now.`
    : 'Thousands of objects are circling Earth right now.'
  if (!run || run.totalEvents <= 0) {
    return { headline, sub: `Some of them pass within a few kilometres of each other. ${WHAT_ORCA_DOES}`, source: null }
  }
  const span = run.horizonDays === 1 ? 'one day' : `${run.horizonDays} days`
  const pairs = run.totalEvents === 1 ? 'pair' : 'pairs'
  return {
    headline,
    sub: `In ${span} of their orbits, ${integer(run.totalEvents)} ${pairs} came within ${run.reportKm} km of each other. ${WHAT_ORCA_DOES}`,
    source: run.saved
      ? `Pair and risk counts from a stored example run starting ${formatUtc(run.windowStart)}.`
      : `Pair and risk counts from your search starting ${formatUtc(run.windowStart)}.`,
  }
}

/** One big figure and the words under it, for the home page's stat row. */
export interface Stat {
  figure: string
  caption: string
  /** A short second line, quieter than the caption. */
  note: string | null
}

/**
 * The "close approaches" stat: the most severe tier that has any approaches, with the other tier as the note. Never the
 * bare pair total, which sounds alarming and says nothing about risk.
 */
export function riskStat(run: HookRun | null): Stat | null {
  if (!run) return null
  if (run.totalEvents <= 0) return { figure: '0', caption: `pairs within ${run.reportKm} km`, note: null }
  if (run.critical > 0) {
    return { figure: integer(run.critical), caption: `critical ${run.critical === 1 ? 'approach' : 'approaches'}`, note: `plus ${integer(run.highRisk)} high-risk` }
  }
  return { figure: integer(run.highRisk), caption: `high-risk ${run.highRisk === 1 ? 'approach' : 'approaches'}`, note: 'none critical' }
}
