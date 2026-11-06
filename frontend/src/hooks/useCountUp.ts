import { useEffect, useRef, useState } from 'react'
import { countUpValue } from '@/lib/countUp'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * A number that counts up to `target` once, the first time it is known (a microinteraction: it carries nothing the
 * final text does not). Off under prefers-reduced-motion. Null while the target is unknown, so the caller shows a
 * skeleton, never a 0. Later changes of the target are shown at once.
 */
export function useCountUp(target: number | null, durationMs = 900): number | null {
  const [shown, setShown] = useState<number | null>(() => (target !== null && !reducedMotion() ? 0 : target))
  const played = useRef(false)

  useEffect(() => {
    if (target === null) { setShown(null); return }
    if (played.current || reducedMotion()) { setShown(target); return }
    played.current = true
    let raf = 0
    let finished = false
    const start = performance.now()
    const tick = (t: number) => {
      const elapsed = t - start
      setShown(countUpValue(target, elapsed, durationMs))
      if (elapsed < durationMs) raf = requestAnimationFrame(tick)
      else finished = true
    }
    setShown(0)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      // StrictMode (and a target that changes mid-count) cancel the first run: let the next one play it.
      if (!finished) played.current = false
      setShown(target)
    }
  }, [target, durationMs])

  return shown
}
