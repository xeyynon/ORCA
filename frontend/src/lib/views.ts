export const VIEWS = ['overview', 'globe', 'conjunctions', 'analytics', 'data'] as const
export type ViewId = (typeof VIEWS)[number]

/** One name per view, used by the nav, the page title and the skip target, so they cannot disagree. */
export const VIEW_LABEL: Record<ViewId, string> = {
  overview: 'Overview',
  globe: 'Globe',
  conjunctions: 'Conjunctions',
  analytics: 'Analytics',
  data: 'Data',
}
