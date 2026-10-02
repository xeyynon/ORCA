export interface Bin { x0: number; x1: number; count: number }

export interface Binned {
  bins: Bin[]
  /** Finite values that fell outside the requested range (never silently dropped). */
  outside: number
  /** Values that cannot be placed on the axis at all (NaN, Infinity, and <= 0 on a log axis). */
  unplottable: number
}

const empty = (unplottable = 0): Binned => ({ bins: [], outside: 0, unplottable })

/**
 * Equal-width bins over [min, max]. The top edge is inclusive so the maximum lands in the last bin.
 * Values outside the range are counted in `outside`, not hidden and not clamped into an end bin.
 */
export function binLinear(values: readonly number[], opts: { min: number; max: number; binCount: number }): Binned {
  const { min, max, binCount } = opts
  if (binCount < 1 || !(max > min)) return empty()
  const width = (max - min) / binCount
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({ x0: min + i * width, x1: min + (i + 1) * width, count: 0 }))
  let outside = 0
  let unplottable = 0
  for (const x of values) {
    if (!Number.isFinite(x)) { unplottable += 1; continue }
    if (x < min || x > max) { outside += 1; continue }
    bins[Math.min(binCount - 1, Math.floor((x - min) / width))].count += 1
  }
  return { bins, outside, unplottable }
}

/**
 * Bins equal-width in log10, spanning the data. For quantities that range over orders of magnitude
 * (altitude 170 km to 240,000 km; eccentricity 1e-5 to 0.8) a linear axis puts everything in one bar.
 * Values <= 0 have no log and are reported in `unplottable` (a circular orbit has e = 0).
 */
export function binLog(values: readonly number[], binCount: number): Binned {
  const pos = values.filter((x) => Number.isFinite(x) && x > 0)
  const unplottable = values.length - pos.length
  if (pos.length === 0 || binCount < 1) return empty(unplottable)
  let lo = Math.log10(pos[0])
  let hi = lo
  for (const x of pos) { const l = Math.log10(x); if (l < lo) lo = l; if (l > hi) hi = l }
  if (lo === hi) return { bins: [{ x0: 10 ** lo, x1: 10 ** hi, count: pos.length }], outside: 0, unplottable }
  const width = (hi - lo) / binCount
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({ x0: 10 ** (lo + i * width), x1: 10 ** (lo + (i + 1) * width), count: 0 }))
  for (const x of pos) bins[Math.min(binCount - 1, Math.floor((Math.log10(x) - lo) / width))].count += 1
  return { bins, outside: 0, unplottable }
}

/** Equal-width bins spanning the data's own min and max. Returns [] when nothing finite exists. */
export function histogram(values: readonly number[], binCount: number): Bin[] {
  const v = values.filter((x) => Number.isFinite(x))
  if (v.length === 0 || binCount < 1) return []
  let min = v[0]
  let max = v[0]
  for (const x of v) { if (x < min) min = x; if (x > max) max = x }
  if (min === max) return [{ x0: min, x1: max, count: v.length }]
  return binLinear(v, { min, max, binCount }).bins
}
