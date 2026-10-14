import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { getConjunctions } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import type { ConjunctionEvent, ConjunctionSearchResult } from '@/api/types'

export type SearchPhase = 'idle' | 'running' | 'done' | 'failed'

/**
 * A conjunction search is a long, blocking request. This models it as a job:
 * running (cancellable) -> done | failed. A completed search with zero events is `done`
 * with an empty list: a RESULT, never an error (rules.md §2.4).
 */
export function useConjunctionSearch() {
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [result, setResult] = useState<ConjunctionSearchResult | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [query, setQuery] = useState<ConjunctionQuery | null>(null)
  const [finishedAt, setFinishedAt] = useState<Date | null>(null)
  const ctlRef = useRef<AbortController | null>(null)

  const run = useCallback((q: ConjunctionQuery) => {
    ctlRef.current?.abort()
    const ctl = new AbortController()
    ctlRef.current = ctl
    setPhase('running')
    setError(null)
    setQuery(q)
    getConjunctions(q, { signal: ctl.signal }).then(
      (res) => {
        if (ctl.signal.aborted) return
        setResult(res)
        setFinishedAt(new Date())
        setPhase('done')
      },
      (err: unknown) => {
        if (ctl.signal.aborted) return
        setError(err instanceof ApiError ? err : new ApiError('network', String(err)))
        setPhase('failed')
      },
    )
  }, [])

  const cancel = useCallback(() => {
    ctlRef.current?.abort()
    ctlRef.current = null
    setPhase(result || finishedAt ? 'done' : 'idle')
  }, [result, finishedAt])

  useEffect(() => () => ctlRef.current?.abort(), [])

  const events: ConjunctionEvent[] = result?.events ?? []
  return { phase, events, result, error, query, finishedAt, run, cancel }
}
