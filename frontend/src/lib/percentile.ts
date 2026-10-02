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
