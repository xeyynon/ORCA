import type { ViewId } from './views'

export type NoticeTone = 'warn' | 'bad' | 'ok'

/** One thing that deserves the user's attention, with the place to act on it. */
export interface Notice {
  id: string
  tone: NoticeTone
  title: string
  detail: string
  go?: ViewId
  /** Something under way, not something to act on: shown in the list, never counted on the badge. */
  inProgress?: boolean
}

export interface NoticeInput {
  apiStatus: 'online' | 'offline' | 'checking'
  /** The stale-data notice (lib/staleness.ts), when the catalog is old enough to say so. */
  stale: { title: string } | null
  searchPhase: 'idle' | 'running' | 'done' | 'failed'
  searchSource: 'live' | 'saved'
}

/**
 * The notifications the bell lists: only real, current conditions, worst first. Nothing is invented to fill the list;
 * an empty list is a valid answer ("nothing needs your attention"). A stored example run is not news, so it never counts.
 */
export function buildNotices({ apiStatus, stale, searchPhase, searchSource }: NoticeInput): Notice[] {
  const out: Notice[] = []
  if (apiStatus === 'offline') {
    out.push({ id: 'api', tone: 'bad', title: 'ORCA’s server isn’t answering', detail: 'The figures can’t update until it’s back.', go: 'health' })
  }
  if (searchPhase === 'failed') {
    out.push({ id: 'search-failed', tone: 'bad', title: 'The conjunction search didn’t work', detail: 'Open Conjunctions to see why and try again.', go: 'conjunctions' })
  }
  if (stale) {
    out.push({ id: 'stale', tone: 'warn', title: stale.title, detail: 'Treat positions and risks as a rough guide, or refresh the catalog.', go: 'data' })
  }
  if (searchPhase === 'running') {
    // The same tone as the status bar's "Search running" (amber): one tone for "in progress" (audit 2026-11-18 #34).
    out.push({ id: 'search-running', tone: 'warn', inProgress: true, title: 'A conjunction search is running', detail: 'It will keep going while you use other pages.', go: 'conjunctions' })
  }
  if (searchPhase === 'done' && searchSource === 'live') {
    out.push({ id: 'search-done', tone: 'ok', title: 'Your conjunction search is done', detail: 'You can see the result on the Conjunctions page.', go: 'conjunctions' })
  }
  return out
}

/** How many notices count on the badge: things that need action (bad or warn), not good news or work under way. */
export function badgeCount(notices: readonly Notice[]): number {
  return notices.filter((n) => n.tone !== 'ok' && !n.inProgress).length
}
