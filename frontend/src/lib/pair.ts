import type { ConjunctionEvent } from '@/api/types'
import { parseUtc } from './time'

/** A conjunction is identified by its two objects and the time of closest approach. */
export function pairKey(e: Pick<ConjunctionEvent, 'sat1_id' | 'sat2_id' | 'tca'>): string {
  return `${e.sat1_id}|${e.sat2_id}|${e.tca}`
}

/**
 * How many events have their time of closest approach already behind us. The search starts at "now",
 * but each TCA is refined within +-6 h of its step, so a few can land slightly before now (and an
 * older API that started from the TLE epoch would put them all in the past). The UI must flag these
 * rather than imply a forecast.
 */
export function countPast(events: ReadonlyArray<Pick<ConjunctionEvent, 'tca'>>, now: Date): number {
  const t = now.getTime()
  return events.filter((e) => parseUtc(e.tca).getTime() < t).length
}
