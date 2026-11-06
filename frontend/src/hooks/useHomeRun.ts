import { useEffect, useMemo, useState } from 'react'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { ConjunctionEvent, ConjunctionSearchResult } from '@/api/types'
import type { ConjunctionSearch } from './useConjunctionSearch'
import type { HookRun } from '@/lib/homeHook'

function toHookRun(r: ConjunctionSearchResult, horizonDays: number, saved: boolean): HookRun {
  return {
    totalEvents: r.total_events,
    reportKm: r.report_km,
    horizonDays,
    highRisk: r.tier_counts.HIGH ?? 0,
    critical: r.tier_counts.CRITICAL ?? 0,
    windowStart: r.window_start,
    saved,
  }
}

export interface HomeRun {
  run: HookRun
  /** The run's real events (the most probable ones the API returned), for the home preview table. */
  events: readonly ConjunctionEvent[]
}

export type HomeRunState = { status: 'loading' } | { status: 'failed' } | ({ status: 'ready' } & HomeRun)

/**
 * The run the home page may quote: the result on screen (live or saved) if there is one, otherwise the stored example
 * run read on its own. Reading the example here does NOT load it into the search: the Conjunctions page stays as it was.
 */
export function useHomeRun(search: ConjunctionSearch): HomeRunState {
  const [example, setExample] = useState<ConjunctionSearchResult | null>(null)
  const [failed, setFailed] = useState(false)
  const current = search.result

  useEffect(() => {
    if (current || example) return
    let alive = true
    loadSavedRun().then((r) => { if (alive) setExample(r) }, () => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [current, example])

  return useMemo<HomeRunState>(() => {
    if (current) return { status: 'ready', run: toHookRun(current, search.query?.horizonDays ?? SAVED_RUN_QUERY.horizonDays, search.source === 'saved'), events: current.events }
    if (example) return { status: 'ready', run: toHookRun(example, SAVED_RUN_QUERY.horizonDays, true), events: example.events }
    return failed ? { status: 'failed' } : { status: 'loading' }
  }, [current, example, failed, search.query, search.source])
}
