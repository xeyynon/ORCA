export const VIEWS = ['home', 'overview', 'globe', 'conjunctions', 'analytics', 'data', 'reports', 'health'] as const
export type ViewId = (typeof VIEWS)[number]

/** One name per view, used by the page title and the skip target, so they cannot disagree. */
export const VIEW_LABEL: Record<ViewId, string> = {
  home: 'Mission control',
  overview: 'Overview',
  globe: 'Globe',
  conjunctions: 'Conjunctions',
  analytics: 'Analytics',
  data: 'Data',
  reports: 'Reports',
  health: 'API health',
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
  reports: '6',
  // No key and no tab: the health page is opened from Data (owner, 2026-11-15: a page instead of raw JSON).
  health: '',
}

/**
 * The views that get a tab. Home is not one of them (owner, 2026-11-07): it is the default page, and the ORCA logo
 * (or H) brings you back to it.
 */
export const NAV_VIEWS: readonly ViewId[] = VIEWS.filter((v) => v !== 'home' && v !== 'health')

/** Where the app opens when the URL names no view. */
export const DEFAULT_VIEW: ViewId = 'home'
