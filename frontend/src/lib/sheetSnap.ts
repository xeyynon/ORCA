/**
 * Bottom-sheet drag and snap (MD/design_system_v2.md, Gesture-based UI). Pure: no DOM.
 *
 * The sheet has two resting places. Its position is an OFFSET in px, how far it is pushed down from fully open:
 * 0 is expanded, `max` is collapsed (only the handle shows). A drag moves the offset with the finger; on release a fast
 * flick wins by its direction, otherwise the sheet changes state only if it was dragged far enough.
 */

/** Release speed (px/ms) above which the direction of the flick decides, however short the drag. */
export const FLICK_PX_PER_MS = 0.5
/** A slow drag must cover this share of the travel to change state; shorter drags spring back. */
export const SNAP_FRACTION = 0.25
/** Movement under this (px) is a tap on the handle, not a drag. */
export const TAP_SLOP_PX = 6
/** Only the last stretch of a drag counts towards its release speed. */
export const VELOCITY_WINDOW_MS = 100

export function offsetFor(expanded: boolean, max: number): number {
  return expanded ? 0 : Math.max(0, max)
}

/** Where the sheet sits during a drag: it follows the finger and never leaves its travel. */
export function dragOffset(startOffset: number, dy: number, max: number): number {
  return Math.min(Math.max(startOffset + dy, 0), Math.max(0, max))
}

export function isDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > TAP_SLOP_PX
}

export type Sample = { t: number; y: number }

/** Vertical speed at release in px/ms (positive = downward), from the samples in the last VELOCITY_WINDOW_MS. */
export function releaseVelocity(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  let first = samples[samples.length - 2]
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break
    first = samples[i]
  }
  const dt = last.t - first.t
  return dt > 0 ? (last.y - first.y) / dt : 0
}

/** Whether the sheet ends expanded after a drag released at `offset` with `velocity` (px/ms, positive = down). */
export function settleExpanded(wasExpanded: boolean, offset: number, max: number, velocity: number): boolean {
  if (max <= 0) return wasExpanded
  if (velocity <= -FLICK_PX_PER_MS) return true
  if (velocity >= FLICK_PX_PER_MS) return false
  const moved = offset - offsetFor(wasExpanded, max) // positive = pulled down
  if (Math.abs(moved) < max * SNAP_FRACTION) return wasExpanded
  return moved < 0
}
