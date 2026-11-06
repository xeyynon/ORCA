export const VIEWS = ['home', 'overview', 'globe', 'conjunctions', 'analytics', 'data'] as const
export type ViewId = (typeof VIEWS)[number]

/** One name per view, used by the page title, breadcrumbs and the skip target, so they cannot disagree. */
export const VIEW_LABEL: Record<ViewId, string> = {
  home: 'Mission control',
  overview: 'Overview',
  globe: 'Globe',
  conjunctions: 'Conjunctions',
  analytics: 'Analytics',
  data: 'Data',
}

/** The nav tab's short label. Mission control is "Home" in the tab row, where space is tight on a phone. */
export const NAV_LABEL: Record<ViewId, string> = { ...VIEW_LABEL, home: 'Home' }

/**
 * The key that opens each view. 1 to 5 kept their meaning when Mission control arrived (muscle memory and the help
 * panel); the new landing view is H, and the logo is a link to it too.
 */
export const VIEW_HOTKEY: Record<ViewId, string> = {
  home: 'h',
  overview: '1',
  globe: '2',
  conjunctions: '3',
  analytics: '4',
  data: '5',
}

/** Where the app opens when the URL names no view. */
export const DEFAULT_VIEW: ViewId = 'home'
