import { useEffect } from 'react'
import { getPositions } from '@/api/endpoints'
import { useAsync } from './useAsync'

const LIVE_REFRESH_MS = 20_000

/**
 * Catalog positions at now + offsetHours. Live (offset 0) refreshes every 20 s; the client extrapolates
 * with velocity in between, so the globe moves smoothly without a request per frame. A scrubbed
 * (future) snapshot is frozen and never auto-refreshes.
 */
export function usePositions(limit: number, offsetHours: number, ids: readonly string[] = []) {
  // `ids.join` is the dependency, so a new array holding the same ids does not refetch.
  const state = useAsync((signal) => getPositions(limit, offsetHours, ids, { signal }), [limit, offsetHours, ids.join(',')])
  const { reload } = state
  useEffect(() => {
    if (offsetHours !== 0) return
    const id = window.setInterval(reload, LIVE_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [offsetHours, reload])
  return state
}
