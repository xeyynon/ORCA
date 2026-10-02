import { NO_DATA } from './time'

const isMissing = (v: number | null | undefined): v is null | undefined =>
  v === null || v === undefined || !Number.isFinite(v)

export function fixed(v: number | null | undefined, digits: number): string {
  return isMissing(v) ? NO_DATA : v.toFixed(digits)
}

export function integer(v: number | null | undefined): string {
  return isMissing(v) ? NO_DATA : Math.round(v).toLocaleString('en-US')
}

/** Pc spans many decades, so it is always scientific. Zero prints as 0. */
export function pc(v: number | null | undefined): string {
  if (isMissing(v)) return NO_DATA
  if (v === 0) return '0'
  const [mant, exp] = v.toExponential(2).split('e')
  return `${mant} × 10^${Number(exp)}`
}

/**
 * Short axis-tick number: 173 -> "173", 35786 -> "35.8k", 240000 -> "240k", 0.0042 -> "4.2e-3".
 * Used on chart axes where width is scarce; exact values stay in the hover text.
 */
export function compact(v: number): string {
  if (!Number.isFinite(v)) return NO_DATA
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a < 0.01) return v.toExponential(1).replace('e-', 'e-').replace('e+', 'e')
  if (a < 10) return v.toFixed(a < 1 ? 2 : 1).replace(/\.?0+$/, '')
  if (a < 1000) return String(Math.round(v))
  if (a < 100000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(v / 1000)}k`
}

/** Compact days: 45.6 -> "45.6 d". */
export function days(v: number): string {
  return `${v.toFixed(1)} d`
}
