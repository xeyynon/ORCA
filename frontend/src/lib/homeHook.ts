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

/** How current the catalog is: stale when its median element set is older than the staleness limit. */
export interface CatalogFreshness {
  stale: boolean
  /** When the API last stored a fetch (naive UTC), or null if never through the API. */
  asOf: string | null
}

/** The spec's supporting copy. */
export const HOME_SUB = 'Track orbital object motion, identify near misses and evaluate potential collision risk with use of existing public data on the position of orbital objects.'

/**
 * The opening of the home page: the real object count as the headline (the owner kept the number as the hook,
 * 2026-11-07), and what ORCA does. The catalog is CelesTrak's list of ACTIVE satellites, so the headline says
 * "active satellites", never "objects orbiting the Earth" (that would include debris the list does not hold; audit
 * 2026-11-18, P0 #1). "Follows" only while the data is fresh: on a stale catalog the headline is in the past tense and
 * dated (audit 2026-11-15, P0 #1), because a month-old catalog is not "now".
 */
export function hookLines(objects: number | null, freshness: CatalogFreshness | null = null): HookLines {
  const sub = HOME_SUB
  if (objects === null || !(objects > 0)) return { headline: 'ORCA follows thousands of active satellites', sub }
  const n = integer(objects)
  if (!freshness?.stale) return { headline: `ORCA follows ${n} active satellites`, sub }
  if (freshness.asOf) return { headline: `ORCA was following ${n} active satellites on ${formatDay(freshness.asOf)}`, sub }
  return { headline: `There are ${n} active satellites in our stored catalog`, sub }
}
