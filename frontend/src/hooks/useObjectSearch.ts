import { useEffect, useState } from 'react'
import { searchTles } from '@/api/endpoints'
import type { TleRecord } from '@/api/types'
import { searchObjects } from '@/lib/search'

const DEBOUNCE_MS = 200

export interface ObjectSearchState {
  results: TleRecord[]
  loading: boolean
  /** True when the server search failed and `results` come from the loaded subset only. */
  degraded: boolean
}

/**
 * Search the whole stored catalog on the server (debounced, stale requests aborted). If the server
 * cannot answer, fall back to matching the loaded subset and SAY so (`degraded`): a quiet fallback
 * would make a missing object look like a nonexistent one.
 */
export function useObjectSearch(query: string, loaded: readonly TleRecord[]): ObjectSearchState {
  const [state, setState] = useState<ObjectSearchState>({ results: [], loading: false, degraded: false })
  const q = query.trim()

  useEffect(() => {
    if (!q) { setState({ results: [], loading: false, degraded: false }); return }
    const ctl = new AbortController()
    setState((s) => ({ ...s, loading: true }))
    const id = window.setTimeout(() => {
      searchTles(q, 8, { signal: ctl.signal }).then(
        (results) => { if (!ctl.signal.aborted) setState({ results, loading: false, degraded: false }) },
        () => { if (!ctl.signal.aborted) setState({ results: searchObjects(loaded, q), loading: false, degraded: true }) },
      )
    }, DEBOUNCE_MS)
    return () => { window.clearTimeout(id); ctl.abort() }
    // `loaded` only feeds the offline fallback; re-running the search when it changes would be wasted requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return state
}
