import { integer } from './format'

/** The figures of one conjunction run that the home page may quote (the KPI cards and the preview table). */
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
  /** The supporting line: what ORCA does (MD/ORCA_Homepage_Redesign_Context.md, Section 01). */
  sub: string
}

/** The spec's supporting copy. */
export const HOME_SUB = 'Track orbital objects, identify close approaches and assess potential collision risks using publicly available orbital data.'

/**
 * The opening of the home page: the real object count as the headline (the owner kept the number as the hook,
 * 2026-11-07), and what ORCA does. With no count yet the headline still reads, without a number. Run figures are not
 * quoted here: they are in the KPI cards, each with its run named.
 */
export function hookLines(objects: number | null): HookLines {
  const headline = objects !== null && objects > 0
    ? `${integer(objects)} objects are circling Earth right now.`
    : 'Thousands of objects are circling Earth right now.'
  return { headline, sub: HOME_SUB }
}
