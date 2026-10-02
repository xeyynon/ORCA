import { useEffect, useState } from 'react'

/** Whole seconds since `running` became true; resets to 0 when it stops. */
export function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) { setSeconds(0); return }
    const start = Date.now()
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500)
    return () => window.clearInterval(id)
  }, [running])
  return seconds
}
