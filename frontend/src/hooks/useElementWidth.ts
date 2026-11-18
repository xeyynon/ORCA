import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * The rendered width of an element in CSS pixels, kept current as it changes (a ResizeObserver); 0 until measured.
 * A chart sizes its drawing from it, so its text is drawn at its real pixel size instead of being scaled down to fit
 * a phone (audit 2026-11-18 #14: heatmap labels were about 7 px).
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width))
    ro.observe(el)
    setW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [ref])
  return w
}
