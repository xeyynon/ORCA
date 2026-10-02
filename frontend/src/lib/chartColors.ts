import type { ObjectType } from '@/api/types'
import type { AltitudeBand, InclinationClassId, Regime } from './orbit'
import type { TleAgeTone } from './tleAge'

/**
 * Chart colours as CSS token references (never literals: rules.md §4). Categorical colours (--cat-*)
 * are independent of the risk and status colours, and every category is also named in a legend, so
 * colour is never the only carrier of identity.
 */
export const REGIME_COLOR: Record<Regime, string> = {
  LEO: 'var(--cat-1)',
  MEO: 'var(--cat-2)',
  GEO: 'var(--cat-3)',
  HEO: 'var(--cat-4)',
}

export const ALTITUDE_BAND_COLOR: Record<AltitudeBand, string> = {
  LEO: 'var(--cat-1)',
  MEO: 'var(--cat-2)',
  GEO: 'var(--cat-3)',
  BEYOND: 'var(--cat-4)',
}

export const OBJECT_TYPE_COLOR: Record<ObjectType, string> = {
  payload: 'var(--cat-1)',
  rocket_body: 'var(--cat-5)',
  debris: 'var(--cat-3)',
}

export const INCLINATION_COLOR: Record<InclinationClassId, string> = {
  equatorial: 'var(--cat-3)',
  low: 'var(--cat-1)',
  mid: 'var(--cat-2)',
  polar: 'var(--cat-4)',
  retrograde: 'var(--cat-5)',
}

/** Freshness uses the same status colours as the TLE age chip, so "green = fresh" means one thing everywhere. */
export const AGE_TONE_COLOR: Record<TleAgeTone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
}

/** Rotating categorical colour for an unbounded list (constellations): cat-1..cat-5, repeating. */
export function catColor(i: number): string {
  return `var(--cat-${(i % 5) + 1})`
}
