import { useEffect, useState } from 'react'

/** A Date that refreshes on an interval, so "age" readouts do not freeze on a long-lived tab. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
