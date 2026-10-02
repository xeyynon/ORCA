/** Playback speeds in simulated seconds per real second. Higher would outrun the one-request-per-minute-of-sim-time refresh. */
export const SPEEDS = [1, 10, 30, 60] as const
export type Speed = (typeof SPEEDS)[number]

export const MAX_OFFSET_H = 168

/** Positions are re-requested every this many SIMULATED seconds; between requests they are extrapolated with velocity. */
export const SNAPSHOT_SIM_STEP_S = 60

/**
 * Advance the simulation clock (hours from now) by `realDtS` real seconds at `speed`. Stops at the end of the window the
 * API can propagate to, and says so, so the caller can stop playing instead of running past it.
 */
export function advance(offsetH: number, speed: number, realDtS: number): { offsetH: number; atEnd: boolean } {
  const next = offsetH + (speed * realDtS) / 3600
  return next >= MAX_OFFSET_H ? { offsetH: MAX_OFFSET_H, atEnd: true } : { offsetH: next, atEnd: false }
}

/** Real milliseconds between fresh snapshots while playing: a snapshot per SNAPSHOT_SIM_STEP_S of sim time, but not faster than the server can answer. */
export function refetchEveryMs(speed: number): number {
  return Math.min(20_000, Math.max(1_200, (SNAPSHOT_SIM_STEP_S / Math.max(1, speed)) * 1000))
}

/** Clamp a scrubbed or stepped offset into the window the API can serve. */
export function clampOffset(h: number): number {
  return Math.max(0, Math.min(MAX_OFFSET_H, h))
}

/**
 * Hours from `now` to a time of closest approach, if the API can show it: positions are available from now to now + 7 days,
 * never in the past. Returns null (with the reason the UI should state) otherwise.
 */
export function offsetForTca(tcaMs: number, nowMs: number): { offsetH: number } | { reason: 'past' | 'beyond' } {
  const h = (tcaMs - nowMs) / 3_600_000
  if (h < 0) return { reason: 'past' }
  if (h > MAX_OFFSET_H) return { reason: 'beyond' }
  return { offsetH: h }
}
