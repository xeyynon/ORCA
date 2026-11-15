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

/** "10-02 19:00" for chart axes (UTC, no year: the axis spans days, and the full time is in the hover text). */
export function formatShortUtc(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 16)}`
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "03 Oct 2026 · 12:00:00 UTC": the simulated time shown above the playback slider. */
export function formatSimTime(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return NO_DATA
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
}

/** "8 Oct 2026" (UTC): a calendar day in words, for sentences that date a figure. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return NO_DATA
  const d = parseUtc(iso)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "6 to 7 Nov 2026", "30 Oct to 2 Nov 2026", "30 Dec 2026 to 2 Jan 2027": a UTC window in words. */
export function formatDayRange(startIso: string, endIso: string): string {
  const a = parseUtc(startIso)
  const b = parseUtc(endIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NO_DATA
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${formatDay(startIso)} to ${formatDay(endIso)}`
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} to ${formatDay(endIso)}`
  if (a.getUTCDate() !== b.getUTCDate()) return `${a.getUTCDate()} to ${formatDay(endIso)}`
  return formatDay(endIso)
}
