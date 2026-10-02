export interface GridSpec {
  xMin: number; xMax: number; xBins: number
  yMin: number; yMax: number; yBins: number
  /** Bin the y axis in log10 (altitude spans orders of magnitude). yMin must be > 0 then. */
  yLog?: boolean
}

export interface Grid {
  /** cells[row][col], row 0 = lowest y bin. */
  cells: number[][]
  max: number
  total: number
  /** Finite points that fell outside the grid (stated by the chart, never dropped quietly). */
  outside: number
  /** Points that could not be placed (NaN/Infinity, or <= 0 on a log axis). */
  unplottable: number
}

/** 2D density: counts of points per (x, y) cell. This is what a heatmap shows when a scatter would overplot. */
export function binGrid(points: ReadonlyArray<{ x: number; y: number }>, spec: GridSpec): Grid {
  const { xMin, xMax, xBins, yMin, yMax, yBins, yLog = false } = spec
  const cells = Array.from({ length: yBins }, () => new Array<number>(xBins).fill(0))
  const yLo = yLog ? Math.log10(yMin) : yMin
  const yHi = yLog ? Math.log10(yMax) : yMax
  let outside = 0
  let unplottable = 0
  let max = 0
  let total = 0
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || (yLog && p.y <= 0)) { unplottable += 1; continue }
    const yv = yLog ? Math.log10(p.y) : p.y
    if (p.x < xMin || p.x > xMax || yv < yLo || yv > yHi) { outside += 1; continue }
    const c = Math.min(xBins - 1, Math.floor(((p.x - xMin) / (xMax - xMin)) * xBins))
    const r = Math.min(yBins - 1, Math.floor(((yv - yLo) / (yHi - yLo)) * yBins))
    const n = ++cells[r][c]
    total += 1
    if (n > max) max = n
  }
  return { cells, max, total, outside, unplottable }
}

/** Lower edge of y bin `row`, back in data units. */
export function yEdge(spec: GridSpec, row: number): number {
  const frac = row / spec.yBins
  if (!spec.yLog) return spec.yMin + frac * (spec.yMax - spec.yMin)
  const lo = Math.log10(spec.yMin)
  const hi = Math.log10(spec.yMax)
  return 10 ** (lo + frac * (hi - lo))
}
