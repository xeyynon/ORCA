/**
 * Horizontal swipe between items (MD/design_system_v2.md, Gesture-based UI: swipe between conjunction pairs). Pure.
 * A swipe is mostly sideways and either long enough or a quick flick. Finger moving left shows the NEXT item, as on a
 * phone's photo viewer; finger moving right shows the previous one. The Previous/Next buttons do the same.
 */

/** A deliberate sideways drag of at least this many px counts, at any speed. */
export const SWIPE_MIN_PX = 60
/** A flick needs only this distance if it is fast enough. */
export const FLICK_MIN_PX = 30
export const FLICK_PX_PER_MS = 0.4
/** Horizontal travel must exceed vertical travel by this factor, so a scroll that drifts sideways is not a swipe. */
export const AXIS_RATIO = 1.5

export type SwipeStep = -1 | 0 | 1

/** -1 previous, +1 next, 0 not a swipe. `dx`/`dy` are the finger's travel in px, `dtMs` how long it took. */
export function swipeStep(dx: number, dy: number, dtMs: number): SwipeStep {
  const ax = Math.abs(dx)
  if (ax < FLICK_MIN_PX || ax < Math.abs(dy) * AXIS_RATIO) return 0
  const fast = dtMs > 0 && ax / dtMs >= FLICK_PX_PER_MS
  if (ax < SWIPE_MIN_PX && !fast) return 0
  return dx < 0 ? 1 : -1
}

/** The item `step` away from `index`, or null at either end (no wrap-around: the ends are where the list stops). */
export function stepIndex(index: number, step: SwipeStep, count: number): number | null {
  if (step === 0 || index < 0) return null
  const next = index + step
  return next >= 0 && next < count ? next : null
}
