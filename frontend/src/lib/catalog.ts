import type { TleRecord } from '@/api/types'
import { ageDays } from './time'
import { deriveOrbit, REGIMES } from './orbit'
import type { Regime } from './orbit'

/** The fields the chart code reads. The loaded rows and the whole-catalog columns (lib/distributions) both satisfy it. */
export type ChartRow = Pick<TleRecord, 'object_name' | 'epoch' | 'inclination' | 'eccentricity' | 'mean_motion'>

export interface CatalogSummary {
  /** Objects in this summary: the LOADED subset, which can be smaller than the stored catalog. */
  count: number
  /** Freshest age among objects whose epoch is not ahead of the clock. */
  newestAgeDays: number | null
  oldestAgeDays: number | null
  medianAgeDays: number | null
  medianAltKm: number | null
  regimes: Record<Regime, number>
  /** Objects whose mean motion was not physical, so they could not be classified. */
  unclassified: number
  /** Objects whose TLE epoch is later than the clock. Counted apart so one cannot make "newest" negative. */
  futureEpochs: number
}

export interface CatalogSeries {
  altKm: number[]
  ecc: number[]
  inclDeg: number[]
  /** Ages in days; objects whose epoch is ahead of the clock are left out (they are counted by summarizeCatalog). */
  ageDays: number[]
  /** One (inclination, altitude) pair per object that could be derived. */
  points: { x: number; y: number }[]
  names: string[]
}

/** Column-wise series for the Analytics charts, derived once per catalog change. */
export function deriveSeries(tles: readonly ChartRow[], now: Date): CatalogSeries {
  const s: CatalogSeries = { altKm: [], ecc: [], inclDeg: [], ageDays: [], points: [], names: [] }
  for (const t of tles) {
    s.inclDeg.push(t.inclination)
    s.ecc.push(t.eccentricity)
    s.names.push(t.object_name)
    const a = ageDays(t.epoch, now)
    if (a >= 0) s.ageDays.push(a)
    const o = deriveOrbit(t)
    if (!o) continue
    s.altKm.push(o.meanAltKm)
    s.points.push({ x: t.inclination, y: o.meanAltKm })
  }
  return s
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null
  const m = sorted.length >> 1
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

/** One pass over the catalog for the Overview KPIs. Nothing is invented for objects that cannot be derived: they are counted as unclassified. */
export function summarizeCatalog(tles: readonly ChartRow[], now: Date): CatalogSummary {
  const regimes = Object.fromEntries(REGIMES.map((r) => [r, 0])) as Record<Regime, number>
  const ages: number[] = []
  const alts: number[] = []
  let unclassified = 0
  let futureEpochs = 0
  for (const t of tles) {
    const a = ageDays(t.epoch, now)
    if (a < 0) futureEpochs += 1
    else ages.push(a)
    const o = deriveOrbit(t)
    if (!o) { unclassified += 1; continue }
    regimes[o.regime] += 1
    alts.push(o.meanAltKm)
  }
  alts.sort((a, b) => a - b)
  ages.sort((a, b) => a - b)
  return {
    count: tles.length,
    newestAgeDays: ages.length ? ages[0] : null,
    oldestAgeDays: ages.length ? ages[ages.length - 1] : null,
    medianAgeDays: median(ages),
    medianAltKm: median(alts),
    regimes,
    unclassified,
    futureEpochs,
  }
}
