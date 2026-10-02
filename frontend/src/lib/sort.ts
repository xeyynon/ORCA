/** Stable sort by a key function; returns a new array. Numbers and strings both supported. */
export function sortBy<T>(rows: readonly T[], key: (row: T) => number | string, dir: 'asc' | 'desc'): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return rows
    .map((row, i) => ({ row, i, k: key(row) }))
    .sort((a, b) => {
      const c = typeof a.k === 'number' && typeof b.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k))
      return c !== 0 ? sign * c : a.i - b.i
    })
    .map((x) => x.row)
}
