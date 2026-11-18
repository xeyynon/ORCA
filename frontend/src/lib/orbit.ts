import type { TleRecord } from '@/api/types'

// Same constants as orbit_mech_engine.py so the UI and engine agree.
export const MU_KM3_S2 = 398600.4418
export const EARTH_RADIUS_KM = 6371.0
export const SECONDS_PER_DAY = 86400

export type Regime = 'LEO' | 'MEO' | 'GEO' | 'HEO'
export const REGIMES: readonly Regime[] = ['LEO', 'MEO', 'GEO', 'HEO']

export interface DerivedOrbit {
  semiMajorAxisKm: number
  periodMinutes: number
  perigeeAltKm: number
  apogeeAltKm: number
  meanAltKm: number
  regime: Regime
}

/**
 * Derive size/shape from a TLE record. Units contract (ARCHITECTURE.md §7):
 * TLE mean_motion is rev/day; convert to rad/s before Kepler's third law.
 * Returns null when mean motion is not a positive finite number.
 */
export function deriveOrbit(t: Pick<TleRecord, 'mean_motion' | 'eccentricity'>): DerivedOrbit | null {
  const revPerDay = t.mean_motion
  if (!Number.isFinite(revPerDay) || revPerDay <= 0) return null
  const nRadS = (revPerDay * 2 * Math.PI) / SECONDS_PER_DAY
  const a = Math.cbrt(MU_KM3_S2 / (nRadS * nRadS))
  const e = t.eccentricity
  const perigee = a * (1 - e) - EARTH_RADIUS_KM
  const apogee = a * (1 + e) - EARTH_RADIUS_KM
  return {
    semiMajorAxisKm: a,
    periodMinutes: 1440 / revPerDay,
    perigeeAltKm: perigee,
    apogeeAltKm: apogee,
    meanAltKm: a - EARTH_RADIUS_KM,
    regime: classifyRegime(perigee, apogee, e),
  }
}

/** Height of a geostationary orbit above the surface. */
export const GEO_ALT_KM = 35786
/** A mean altitude within this many km of GEO_ALT_KM counts as GEO height (regime and altitude band alike). */
export const GEO_BAND_KM = 500
/** Below this eccentricity an orbit at GEO height is near-circular enough to call GEO. */
const GEO_MAX_E = 0.1

/**
 * The orbit regime, from the orbit's height and shape. Mirrored in Analytics.py (classify_regime); both share tests.
 * HEO: strongly stretched (e > 0.25), or at or above GEO height without being GEO. Anything higher than GEO is never MEO.
 * GEO: mean altitude within 500 km of 35,786 km and near-circular. LEO: the whole orbit below 2,000 km. MEO: the rest.
 */
export function classifyRegime(perigeeAltKm: number, apogeeAltKm: number, e: number): Regime {
  const meanAltKm = (perigeeAltKm + apogeeAltKm) / 2
  if (e > 0.25) return 'HEO'
  if (Math.abs(meanAltKm - GEO_ALT_KM) <= GEO_BAND_KM && e < GEO_MAX_E) return 'GEO'
  if (meanAltKm >= GEO_ALT_KM - GEO_BAND_KM) return 'HEO'
  if (apogeeAltKm < 2000) return 'LEO'
  return 'MEO'
}

// ---- classes used to colour charts and the globe -------------------------------------------------

export type InclinationClassId = 'equatorial' | 'low' | 'mid' | 'polar' | 'retrograde'

export interface InclinationClass { id: InclinationClassId; label: string; /** exclusive upper bound, degrees */ below: number }

/** Ordered bands. Labels name the typical occupants so the colours mean something. */
export const INCLINATION_CLASSES: readonly InclinationClass[] = [
  { id: 'equatorial', label: 'Equatorial (<10°, GEO)', below: 10 },
  { id: 'low', label: 'Low (10–45°)', below: 45 },
  { id: 'mid', label: 'Mid (45–65°, ISS, Starlink)', below: 65 },
  { id: 'polar', label: 'Polar (65–90°)', below: 90 },
  { id: 'retrograde', label: 'Retrograde (>90°, sun-synchronous)', below: Infinity },
]

export function inclinationClass(deg: number): InclinationClassId {
  for (const c of INCLINATION_CLASSES) if (deg < c.below) return c.id
  return 'retrograde'
}

export type AltitudeBand = 'LEO' | 'MEO' | 'GEO' | 'BEYOND'
export const ALTITUDE_BANDS: readonly AltitudeBand[] = ['LEO', 'MEO', 'GEO', 'BEYOND']

/**
 * Band by altitude only (it ignores eccentricity), which is all a position snapshot carries. The ids reuse the regime
 * letters for the colours, but the bands are NAMED by their range (ALTITUDE_BAND_LABEL), never "LEO" or "GEO": the
 * regime also looks at the orbit's shape, so the same name would show two different counts.
 */
export function altitudeBand(altKm: number): AltitudeBand {
  if (altKm < 2000) return 'LEO'
  if (altKm < GEO_ALT_KM - GEO_BAND_KM) return 'MEO'
  if (altKm <= GEO_ALT_KM + GEO_BAND_KM) return 'GEO'
  return 'BEYOND'
}

/** The bands by range; the numbers are the boundaries altitudeBand uses. */
export const ALTITUDE_BAND_LABEL: Record<AltitudeBand, string> = {
  LEO: 'Below 2,000 km',
  MEO: '2,000 to 35,286 km',
  GEO: '35,286 to 36,286 km',
  BEYOND: 'Above 36,286 km',
}
