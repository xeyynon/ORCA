import { useEffect, useState } from 'react'

const whole = (since: number) => Math.max(0, Math.floor((Date.now() - since) / 1000))

/**
 * Whole seconds since `running` became true; resets to 0 when it stops. Pass `since` (epoch ms) when the job
 * started somewhere that outlives this component, so a remount shows the true elapsed time, not zero.
 */
export function useElapsed(running: boolean, since: number | null = null): number {
  const [seconds, setSeconds] = useState(() => (running && since !== null ? whole(since) : 0))
  useEffect(() => {
    if (!running) { setSeconds(0); return }
    const start = since ?? Date.now()
    setSeconds(whole(start))
    const id = window.setInterval(() => setSeconds(whole(start)), 500)
    return () => window.clearInterval(id)
  }, [running, since])
  return seconds
}
