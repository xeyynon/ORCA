export type TleAgeTone = 'ok' | 'warn' | 'bad'

/**
 * TLE accuracy degrades with age. Bands are indicative, not a published standard.
 * A NEGATIVE age means the epoch is ahead of this computer's clock (the data source can publish
 * such epochs, or the clock is behind): that is odd rather than fresh, so it is flagged, not green.
 */
export function tleAgeTone(ageDays: number): TleAgeTone {
  if (ageDays < 0) return 'warn'
  if (ageDays < 7) return 'ok'
  if (ageDays < 30) return 'warn'
  return 'bad'
}

/**
 * When every element set falls in one age band, the histogram is a single bar and says nothing a sentence would not:
 * say it in words ("All 15,970 element sets are over 30 days old."). Null when the ages are spread over bands.
 */
export function ageVerdict(counts: Record<TleAgeTone, number>, total: number): string | null {
  if (!(total > 0)) return null
  const n = total.toLocaleString('en-US')
  if (counts.bad === total) return `All ${n} sets of orbit data are more than 30 days old.`
  if (counts.ok === total) return `All ${n} sets of orbit data are less than 7 days old.`
  if (counts.warn === total) return `All ${n} sets of orbit data are between 7 and 30 days old, or dated later than this computer’s clock.`
  return null
}
