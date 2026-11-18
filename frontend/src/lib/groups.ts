export interface GroupCount { label: string; count: number }

/** Official-looking designators ("2021-050D", "1998-067A") have no constellation name. */
const DESIGNATOR = /^\d{4}-\d{3}/
/** Objects named only by their international designator ("2021-050D"): no constellation name to group by. */
export const UNNAMED = 'Designator only'

/**
 * A rough grouping key from an object name: the first word before a space or hyphen
 * ("STARLINK-32032" -> STARLINK, "COSMOS 2251 DEB" -> COSMOS, "ISS (ZARYA)" -> ISS).
 * It is a naming heuristic, not an ownership record, and the chart says so.
 */
export function constellationOf(name: string): string {
  const n = name.trim().toUpperCase()
  if (!n || DESIGNATOR.test(n)) return UNNAMED
  const first = n.split(/[\s\-_/(]/)[0]
  return first || UNNAMED
}

/** The `top` largest groups by count, then everything else folded into "Other". Ties break alphabetically. */
export function topGroups(names: readonly string[], top: number): GroupCount[] {
  const counts = new Map<string, number>()
  for (const nm of names) { const g = constellationOf(nm); counts.set(g, (counts.get(g) ?? 0) + 1) }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const head = sorted.slice(0, top).map(([label, count]) => ({ label, count }))
  const rest = sorted.slice(top).reduce((n, [, c]) => n + c, 0)
  return rest > 0 ? [...head, { label: 'Other', count: rest }] : head
}

/**
 * The Globe's "Constellation" colouring (owner, 2026-11-15): the four largest broadband constellations in the catalog,
 * by the same naming rule as the Analytics chart, and everything else as Other. A naming heuristic, not an ownership record.
 */
export const GLOBE_CONSTELLATIONS = ['STARLINK', 'ONEWEB', 'KUIPER', 'QIANFAN', 'OTHER'] as const
export type GlobeConstellation = (typeof GLOBE_CONSTELLATIONS)[number]

export const GLOBE_CONSTELLATION_LABEL: Record<GlobeConstellation, string> = {
  STARLINK: 'Starlink', ONEWEB: 'OneWeb', KUIPER: 'Kuiper', QIANFAN: 'Qianfan', OTHER: 'Other',
}

export function globeConstellation(name: string): GlobeConstellation {
  const g = constellationOf(name)
  return (GLOBE_CONSTELLATIONS as readonly string[]).includes(g) && g !== 'OTHER' ? (g as GlobeConstellation) : 'OTHER'
}
