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
 * Where you are, as a trail from Mission control. Empty on Mission control itself (a trail of one is noise).
 * The deepest level is the selection: an object, or a conjunction pair; clicking the view's crumb goes back up to it.
 */
export function breadcrumbTrail({ view, objectName = null, pairLabel = null }: TrailContext): Crumb[] {
  if (view === 'home') return []
  const home: Crumb = { label: VIEW_LABEL.home, to: { view: 'home', clearSelection: false } }
  const leaf = view === 'conjunctions' || view === 'globe' ? (pairLabel ?? (view === 'globe' ? objectName : null)) : view === 'overview' ? objectName : null
  if (!leaf) return [home, { label: VIEW_LABEL[view] }]
  return [home, { label: VIEW_LABEL[view], to: { view, clearSelection: true } }, { label: leaf }]
}
