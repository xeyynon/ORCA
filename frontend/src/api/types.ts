// Shapes copied from REAL responses of api_server.py (not from its docstrings).
// Timestamps are naive-UTC ISO strings with no zone suffix: always go through
// lib/time.parseUtc. Field suffixes carry units (rules.md §3).

export interface Health {
  status: string
  timestamp: string
  database: { tles_count: number; last_update: string | null }
}

export interface TleRecord {
  norad_cat_id: string
  object_name: string
  epoch: string
  inclination: number // degrees (TLE units, NOT radians)
  raan: number // degrees
  eccentricity: number
  arg_of_perigee: number // degrees
  mean_anomaly: number // degrees
  mean_motion: number // revolutions / day
}

export interface Range4 { min: number; max: number; mean: number; median: number }
export interface Range3 { min: number; max: number; mean: number }

export interface CatalogStatistics {
  total_objects: number
  apogee: Range4 // km altitude
  perigee: Range4 // km altitude
  period_hours: Range3
  inclination: Range3 // degrees
}

/** `statistics` is an empty object when the catalog is empty. */
export interface StatisticsResponse {
  computed_at: string
  statistics: Partial<CatalogStatistics>
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE'

export interface ConjunctionEvent {
  sat1_id: string
  sat1_name: string
  sat2_id: string
  sat2_name: string
  tca: string
  min_distance_km: number
  probability_of_collision: number
  risk_level: RiskLevel
}

/** /api/conjunction-pair returns the full event, or {status:'no_risk'}. */
export interface PairAssessmentEvent extends ConjunctionEvent {
  mahalanobis_distance: number
  combined_hbr_km: number
}
export interface PairNoRisk { status: 'no_risk'; message: string }
export type PairAssessment = PairAssessmentEvent | PairNoRisk

export interface PositionedObject {
  id: string
  name: string
  r: [number, number, number] // km, ECI
  v: [number, number, number] // km/s, ECI
  lat: number // degrees
  lon: number // degrees
  alt_km: number
  tle_age_days: number
}

export interface PositionsResponse {
  at: string
  gmst_rad: number
  propagator: string
  skipped: number
  objects: PositionedObject[]
}

export interface OrbitPathResponse {
  id: string
  name: string
  at: string
  period_s: number
  propagator: string
  path: [number, number, number][] // km, ECI, one period, closed loop
}

export interface UpdateTlesResponse { status: string; message: string }
