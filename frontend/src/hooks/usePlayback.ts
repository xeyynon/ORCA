import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_OFFSET_H, advance, clampOffset, refetchEveryMs } from '@/lib/playback'
import type { Speed } from '@/lib/playback'

const TICK_MS = 250
const SCRUB_DEBOUNCE_MS = 250

/**
 * The globe's clock. `offsetH` is the simulated time, hours from now, and moves every tick while playing. `snapOffset` is
 * the offset the DISPLAYED snapshot was computed for, and changes far less often: at the playback cadence while playing
 * (a fresh snapshot per sim minute, extrapolated in between), and after a short pause when the person scrubs, so dragging
 * the slider does not fire a propagation request per pixel.
 */
export function usePlayback() {
  const [offsetH, setOffsetH] = useState(0)
  const [snapOffset, setSnapOffset] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(10)
  const offsetRef = useRef(0)
  offsetRef.current = offsetH

  // the simulated clock
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const r = advance(offsetRef.current, speed, TICK_MS / 1000)
      setOffsetH(r.offsetH)
      if (r.atEnd) setPlaying(false) // stop at the end of the window the API can serve
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, speed])

  // while playing: a new snapshot at the cadence for this speed
  useEffect(() => {
    if (!playing) return
    setSnapOffset(offsetRef.current)
    const id = window.setInterval(() => setSnapOffset(offsetRef.current), refetchEveryMs(speed))
    return () => window.clearInterval(id)
  }, [playing, speed])

  // while paused: follow the clock after a short pause
  useEffect(() => {
    if (playing) return
    const id = window.setTimeout(() => setSnapOffset(offsetH), SCRUB_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [playing, offsetH])

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && offsetRef.current >= MAX_OFFSET_H) { setOffsetH(0); offsetRef.current = 0 } // replay from the start
      return !p
    })
  }, [])
  const scrub = useCallback((h: number) => setOffsetH(clampOffset(h)), [])
  const step = useCallback((deltaH: number) => setOffsetH((h) => clampOffset(h + deltaH)), [])
  const jumpTo = useCallback((h: number) => { setPlaying(false); setOffsetH(clampOffset(h)) }, [])
  const toLive = useCallback(() => { setPlaying(false); setOffsetH(0) }, [])

  return { offsetH, snapOffset, playing, speed, setSpeed, toggle, scrub, step, jumpTo, toLive }
}
