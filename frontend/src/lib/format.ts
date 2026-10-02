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

/** Compact days: 45.6 -> "45.6 d". */
export function days(v: number): string {
  return `${v.toFixed(1)} d`
}
