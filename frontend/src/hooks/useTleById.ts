import { useEffect, useState } from 'react'
import { getTle } from '@/api/endpoints'
import type { TleRecord } from '@/api/types'

/**
 * The element set for `id`: taken from `known` when already loaded, otherwise fetched. Needed because the
 * browser only holds the first 5,000 objects, yet any stored object can be selected (search, conjunctions).
 */
export function useTleById(id: string | null, known: ReadonlyMap<string, TleRecord>): TleRecord | null {
  const [fetched, setFetched] = useState<TleRecord | null>(null)
  const have = id ? known.get(id) : undefined

  useEffect(() => {
    if (!id || have) { setFetched(null); return }
    const ctl = new AbortController()
    getTle(id, { signal: ctl.signal }).then(
      (t) => { if (!ctl.signal.aborted) setFetched(t) },
      () => { if (!ctl.signal.aborted) setFetched(null) },
    )
    return () => ctl.abort()
  }, [id, have])

  return have ?? (fetched && fetched.norad_cat_id === id ? fetched : null)
}
