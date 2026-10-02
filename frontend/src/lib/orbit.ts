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

/** Conventional altitude bands. HEO = markedly eccentric; GEO = near-circular at ~35,786 km. */
export function classifyRegime(perigeeAltKm: number, apogeeAltKm: number, e: number): Regime {
  if (e > 0.25) return 'HEO'
  if (perigeeAltKm >= 35786 - 400 && apogeeAltKm <= 35786 + 400) return 'GEO'
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
const GEO_ALT_KM = 35786

/**
 * Band by CURRENT altitude only (it ignores eccentricity), which is all a position snapshot carries.
 * The catalog tables classify by perigee/apogee instead; the globe legend says "by current altitude".
 */
export function altitudeBand(altKm: number): AltitudeBand {
  if (altKm < 2000) return 'LEO'
  if (altKm < GEO_ALT_KM - 500) return 'MEO'
  if (altKm <= GEO_ALT_KM + 500) return 'GEO'
  return 'BEYOND'
}

export const ALTITUDE_BAND_LABEL: Record<AltitudeBand, string> = {
  LEO: 'LEO (<2,000 km)',
  MEO: 'MEO (2,000–35,300 km)',
  GEO: 'GEO (≈35,786 km)',
  BEYOND: 'Beyond GEO',
}
