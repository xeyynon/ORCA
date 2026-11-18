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
  /** The words for a touch screen, where there are no number keys, "/" or "." and nothing is clicked (audit 2026-11-18,
      P2 #21). Left out when `body` already reads right on a phone. */
  touchBody?: string
}

/**
 * Targets are existing, stable hooks: the header's view row, the search box, a nav tab by its title ("Globe (2)", from
 * NavTab) and the menu's data-tour attribute. Copy says only what the app does today.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    // Moved here from the home page (homepage spec §6): what ORCA does, in the order it does it. Home only.
    id: 'how',
    target: '.home-hero',
    title: 'ORCA basics',
    body: 'ORCA works in three steps. Track places every cataloged object on a 3-d Earth from public orbit data, and Screen checks every pair for close passes over the next days. Understand then ranks each approach by its chance of collision, in plain language.',
  },
  {
    id: 'views',
    target: '.appbar__center',
    title: 'Open six views with one row',
    body: 'Overview lists the catalog, Globe shows it in 3-d, Conjunctions finds close approaches, Analytics charts it, Data explains where it comes from, and Reports turns the results into a printable document. Use the number keys (1-6) to open the six views. The ORCA logo or the H key brings you back to this page.',
    touchBody: 'Overview lists the catalog, Globe shows it in 3-d, Conjunctions finds close approaches, Analytics charts it, Data explains where it comes from, and Reports turns the results into a printable document. Tap an icon in this row to open its view. Tap the ORCA logo to come back to this page.',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Search for any object',
    body: 'Enter the name of an object or its NORAD id and click on a result to display it on the Globe. Use forward slash (/) to jump here from any view.',
    touchBody: 'Tap here and enter the name of an object or its NORAD id. Tap a result to show it on the Globe.',
  },
  {
    id: 'globe',
    target: '.appbar__center .nav-tab[title^="Globe "]',
    title: 'Catalog in 3-d',
    body: 'Globe creates a graphic representation of all loaded objects around the Earth. Clicking on an object draws its orbital path. Using the playback bar allows moving time forward.',
    touchBody: 'Globe creates a graphic representation of all loaded objects around the Earth. Tapping an object draws its orbital path. Using the playback bar allows moving time forward.',
  },
  {
    id: 'conjunctions',
    target: '.appbar__center .nav-tab[title^="Conjunctions "]',
    title: 'Find close approaches',
    body: 'Conjunctions performs a search for all pairs of objects that pass within a set range of each other and estimates their probability of colliding. The amount of time required to perform a search is generally several minutes, so an example run has been saved to explore first.',
  },
  {
    id: 'ask',
    target: '[data-tour="ask"]',
    title: 'Ask ORCA',
    body: 'You can ask ORCA questions in everyday words, such as how many objects there are, how old the data is, what a term means, or to open a view. Use dot (.) to Ask ORCA from anywhere.',
    touchBody: 'You can ask ORCA questions in everyday words, such as how many objects there are, how old the data is, what a term means, or to open a view. Tap this button to ask from any page.',
  },
  {
    id: 'menu',
    target: '[data-tour="menu"]',
    title: 'Your menu',
    body: 'All remaining options live here including notifications, keyboard shortcuts, theme selection and signing out. If you want to see all these steps again, choose "Take the tour" within this menu.',
    // The menu hides "Keyboard shortcuts" on a touch screen (FineOnly), so the card does not name it.
    touchBody: 'All remaining options live here including notifications, theme selection and signing out. If you want to see all these steps again, choose "Take the tour" within this menu.',
  },
]

/** A step as a touch screen shows it: its touch words when it has them. */
export function forPointer(step: TourStep, touch: boolean): TourStep {
  return touch && step.touchBody ? { ...step, body: step.touchBody } : step
}

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
