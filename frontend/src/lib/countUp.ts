/** Ease-out cubic: quick start, gentle landing. `t` is clamped to [0, 1], so the curve never overshoots. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1))
  return 1 - (1 - c) ** 3
}

/**
 * The figure on screen `elapsedMs` into a count-up to `target` that lasts `durationMs`. Whole numbers only, it never
 * passes the target, and it lands exactly on it at the end (or at once when the duration is zero), so the last frame is
 * always the real value.
 */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (!Number.isFinite(target)) return target
  if (!(durationMs > 0) || !(elapsedMs < durationMs)) return target
  if (!(elapsedMs > 0)) return 0
  const v = Math.round(target * easeOutCubic(elapsedMs / durationMs))
  return target >= 0 ? Math.min(v, target) : Math.max(v, target)
}
