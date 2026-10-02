export interface GroupCount { label: string; count: number }

/** Official-looking designators ("2021-050D", "1998-067A") have no constellation name. */
const DESIGNATOR = /^\d{4}-\d{3}/
export const UNNAMED = 'Unnamed (designator only)'

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
