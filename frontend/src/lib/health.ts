import type { Health } from '@/api/types'
import type { ApiStatus, HealthCheck } from '@/hooks/useHealth'

/** "4 s ago", "2 min ago": the health page counts seconds, which formatRelative rounds away. */
export function agoShort(then: Date | null, now: Date): string {
  if (!then) return 'not yet'
  const s = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000))
  if (s < 60) return `${s} s ago`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`
}

/** Ends a message with one full stop, unless it already ends a sentence ("…port 8000?" must not become "?."). */
function sentence(t: string): string {
  const s = t.trim()
  return /[.?!]$/.test(s) ? s : `${s}.`
}

/** The page's answer line, in words. Never claims more than the last check showed. */
export function healthHeadline(status: ApiStatus, check: HealthCheck): { tone: 'ok' | 'warn' | 'bad'; title: string; detail: string } {
  const every = `Checked every ${Math.round(check.intervalMs / 1000)} s from this browser.`
  if (status === 'online') {
    return { tone: 'ok', title: 'The API is online', detail: `${check.latencyMs !== null ? `It answered in ${check.latencyMs} ms. ` : ''}${every}` }
  }
  if (status === 'offline') {
    return { tone: 'bad', title: 'The API is not answering', detail: `${check.error ? `Last error: ${sentence(check.error)} ` : ''}${every} The last good response is shown below.` }
  }
  return { tone: 'warn', title: 'Checking the API…', detail: every }
}

/** The raw response, as the health page's JSON option shows and copies it. */
export function healthJson(h: Health | null): string {
  return h ? JSON.stringify(h, null, 2) : ''
}
