/** Case-insensitive match on name or NORAD id; names starting with the query rank first. */
export function searchObjects<T extends { object_name: string; norad_cat_id: string }>(items: readonly T[], query: string, max = 8): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const starts: T[] = []
  const contains: T[] = []
  for (const it of items) {
    const name = it.object_name.toLowerCase()
    if (name.startsWith(q) || it.norad_cat_id.startsWith(q)) starts.push(it)
    else if (name.includes(q)) contains.push(it)
    if (starts.length >= max) break
  }
  return [...starts, ...contains].slice(0, max)
}
