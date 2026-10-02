/** Backend timestamps are naive UTC (no zone suffix). Parse them as UTC, never local. */
export function parseUtc(iso: string): Date {
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`)
}

export const NO_DATA = '—'

export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return NO_DATA
  const d = parseUtc(iso)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

/** Coarse relative time: "in 3d 4h", "2h 05m ago". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const ms = parseUtc(iso).getTime() - now.getTime()
  if (Number.isNaN(ms)) return NO_DATA
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 86_400_000)
  const h = Math.floor((abs % 86_400_000) / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
  return ms >= 0 ? `in ${body}` : `${body} ago`
}

/** Age in days between a TLE epoch and `now`. */
export function ageDays(epochIso: string, now: Date = new Date()): number {
  return (now.getTime() - parseUtc(epochIso).getTime()) / 86_400_000
}
