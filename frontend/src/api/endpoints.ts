import { apiFetch } from './client'
import type {
  ConjunctionEvent, Health, OrbitPathResponse, PairAssessment,
  PositionsResponse, StatisticsResponse, TleRecord, UpdateTlesResponse,
} from './types'

type Opt = { signal?: AbortSignal }

export const getHealth = (o: Opt = {}) => apiFetch<Health>('/health', o)

export const getTles = (limit: number, o: Opt = {}) =>
  apiFetch<TleRecord[]>(`/api/tles?limit=${limit}`, o)

export const getStatistics = (o: Opt = {}) => apiFetch<StatisticsResponse>('/api/statistics', o)

export const getPositions = (limit: number, hoursOffset: number, o: Opt = {}) =>
  apiFetch<PositionsResponse>(`/api/positions?limit=${limit}&hours_offset=${hoursOffset}`, o)

export const getOrbitPath = (id: string, hoursOffset: number, o: Opt = {}) =>
  apiFetch<OrbitPathResponse>(`/api/orbit-path/${encodeURIComponent(id)}?hours_offset=${hoursOffset}`, o)

export interface ConjunctionQuery { horizonDays: number; stepHours: number; limit: number }
export const getConjunctions = (q: ConjunctionQuery, o: Opt = {}) =>
  apiFetch<ConjunctionEvent[]>(
    `/api/conjunctions?time_horizon_days=${q.horizonDays}&search_step_hours=${q.stepHours}&limit=${q.limit}`, o)

export const getPairAssessment = (a: string, b: string, o: Opt = {}) =>
  apiFetch<PairAssessment>(`/api/conjunction-pair/${encodeURIComponent(a)}/${encodeURIComponent(b)}`, o)

export const postUpdateTles = (o: Opt = {}) =>
  apiFetch<UpdateTlesResponse>('/api/update-tles', { method: 'POST', ...o })
