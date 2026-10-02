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
