import { integer } from './format'
import { formatDay } from './time'

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

/** How current the catalogue is: stale when its median element set is older than the staleness limit. */
export interface CatalogFreshness {
  stale: boolean
  /** When the API last stored a fetch (naive UTC), or null if never through the API. */
  asOf: string | null
}

/** The spec's supporting copy. */
export const HOME_SUB = 'Track orbital objects, identify close approaches and assess potential collision risks using publicly available orbital data.'

/**
 * The opening of the home page: the real object count as the headline (the owner kept the number as the hook,
 * 2026-11-07), and what ORCA does. "Right now" only while the data is fresh: on a stale catalogue the headline is in the
 * past tense and dated (audit 2026-11-15, P0 #1), because a month-old catalogue is not "now".
 */
export function hookLines(objects: number | null, freshness: CatalogFreshness | null = null): HookLines {
  const sub = HOME_SUB
  if (objects === null || !(objects > 0)) return { headline: 'Thousands of objects are circling Earth right now.', sub }
  const n = integer(objects)
  if (!freshness?.stale) return { headline: `${n} objects are circling Earth right now.`, sub }
  if (freshness.asOf) return { headline: `${n} objects were circling Earth on ${formatDay(freshness.asOf)}.`, sub }
  return { headline: `${n} objects are in the stored catalogue.`, sub }
}
