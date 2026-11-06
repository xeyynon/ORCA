import type { ViewId } from './views'
import { VIEW_LABEL } from './views'

/** One step of the trail. `to` is where a click goes; the last crumb is the page you are on and has no `to`. */
export interface Crumb {
  label: string
  /** The view to open, and whether that click also drops the selection (going "up" a level). */
  to?: { view: ViewId; clearSelection: boolean }
}

export interface TrailContext {
  view: ViewId
  /** The selected object's name, if one is selected on this view. */
  objectName?: string | null
  /** The selected conjunction pair, "A × B", if one is selected (Conjunctions) or shown (Globe). */
  pairLabel?: string | null
}

/**
 * Where you are, as a trail from Mission control, shown only when you have drilled below a view: a selected object or
 * conjunction pair. Clicking the view's crumb goes back up to the view. Empty otherwise, because a trail of
 * "Mission control / Overview" only repeats the active nav tab (the owner found that strip odd, 2026-11-07).
 */
export function breadcrumbTrail({ view, objectName = null, pairLabel = null }: TrailContext): Crumb[] {
  if (view === 'home') return []
  const home: Crumb = { label: VIEW_LABEL.home, to: { view: 'home', clearSelection: false } }
  const leaf = view === 'conjunctions' || view === 'globe' ? (pairLabel ?? (view === 'globe' ? objectName : null)) : view === 'overview' ? objectName : null
  // With nothing selected the trail would only repeat the active nav tab (one home per fact), so there is none.
  if (!leaf) return []
  return [home, { label: VIEW_LABEL[view], to: { view, clearSelection: true } }, { label: leaf }]
}
