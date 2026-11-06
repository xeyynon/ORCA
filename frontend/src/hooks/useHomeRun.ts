import { useEffect, useMemo, useState } from 'react'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { ConjunctionSearchResult } from '@/api/types'
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

/**
 * The run the home page may quote: the result on screen (live or saved) if there is one, otherwise the stored example
 * run read on its own. Reading the example here does NOT load it into the search: the Conjunctions page stays as it was.
 */
export function useHomeRun(search: ConjunctionSearch): HookRun | null {
  const [example, setExample] = useState<ConjunctionSearchResult | null>(null)
  const current = search.result

  useEffect(() => {
    if (current || example) return
    let alive = true
    loadSavedRun().then((r) => { if (alive) setExample(r) }, () => undefined)
    return () => { alive = false }
  }, [current, example])

  return useMemo(() => {
    if (current) return toHookRun(current, search.query?.horizonDays ?? SAVED_RUN_QUERY.horizonDays, search.source === 'saved')
    if (example) return toHookRun(example, SAVED_RUN_QUERY.horizonDays, true)
    return null
  }, [current, example, search.query, search.source])
}
