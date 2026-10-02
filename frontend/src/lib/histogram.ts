export interface Bin { x0: number; x1: number; count: number }

/**
 * Equal-width bins over [min, max] of the finite values. The top edge is inclusive so the maximum
 * lands in the last bin. Returns [] when there is nothing finite to bin (an empty chart, not NaNs).
 */
export function histogram(values: readonly number[], binCount: number): Bin[] {
  const v = values.filter((x) => Number.isFinite(x))
  if (v.length === 0 || binCount < 1) return []
  let min = v[0]
  let max = v[0]
  for (const x of v) { if (x < min) min = x; if (x > max) max = x }
  if (min === max) return [{ x0: min, x1: max, count: v.length }]
  const width = (max - min) / binCount
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({ x0: min + i * width, x1: min + (i + 1) * width, count: 0 }))
  for (const x of v) bins[Math.min(binCount - 1, Math.floor((x - min) / width))].count += 1
  return bins
}
