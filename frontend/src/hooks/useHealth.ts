import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth } from '@/api/endpoints'
import type { Health } from '@/api/types'

export type ApiStatus = 'checking' | 'online' | 'offline'

/** What the API health page shows beyond the response itself: measured in this browser, not reported by the server. */
export type HealthCheck = {
  /** When the last check finished, success or failure; null before the first one. */
  checkedAt: Date | null
  /** Round trip of the last successful check, in ms (includes the dev proxy when there is one). */
  latencyMs: number | null
  /** Why the last check failed; null after a success. */
  error: string | null
  intervalMs: number
}

/**
 * Poll /health. Polling is silent about individual blips but the RESULT is surfaced in the
 * status bar: a dashboard that fails silently looks merely empty (TARANG §6.5).
 */
export function useHealth(intervalMs = 15_000) {
  const [status, setStatus] = useState<ApiStatus>('checking')
  const [health, setHealth] = useState<Health | null>(null)
  const [check, setCheck] = useState<HealthCheck>({ checkedAt: null, latencyMs: null, error: null, intervalMs })
  const tickRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    const tick = () => {
      const t0 = performance.now()
      getHealth({ signal: ctl.signal }).then(
        (h) => {
          if (!alive) return
          setHealth(h)
          setStatus('online')
          setCheck({ checkedAt: new Date(), latencyMs: Math.round(performance.now() - t0), error: null, intervalMs })
        },
        (e: unknown) => {
          if (!alive || ctl.signal.aborted) return
          setStatus('offline')
          setCheck((c) => ({ ...c, checkedAt: new Date(), error: e instanceof Error ? e.message : String(e) }))
        },
      )
    }
    tickRef.current = tick
    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => { alive = false; ctl.abort(); window.clearInterval(id) }
  }, [intervalMs])

  /** Check now, outside the polling rhythm (the health page's button). */
  const recheck = useCallback(() => tickRef.current(), [])

  return { status, health, check, recheck }
}
