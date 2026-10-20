import { NO_DATA } from './time'

const isMissing = (v: number | null | undefined): v is null | undefined =>
  v === null || v === undefined || !Number.isFinite(v)

export function fixed(v: number | null | undefined, digits: number): string {
  return isMissing(v) ? NO_DATA : v.toFixed(digits)
}

export function integer(v: number | null | undefined): string {
  return isMissing(v) ? NO_DATA : Math.round(v).toLocaleString('en-US')
}

/** "1 day", "7 days": a count with its noun, so copy never says "day(s)". */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${integer(n)} ${n === 1 ? one : many}`
}

/** Pc spans many decades, so it is always scientific. Zero prints as 0. */
export function pc(v: number | null | undefined): string {
  const parts = pcParts(v)
  if (parts === null) return isMissing(v) ? NO_DATA : '0'
  return `${parts.mantissa} × 10^${parts.exponent}`
}

/** Pc split for display with a real superscript: 2.5e-7 -> { mantissa: '2.50', exponent: -7 }. null for zero or a missing value. */
export function pcParts(v: number | null | undefined): { mantissa: string; exponent: number } | null {
  if (isMissing(v) || v === 0) return null
  const [mantissa, exp] = v.toExponential(2).split('e')
  return { mantissa, exponent: Number(exp) }
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

/** 20.3 -> "20.3° N", -33.9 -> "33.9° S". The sign is never left to the reader to interpret. */
export function formatLat(deg: number): string {
  return Number.isFinite(deg) ? `${Math.abs(deg).toFixed(1)}° ${deg < 0 ? 'S' : 'N'}` : NO_DATA
}

/** 78.6 -> "78.6° E", -122.4 -> "122.4° W". */
export function formatLon(deg: number): string {
  return Number.isFinite(deg) ? `${Math.abs(deg).toFixed(1)}° ${deg < 0 ? 'W' : 'E'}` : NO_DATA
}
