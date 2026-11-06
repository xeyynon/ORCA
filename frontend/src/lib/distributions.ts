import type { CatalogColumns } from '@/api/types'
import type { ChartRow } from './catalog'

/**
 * Rebuild per-object rows from the server's whole-catalog columns, so the Analytics charts keep using the same tested
 * derive/bin code (deriveSeries, binLog, binGrid, topGroups) on every object instead of the first 5,000.
 * Returns null when the columns disagree in length or the count: a malformed response is not drawn.
 */
export function columnsToRows(c: CatalogColumns): ChartRow[] | null {
  const n = c.name.length
  const lengths = [c.epoch_unix_s.length, c.inclination_deg.length, c.eccentricity.length, c.mean_motion_rev_per_day.length]
  if (c.count !== n || lengths.some((len) => len !== n)) return null
  const rows: ChartRow[] = new Array(n)
  for (let k = 0; k < n; k += 1) {
    rows[k] = {
      object_name: c.name[k],
      epoch: new Date(c.epoch_unix_s[k] * 1000).toISOString(),
      inclination: c.inclination_deg[k],
      eccentricity: c.eccentricity[k],
      mean_motion: c.mean_motion_rev_per_day[k],
    }
  }
  return rows
}
