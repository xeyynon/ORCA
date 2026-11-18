import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { getHealth, postUpdateTles } from '@/api/endpoints'
import { UPDATE_GIVE_UP_MS, UPDATE_POLL_MS } from '@/lib/updatePolicy'

export type UpdatePhase = 'idle' | 'starting' | 'waiting' | 'changed' | 'unchanged' | 'refused' | 'failed'

/**
 * POST /api/update-tles returns immediately ("update started"); ingestion continues in a server
 * background task with no completion event. So: start it, then poll /health for the count or
 * last_update to move. The API also records the outcome of each CelesTrak fetch (health.last_fetch), so a
 * refused or failed fetch is reported as such ("refused"). "unchanged" is left for when nothing at all moved.
 */
export function useCatalogUpdate() {
  const [phase, setPhase] = useState<UpdatePhase>('idle')
  const [before, setBefore] = useState<number | null>(null)
  const [after, setAfter] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const alive = useRef(true)

  useEffect(() => () => { alive.current = false; if (timer.current) window.clearTimeout(timer.current) }, [])

  const start = useCallback(async () => {
    setPhase('starting'); setError(null); setAfter(null)
    try {
      const h0 = await getHealth()
      setBefore(h0.database.tles_count)
      await postUpdateTles()
      const startedAt = Date.now()
      setPhase('waiting')
      const poll = async () => {
        if (!alive.current) return
        try {
          const h = await getHealth()
          const fetch = h.database.last_fetch
          if (fetch && fetch.status !== 'ok' && fetch.at !== h0.database.last_fetch?.at) { setError(fetch.detail); setAfter(h.database.tles_count); setPhase('refused'); return }
          const moved = h.database.tles_count !== h0.database.tles_count || h.database.last_update !== h0.database.last_update
          if (moved) { setAfter(h.database.tles_count); setPhase('changed'); return }
        } catch { /* a missed poll is not a verdict; keep waiting until the deadline */ }
        if (Date.now() - startedAt > UPDATE_GIVE_UP_MS) { setAfter(h0.database.tles_count); setPhase('unchanged'); return }
        timer.current = window.setTimeout(poll, UPDATE_POLL_MS)
      }
      timer.current = window.setTimeout(poll, UPDATE_POLL_MS)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
      setPhase('failed')
    }
  }, [])

  return { phase, before, after, error, start }
}
