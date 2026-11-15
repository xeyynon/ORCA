/** One page of a list, for tables that show a page at a time (declutter plan 2026-11-15, step 0). */
export type Page<T> = {
  rows: readonly T[]
  /** 0-based page actually shown: clamped, so a filter that shortens the list never leaves an empty page. */
  page: number
  pages: number
  /** 1-based positions of the first and last row shown; 0 and 0 for an empty list. */
  from: number
  to: number
  total: number
}

export function pageOf<T>(rows: readonly T[], page: number, size: number): Page<T> {
  const total = rows.length
  const per = Math.max(1, Math.floor(size))
  const pages = Math.max(1, Math.ceil(total / per))
  const p = Math.min(Math.max(0, Math.floor(Number.isFinite(page) ? page : 0)), pages - 1)
  const start = p * per
  const shown = rows.slice(start, start + per)
  return { rows: shown, page: p, pages, from: shown.length ? start + 1 : 0, to: start + shown.length, total }
}

/** The page holding the row at `index` (0-based), or null when the index is outside the list. */
export function pageContaining(index: number, size: number): number | null {
  if (!Number.isInteger(index) || index < 0) return null
  return Math.floor(index / Math.max(1, Math.floor(size)))
}
