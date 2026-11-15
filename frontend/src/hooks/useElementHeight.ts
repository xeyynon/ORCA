import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * The rendered height of an element, kept current as it changes (a ResizeObserver). Used where one floating block must
 * leave room for another whose height varies, e.g. the Globe's details panel above the drawing line and playback bar.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [h, setH] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height))
    ro.observe(el)
    setH(el.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [ref])
  return h
}
