import type { ConjunctionEvent } from '@/api/types'
import { parseUtc } from './time'

/** A conjunction is identified by its two objects and the time of closest approach. */
export function pairKey(e: Pick<ConjunctionEvent, 'sat1_id' | 'sat2_id' | 'tca'>): string {
  return `${e.sat1_id}|${e.sat2_id}|${e.tca}`
}

/**
 * How many events have their time of closest approach already behind us. The backend starts its
 * search window at the first object's TLE epoch, not at "now" (conjunction_detection.py), so with
 * old TLEs the whole "horizon" can lie in the past. The UI must say so rather than imply a forecast.
 */
export function countPast(events: ReadonlyArray<Pick<ConjunctionEvent, 'tca'>>, now: Date): number {
  const t = now.getTime()
  return events.filter((e) => parseUtc(e.tca).getTime() < t).length
}
