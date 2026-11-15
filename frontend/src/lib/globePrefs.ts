import type { ObjectType } from '@/api/types'
import { EARTH_RADIUS_KM } from './coords'
import { ALTITUDE_BANDS, altitudeBand } from './orbit'
import type { AltitudeBand } from './orbit'
import { OBJECT_TYPES } from './objectTypes'

export type ColorBy = 'altitude' | 'type' | 'constellation'
export type TypeFilter = 'all' | ObjectType

/** Everything the person can toggle on the globe. These are preferences, so they persist across navigation (rules.md §5.1). */
export interface GlobePrefs {
  showSatellites: boolean
  showOrbits: boolean
  showConjunction: boolean
  labelSelected: boolean
  colorBy: ColorBy
  typeFilter: TypeFilter
  bands: Record<AltitudeBand, boolean>
  onlyConjunction: boolean
}

export const DEFAULT_PREFS: GlobePrefs = {
  showSatellites: true,
  showOrbits: true,
  showConjunction: true,
  labelSelected: true,
  colorBy: 'altitude',
  typeFilter: 'all',
  bands: { LEO: true, MEO: true, GEO: true, BEYOND: true },
  onlyConjunction: false,
}

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

/** Validate stored JSON field by field: anything missing or of the wrong type falls back to the default, never throws. */
export function parsePrefs(raw: unknown): GlobePrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const bandsRaw = (o.bands && typeof o.bands === 'object' ? o.bands : {}) as Record<string, unknown>
  const bands = Object.fromEntries(ALTITUDE_BANDS.map((b) => [b, bool(bandsRaw[b], true)])) as Record<AltitudeBand, boolean>
  const typeFilter: TypeFilter = o.typeFilter === 'all' || (OBJECT_TYPES as readonly unknown[]).includes(o.typeFilter) ? (o.typeFilter as TypeFilter) : 'all'
  return {
    showSatellites: bool(o.showSatellites, DEFAULT_PREFS.showSatellites),
    showOrbits: bool(o.showOrbits, DEFAULT_PREFS.showOrbits),
    showConjunction: bool(o.showConjunction, DEFAULT_PREFS.showConjunction),
    labelSelected: bool(o.labelSelected, DEFAULT_PREFS.labelSelected),
    colorBy: o.colorBy === 'type' || o.colorBy === 'constellation' ? o.colorBy : 'altitude',
    typeFilter,
    bands,
    onlyConjunction: bool(o.onlyConjunction, DEFAULT_PREFS.onlyConjunction),
  }
}

interface Filterable { id: string; type: ObjectType; r: readonly [number, number, number] }

/**
 * The objects to draw. Selected and conjunction objects are ALWAYS kept (a filter must never hide the thing you are looking
 * at); with "show satellites" off only those remain. Otherwise an object needs its type and its altitude band enabled, and,
 * if "only conjunction objects" is on, to be part of the active conjunction.
 */
export function filterObjects<T extends Filterable>(objects: readonly T[], prefs: GlobePrefs, keepIds: ReadonlySet<string>, conjunctionIds: ReadonlySet<string>): T[] {
  return objects.filter((o) => {
    if (keepIds.has(o.id) || conjunctionIds.has(o.id)) return true
    if (!prefs.showSatellites) return false
    if (prefs.typeFilter !== 'all' && o.type !== prefs.typeFilter) return false
    if (!prefs.bands[altitudeBand(Math.hypot(o.r[0], o.r[1], o.r[2]) - EARTH_RADIUS_KM)]) return false
    if (prefs.onlyConjunction) return false // not in the conjunction (those returned above)
    return true
  })
}
