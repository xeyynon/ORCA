export type TleAgeTone = 'ok' | 'warn' | 'bad'

/** TLE accuracy degrades with age. Bands are indicative, not a published standard. */
export function tleAgeTone(ageDays: number): TleAgeTone {
  if (ageDays < 7) return 'ok'
  if (ageDays < 30) return 'warn'
  return 'bad'
}
