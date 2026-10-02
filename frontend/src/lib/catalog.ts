import type { TleRecord } from '@/api/types'
import { ageDays } from './time'
import { deriveOrbit, REGIMES } from './orbit'
import type { Regime } from './orbit'

export interface CatalogSummary {
  count: number
  newestAgeDays: number | null
  oldestAgeDays: number | null
  medianAltKm: number | null
  regimes: Record<Regime, number>
  /** Objects whose mean motion was not physical, so they could not be classified. */
  unclassified: number
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null
  const m = sorted.length >> 1
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

/** One pass over the catalog for the Overview KPIs. Nothing is invented for objects that cannot be derived: they are counted as unclassified. */
export function summarizeCatalog(tles: readonly TleRecord[], now: Date): CatalogSummary {
  const regimes = Object.fromEntries(REGIMES.map((r) => [r, 0])) as Record<Regime, number>
  const ages: number[] = []
  const alts: number[] = []
  let unclassified = 0
  for (const t of tles) {
    ages.push(ageDays(t.epoch, now))
    const o = deriveOrbit(t)
    if (!o) { unclassified += 1; continue }
    regimes[o.regime] += 1
    alts.push(o.meanAltKm)
  }
  alts.sort((a, b) => a - b)
  return {
    count: tles.length,
    newestAgeDays: ages.length ? Math.min(...ages) : null,
    oldestAgeDays: ages.length ? Math.max(...ages) : null,
    medianAltKm: median(alts),
    regimes,
    unclassified,
  }
}
