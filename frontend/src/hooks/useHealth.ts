import { useEffect, useState } from 'react'
import { getHealth } from '@/api/endpoints'
import type { Health } from '@/api/types'

export type ApiStatus = 'checking' | 'online' | 'offline'

/**
 * Poll /health. Polling is silent about individual blips but the RESULT is surfaced in the
 * status bar: a dashboard that fails silently looks merely empty (TARANG §6.5).
 */
export function useHealth(intervalMs = 15_000) {
  const [status, setStatus] = useState<ApiStatus>('checking')
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    const tick = () => {
      getHealth({ signal: ctl.signal }).then(
        (h) => { if (alive) { setHealth(h); setStatus('online') } },
        () => { if (alive && !ctl.signal.aborted) setStatus('offline') },
      )
    }
    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => { alive = false; ctl.abort(); window.clearInterval(id) }
  }, [intervalMs])

  return { status, health }
}
