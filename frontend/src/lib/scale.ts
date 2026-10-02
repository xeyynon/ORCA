/** Maps a value in [d0, d1] to [r0, r1]. A degenerate domain maps to the middle of the range, never NaN. */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  if (d1 === d0) return () => (r0 + r1) / 2
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)
}

/** Same as linearScale but on log10 of the value. Inputs must be > 0 (callers filter; the scale does not clamp). */
export function logScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const f = linearScale(Math.log10(d0), Math.log10(d1), r0, r1)
  return (v) => f(Math.log10(v))
}

/** 10^k exactly as the literal would read: 1/10^n is correctly rounded, whereas 10 ** -n can differ in the last bit. */
const pow10 = (k: number): number => (k >= 0 ? 10 ** k : 1 / 10 ** -k)

/** Round powers of ten that fall inside [lo, hi]: the natural gridlines of a log axis. */
export function decadeTicks(lo: number, hi: number): number[] {
  if (!(lo > 0) || !(hi >= lo)) return []
  const out: number[] = []
  for (let k = Math.ceil(Math.log10(lo) - 1e-9); pow10(k) <= hi * (1 + 1e-9); k++) out.push(pow10(k))
  return out
}
