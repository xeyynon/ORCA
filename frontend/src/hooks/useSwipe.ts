import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { swipeStep } from '@/lib/swipe'
import type { SwipeStep } from '@/lib/swipe'

type Handlers = {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onPointerUp: (e: PointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
}

/**
 * Sideways swipe on touch, for an element styled `touch-action: pan-y` (vertical scrolling stays the browser's).
 * Mouse and pen are ignored: on those the visible Previous/Next buttons are the way (WCAG 2.5.1). A vertical scroll
 * makes the browser cancel the pointer, so it never reaches `onStep`.
 */
export function useSwipe(onStep: (step: Exclude<SwipeStep, 0>) => void): Handlers {
  const start = useRef<{ id: number; x: number; y: number; t: number } | null>(null)
  return {
    onPointerDown: (e) => {
      start.current = e.pointerType === 'touch' && e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp } : null
    },
    onPointerUp: (e) => {
      const s = start.current
      start.current = null
      if (!s || s.id !== e.pointerId) return
      const step = swipeStep(e.clientX - s.x, e.clientY - s.y, e.timeStamp - s.t)
      if (step !== 0) onStep(step)
    },
    onPointerCancel: () => { start.current = null },
  }
}
