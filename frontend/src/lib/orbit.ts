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
