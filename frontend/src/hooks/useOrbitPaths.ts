import { useEffect, useState } from 'react'
import { getOrbitPath } from '@/api/endpoints'
import type { Vec3 } from '@/lib/coords'

/** One orbit (ECI path) per selected id. Re-fetched when the selection or time offset changes; stale responses are dropped. */
export function useOrbitPaths(ids: readonly string[], offsetHours: number) {
  const [paths, setPaths] = useState<Map<string, Vec3[]>>(new Map())
  const [failed, setFailed] = useState<string[]>([])
  const key = ids.join(',')

  useEffect(() => {
    if (ids.length === 0) { setPaths(new Map()); setFailed([]); return }
    const ctl = new AbortController()
    Promise.allSettled(ids.map((id) => getOrbitPath(id, offsetHours, { signal: ctl.signal }))).then((results) => {
      if (ctl.signal.aborted) return
      const next = new Map<string, Vec3[]>()
      const bad: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next.set(ids[i], r.value.path)
        else bad.push(ids[i])
      })
      setPaths(next)
      setFailed(bad)
    })
    return () => ctl.abort()
    // `key` stands in for the ids array so a new array with the same ids does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, offsetHours])

  return { paths, failed }
}
