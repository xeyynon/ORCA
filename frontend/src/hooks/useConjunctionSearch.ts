import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { getConjunctions } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import type { ConjunctionEvent, ConjunctionSearchResult } from '@/api/types'
import { parseUtc } from '@/lib/time'

export type SearchPhase = 'idle' | 'running' | 'done' | 'failed'
/** Where the result on screen came from. A saved run is a stored example and must always be labelled as one. */
export type ResultSource = 'live' | 'saved'

export type ConjunctionSearch = ReturnType<typeof useConjunctionSearch>

/**
 * A conjunction search is a long, blocking request. This models it as a job:
 * running (cancellable) -> done | failed. A completed search with zero events is `done`
 * with an empty list: a RESULT, never an error (rules.md §2.4).
 *
 * Call this from `Workspace`, not from the Conjunctions view: a search takes minutes, and a view that owns it would
 * abort it (and drop the results) the moment the user looks at the globe. It is aborted only when the workspace
 * itself unmounts (sign-out).
 */
export function useConjunctionSearch() {
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [result, setResult] = useState<ConjunctionSearchResult | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [query, setQuery] = useState<ConjunctionQuery | null>(null)
  const [finishedAt, setFinishedAt] = useState<Date | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  // Tied to `result`, not to the running job: cancelling a fresh search must not relabel the saved result still on screen.
  const [source, setSource] = useState<ResultSource>('live')
  const ctlRef = useRef<AbortController | null>(null)

  const run = useCallback((q: ConjunctionQuery) => {
    ctlRef.current?.abort()
    const ctl = new AbortController()
    ctlRef.current = ctl
    setPhase('running')
    setStartedAt(Date.now())
    setError(null)
    // `query` stays the query of the result on screen: it changes only when a result arrives, so cancelling this run
    // cannot leave an old result under a new horizon.
    getConjunctions(q, { signal: ctl.signal }).then(
      (res) => {
        if (ctl.signal.aborted) return
        if (ctlRef.current === ctl) ctlRef.current = null
        setResult(res)
        setQuery(q)
        setSource('live')
        setFinishedAt(new Date())
        setPhase('done')
      },
      (err: unknown) => {
        if (ctl.signal.aborted) return
        if (ctlRef.current === ctl) ctlRef.current = null
        setError(err instanceof ApiError ? err : new ApiError('network', String(err)))
        setPhase('failed')
      },
    )
  }, [])

  /**
   * Show a stored example run. It replaces any result on screen and is flagged `saved` until a real search finishes.
   * Returns false, and does nothing, while a real search is running: an example must never cancel real work.
   */
  const loadSaved = useCallback((res: ConjunctionSearchResult, query: ConjunctionQuery): boolean => {
    if (ctlRef.current) return false
    setResult(res)
    setSource('saved')
    setQuery(query)
    setError(null)
    setFinishedAt(new Date(parseUtc(res.window_start).getTime() + res.runtime_s * 1000))
    setPhase('done')
    return true
  }, [])

  const cancel = useCallback(() => {
    ctlRef.current?.abort()
    ctlRef.current = null
    setPhase(result || finishedAt ? 'done' : 'idle')
  }, [result, finishedAt])

  useEffect(() => () => ctlRef.current?.abort(), [])

  const events: ConjunctionEvent[] = result?.events ?? []
  return { phase, events, result, error, query, finishedAt, startedAt, source, run, loadSaved, cancel }
}
