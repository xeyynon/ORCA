import { NO_DATA } from './time'

const isMissing = (v: number | null | undefined): v is null | undefined =>
  v === null || v === undefined || !Number.isFinite(v)

export function fixed(v: number | null | undefined, digits: number): string {
  return isMissing(v) ? NO_DATA : v.toFixed(digits)
}

export function integer(v: number | null | undefined): string {
  return isMissing(v) ? NO_DATA : Math.round(v).toLocaleString('en-US')
}

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

/** "10⁻⁵": a power of ten with a real superscript exponent and a true minus, readable as plain text everywhere. */
export function powerOfTen(exp: number): string {
  return `10${String(exp).split('').map((c) => SUPERSCRIPT[c] ?? c).join('')}`
}

/**
 * Pc spans many decades, so it is always scientific, written one way everywhere: "2.83 × 10⁻⁵" (audit 2026-11-15 #5;
 * it used to be "10^-5" in tables, a superscript in the report and "1e-4" in the method). Zero prints as 0.
 */
export function pc(v: number | null | undefined): string {
  if (isMissing(v)) return NO_DATA
  if (v === 0) return '0'
  const [mant, exp] = v.toExponential(2).split('e')
  return `${mant} × ${powerOfTen(Number(exp))}`
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

/** "1 object", "108 objects": a count with its noun agreed, never "object(s)" (audit 2026-11-15). */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${integer(n)} ${n === 1 ? one : many}`
}
