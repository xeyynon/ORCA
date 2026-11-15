/**
 * Where `value` falls within an ascending-sorted list, as a percentage 0-100: the share of values below it, with ties
 * counting half. An empty list has no answer (null), never an invented 50.
 */
export function percentileRank(sortedAsc: readonly number[], value: number): number | null {
  const n = sortedAsc.length
  if (n === 0 || !Number.isFinite(value)) return null
  let lo = 0, hi = n
  while (lo < hi) { const m = (lo + hi) >> 1; if (sortedAsc[m] < value) lo = m + 1; else hi = m }
  const below = lo
  hi = n
  while (lo < hi) { const m = (lo + hi) >> 1; if (sortedAsc[m] <= value) lo = m + 1; else hi = m }
  return ((below + (lo - below) / 2) / n) * 100
}

/**
 * A percentile rank in words, so the comparison never depends on reading a marker's position (owner, 2026-11-15: the
 * markers looked like sliders). Rounds to whole percent and never claims "100%" or "0%" for a single object.
 */
export function rankWords(percent: number | null, among: string): string | null {
  if (percent === null || !Number.isFinite(percent)) return null
  if (percent >= 50) {
    const p = Math.round(percent)
    return p >= 100 ? `Higher than nearly all ${among}` : `Higher than ${p}% of ${among}`
  }
  const p = Math.round(100 - percent)
  return p >= 100 ? `Lower than nearly all ${among}` : `Lower than ${p}% of ${among}`
}
