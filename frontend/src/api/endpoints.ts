import { apiFetch } from './client'
import type {
  CatalogColumns, CatalogSummaryResponse, ConjunctionMethod, ConjunctionSearchResult, Health, OrbitPathResponse, PairAssessment,
  PositionsResponse, StatisticsResponse, TleRecord, UpdateTlesResponse,
} from './types'

type Opt = { signal?: AbortSignal }

export const getHealth = (o: Opt = {}) => apiFetch<Health>('/health', o)

export const getTles = (limit: number, o: Opt = {}) =>
  apiFetch<TleRecord[]>(`/api/tles?limit=${limit}`, o)

/** Counts over the WHOLE stored catalog (the browser only holds the first 5,000 objects). */
export const getCatalogSummary = (o: Opt = {}) => apiFetch<CatalogSummaryResponse>('/api/catalog-summary', o)

/** Per-object columns for the WHOLE stored catalog (about 230 KB gzipped), for the Analytics charts. */
export const getCatalogDistributions = (o: Opt = {}) => apiFetch<CatalogColumns>('/api/catalog-distributions', o)

export const getStatistics = (o: Opt = {}) => apiFetch<StatisticsResponse>('/api/statistics', o)

/** `ids` are always included, even when they fall outside the first `limit` rows. */
export const getPositions = (limit: number, hoursOffset: number, ids: readonly string[] = [], o: Opt = {}) =>
  apiFetch<PositionsResponse>(
    `/api/positions?limit=${limit}&hours_offset=${hoursOffset}${ids.length ? `&ids=${ids.map(encodeURIComponent).join(',')}` : ''}`, o)

/** Search the WHOLE stored catalog by NORAD id or name (the loaded subset is only the first 5,000). */
export const searchTles = (q: string, limit = 20, o: Opt = {}) =>
  apiFetch<TleRecord[]>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`, o)

export const getTle = (id: string, o: Opt = {}) => apiFetch<TleRecord>(`/api/tle/${encodeURIComponent(id)}`, o)

export const getOrbitPath = (id: string, hoursOffset: number, o: Opt = {}) =>
  apiFetch<OrbitPathResponse>(`/api/orbit-path/${encodeURIComponent(id)}?hours_offset=${hoursOffset}`, o)

/** The screening step is fixed by the server (so no approach can fall between steps); only the horizon and list length are chosen. */
export interface ConjunctionQuery { horizonDays: number; limit: number }
export const getConjunctions = (q: ConjunctionQuery, o: Opt = {}) =>
  apiFetch<ConjunctionSearchResult>(`/api/conjunctions?time_horizon_days=${q.horizonDays}&limit=${q.limit}`, o)

export const getConjunctionMethod = (o: Opt = {}) => apiFetch<ConjunctionMethod>('/api/conjunctions/method', o)

export const getPairAssessment = (a: string, b: string, o: Opt = {}) =>
  apiFetch<PairAssessment>(`/api/conjunction-pair/${encodeURIComponent(a)}/${encodeURIComponent(b)}`, o)

export const postUpdateTles = (o: Opt = {}) =>
  apiFetch<UpdateTlesResponse>('/api/update-tles', { method: 'POST', ...o })
