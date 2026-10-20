import type { FetchOutcome } from '@/api/types'

/** Below this many objects a quiet conjunction search is expected, not a sign of a problem. */
export const SMALL_CATALOG_MAX = 200

export const isSmallCatalog = (count: number | null): count is number => count !== null && count > 0 && count < SMALL_CATALOG_MAX

/**
 * Why a catalog holds nothing, from the API's record of its last Celestrak fetch (rules.md §2.5: a failed
 * request is not an empty result).
 *  failed  - Celestrak refused or could not be reached; `detail` is the API's own sentence
 *  empty   - Celestrak answered but sent nothing usable
 *  never   - no fetch has run since the server started
 *  nothing - the last fetch reported success and the catalog is still empty
 */
export type EmptyCause =
  | { kind: 'failed'; detail: string; at: string }
  | { kind: 'empty'; at: string }
  | { kind: 'never' }
  | { kind: 'nothing'; at: string }

export function whyCatalogEmpty(lastFetch: FetchOutcome | null | undefined): EmptyCause {
  if (!lastFetch) return { kind: 'never' }
  switch (lastFetch.status) {
    case 'ok': return { kind: 'nothing', at: lastFetch.at }
    case 'empty': return { kind: 'empty', at: lastFetch.at }
    default: return { kind: 'failed', detail: lastFetch.detail, at: lastFetch.at }
  }
}

/** The Celestrak group the refresh pulls, as the API reports it; null when an older API does not say. */
export function groupLabel(group: string | null | undefined): string | null {
  const g = group?.trim()
  return g ? g : null
}
