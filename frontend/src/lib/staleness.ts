/** A median element-set age above this makes a forecast unreliable enough to say so once, loudly (days). */
export const STALE_MEDIAN_DAYS = 7

export interface StaleNotice { title: string; body: string }

/**
 * One notice for the whole catalog instead of an amber chip on every row. Null when the data is fresh enough or its
 * age is unknown: nothing is claimed that the data does not support.
 */
export function staleNotice(medianAgeDays: number | null, oldestAgeDays: number | null): StaleNotice | null {
  if (medianAgeDays === null || medianAgeDays <= STALE_MEDIAN_DAYS) return null
  const med = Math.round(medianAgeDays)
  const oldest = oldestAgeDays === null ? '' : `The oldest is ${Math.round(oldestAgeDays)} days. `
  return {
    title: `Element sets are a median ${med} days old`,
    body: `${oldest}Accuracy falls quickly with age, so treat every figure as indicative.`,
  }
}

/**
 * Which week of age the catalog is in (0 = under 7 days). A dismissed notice stays dismissed until this number changes,
 * so it comes back when the data has aged another week, not on every poll and not never. Null when the age is unknown.
 */
export function staleBand(medianAgeDays: number | null): number | null {
  return medianAgeDays === null || !Number.isFinite(medianAgeDays) ? null : Math.floor(medianAgeDays / 7)
}
