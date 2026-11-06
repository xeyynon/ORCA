import type { ConjunctionQuery } from './endpoints'
import type { ConjunctionSearchResult } from './types'

/** The query the stored example was run with. Shown beside it, so the headline names the right horizon. */
export const SAVED_RUN_QUERY: ConjunctionQuery = { horizonDays: 1, limit: 100 }

/**
 * A real search response (1-day horizon over the stored catalog, top 100 rows) kept in the bundle, so the page can be
 * explored without waiting for a fresh run. It is loaded on demand (its own chunk) and is never presented as live:
 * see SavedRunBanner. It contains public TLE-derived data only. Regenerate it with `GET /api/conjunctions` when the
 * engine changes, or the example will describe an engine that no longer exists.
 */
export async function loadSavedRun(): Promise<ConjunctionSearchResult> {
  const mod = await import('../data/savedConjunctionRun.json')
  return mod.default as unknown as ConjunctionSearchResult
}
