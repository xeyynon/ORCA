import { useCallback, useSyncExternalStore } from 'react'
import { widthBand } from '@/lib/tableColumns'

/**
 * The window width rounded down to the nearest of these breakpoints (0 below the smallest), kept current as the window
 * is resized. Only a change of band re-renders, not every pixel. Without a window everything counts as wide.
 */
export function useWidthBand(breakpoints: readonly number[]): number {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])
  return useSyncExternalStore(subscribe, () => widthBand(window.innerWidth, breakpoints), () => Number.POSITIVE_INFINITY)
}
