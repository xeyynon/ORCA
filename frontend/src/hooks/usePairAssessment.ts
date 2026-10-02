import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { getPairAssessment } from '@/api/endpoints'
import type { ConjunctionEvent, PairAssessment } from '@/api/types'

/** Re-assess the selected pair (a finer look than the catalog search). Stale responses are dropped. */
export function usePairAssessment(event: ConjunctionEvent | null) {
  const [assessment, setAssessment] = useState<PairAssessment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const a = event?.sat1_id
  const b = event?.sat2_id

  useEffect(() => {
    setAssessment(null); setError(null)
    if (!a || !b) { setLoading(false); return }
    const ctl = new AbortController()
    setLoading(true)
    getPairAssessment(a, b, { signal: ctl.signal }).then(
      (r) => { if (!ctl.signal.aborted) { setAssessment(r); setLoading(false) } },
      (err: unknown) => {
        if (ctl.signal.aborted) return
        setError(err instanceof ApiError ? err : new ApiError('network', String(err)))
        setLoading(false)
      },
    )
    return () => ctl.abort()
  }, [a, b])

  return { assessment, loading, error }
}
