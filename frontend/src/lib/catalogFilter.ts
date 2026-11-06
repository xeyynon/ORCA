import type { TleRecord } from '@/api/types'
import { deriveOrbit, REGIMES } from './orbit'
import type { Regime } from './orbit'

/** The Overview catalog filter. An empty `regimes` list means "every regime". Applies to loaded rows only. */
export interface CatalogFilter {
  /** Free text: matches object name or NORAD id, case-insensitive, surrounding space ignored. */
  query: string
  regimes: readonly Regime[]
}

export const NO_FILTER: CatalogFilter = { query: '', regimes: [] }

export const normalizeQuery = (q: string): string => q.trim().toLowerCase()

export function isFilterActive(f: CatalogFilter): boolean {
  return normalizeQuery(f.query) !== '' || f.regimes.length > 0
}

function matchesQuery(t: TleRecord, q: string): boolean {
  return q === '' || t.object_name.toLowerCase().includes(q) || t.norad_cat_id.toLowerCase().includes(q)
}

/** Rows that satisfy the filter, in their original order. A regime filter drops rows whose orbit cannot be derived. */
export function filterCatalog(rows: readonly TleRecord[], f: CatalogFilter): readonly TleRecord[] {
  if (!isFilterActive(f)) return rows
  const q = normalizeQuery(f.query)
  return rows.filter((t) => {
    if (!matchesQuery(t, q)) return false
    if (f.regimes.length === 0) return true
    const o = deriveOrbit(t)
    return o !== null && f.regimes.includes(o.regime)
  })
}

/** Per-regime counts among rows matching the text query (regime chips are ignored, so each chip shows what it would add). */
export function regimeCounts(rows: readonly TleRecord[], query: string): Record<Regime, number> {
  const q = normalizeQuery(query)
  const counts = Object.fromEntries(REGIMES.map((r) => [r, 0])) as Record<Regime, number>
  for (const t of rows) {
    if (!matchesQuery(t, q)) continue
    const o = deriveOrbit(t)
    if (o) counts[o.regime] += 1
  }
  return counts
}

/** Add the regime if absent, remove it if present; the result keeps REGIMES order. */
export function toggleRegime(current: readonly Regime[], r: Regime): Regime[] {
  const next = new Set(current)
  if (next.has(r)) next.delete(r)
  else next.add(r)
  return REGIMES.filter((x) => next.has(x))
}

/** A plain-language statement of the filter, for "nothing matched" messages. */
export function describeFilter(f: CatalogFilter): string {
  const parts: string[] = []
  const q = f.query.trim()
  if (q) parts.push(`name or NORAD id containing "${q}"`)
  if (f.regimes.length) parts.push(`regime ${f.regimes.join(' or ')}`)
  return parts.join(' and ')
}
