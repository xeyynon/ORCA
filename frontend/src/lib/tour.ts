/**
 * The first-run tour: its steps and the pure step logic (MD/design_system_v2.md, "Empty states & onboarding").
 * The DOM work (finding targets, measuring them, storage) lives in hooks/useTour.ts; placement maths in tourPlacement.ts.
 */

/** Versioned, so a rewritten tour can be shown once more to people who saw the old one. */
export const TOUR_STORAGE_KEY = 'orca:tour:v1'

export type TourStep = {
  id: string
  /** A CSS selector for the element the step points at. A step whose target is missing on this layout is skipped. */
  target: string
  title: string
  body: string
}

/**
 * Targets are existing, stable hooks: the header's view row, the search box, a nav tab by its title ("Globe (2)", from
 * NavTab) and the menu's data-tour attribute. Copy says only what the app does today.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'views',
    target: '.appbar__center',
    title: 'Six views, one row',
    body: 'Home is mission control. Overview lists the catalog, Globe shows it in 3D, Conjunctions looks for close approaches, Analytics charts it, and Data says where it comes from. On a keyboard, H opens Home and 1 to 5 open the others.',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Find any object',
    body: 'Type a name or a NORAD id and pick a result to see it on the globe. Press / to jump here from anywhere.',
  },
  {
    id: 'globe',
    target: '.appbar__center .nav-tab[title^="Globe "]',
    title: 'The catalog in 3D',
    body: 'Globe plots the loaded objects around the Earth. Select one to draw its orbit, and use the playback bar to move time forward.',
  },
  {
    id: 'conjunctions',
    target: '.appbar__center .nav-tab[title^="Conjunctions "]',
    title: 'Close approaches',
    body: 'Conjunctions searches for pairs of objects that pass close to each other and estimates their probability of collision. A search takes minutes, so a saved example run is there to explore first.',
  },
  {
    id: 'menu',
    target: '[data-tour="help"]',
    title: 'Your menu',
    body: 'Theme, keyboard shortcuts and Sign out live here. Choose Take the tour in this menu to see these steps again.',
  },
]

/** The steps whose target is on screen now, in tour order. */
export function availableSteps(steps: readonly TourStep[], isPresent: (step: TourStep) => boolean): TourStep[] {
  return steps.filter(isPresent)
}

export type TourMove = 'next' | 'back'

/**
 * Where a move goes from `index` in a tour of `total` steps: another index, 'finish' (Next on the last step) or null
 * (Back on the first step: nothing to do).
 */
export function moveStep(index: number, total: number, move: TourMove): number | 'finish' | null {
  if (total <= 0) return 'finish'
  if (move === 'next') return index >= total - 1 ? 'finish' : index + 1
  return index <= 0 ? null : index - 1
}

/**
 * After the steps on screen change (a resize hid a target), the index to show: the same step if it is still there, else
 * the first remaining step that came after it in the full list, else the last remaining one. Null when none are left.
 */
export function reconcileStep(currentId: string, all: readonly TourStep[], available: readonly TourStep[]): number | null {
  if (available.length === 0) return null
  const same = available.findIndex((s) => s.id === currentId)
  if (same >= 0) return same
  const order = all.findIndex((s) => s.id === currentId)
  const after = available.findIndex((s) => all.findIndex((a) => a.id === s.id) > order)
  return after >= 0 ? after : available.length - 1
}

/** "Step 2 of 5": counted over the steps actually shown, so a skipped step never leaves a gap. */
export function stepLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`
}
