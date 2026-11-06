import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { TOUR_STEPS, TOUR_STORAGE_KEY, availableSteps, moveStep, reconcileStep } from '@/lib/tour'
import type { TourStep } from '@/lib/tour'
import type { Rect, Size } from '@/lib/tourPlacement'

/** Shown at most once per page load even if storage cannot be written (private windows): signing out and in again does not replay it. */
let shownThisLoad = false

/**
 * Whether the tour was already shown in this browser. If storage cannot be read we cannot tell, and we do not start it:
 * replaying it on every visit would be worse than not showing it (it is always in the menu).
 */
function seenBefore(): boolean {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) !== null } catch { return true }
}
function markSeen() {
  try { localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString()) } catch { /* not remembered; shownThisLoad still holds for this page */ }
}

/** A target counts only if it is rendered and has a size (a tab hidden by a media query has none). */
function findTarget(step: TourStep): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(step.target)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? el : null
}
const onScreen = () => availableSteps(TOUR_STEPS, (s) => findTarget(s) !== null)
const viewportNow = (): Size => ({ width: window.innerWidth, height: window.innerHeight })

export type TourView = {
  step: TourStep
  index: number
  total: number
  target: Rect
  viewport: Size
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

/**
 * The first-run tour (MD/design_system_v2.md, "Empty states & onboarding"). It starts by itself once, on the first
 * signed-in visit in this browser (key `orca:tour:v1`), and `start` replays it (the menu and the home offer it).
 * Steps whose target is not on this layout are skipped; the list is re-checked on resize.
 * Returns `view`, the props for TourOverlay, or null when the tour is closed.
 */
export function useTour(): { start: () => void; view: TourView | null } {
  const [steps, setSteps] = useState<TourStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 })

  const start = useCallback(() => {
    const shown = onScreen()
    if (shown.length === 0) return
    shownThisLoad = true
    markSeen()
    setIndex(0)
    setTarget(null) // measured afresh before the overlay first paints, never the last run's box
    setSteps(shown)
  }, [])

  const close = useCallback(() => setSteps(null), [])

  // First signed-in visit: start once the header has rendered (this runs after the first commit, so the targets exist).
  useEffect(() => {
    if (!shownThisLoad && !seenBefore()) start()
  }, [start])

  const step = steps?.[index] ?? null

  // Measure the current target, and keep measuring while the layout can move: resize (which can also hide or show a
  // target, so the step list is re-checked) and scroll.
  useLayoutEffect(() => {
    if (!step) return
    const measure = () => {
      const fresh = onScreen()
      const same = fresh.length === steps?.length && fresh.every((s, i) => s.id === steps[i].id)
      if (!same) {
        const next = reconcileStep(step.id, TOUR_STEPS, fresh)
        if (next === null) { setSteps(null); return }
        setSteps(fresh)
        setIndex(next)
        return
      }
      const el = findTarget(step)
      if (!el) return
      const r = el.getBoundingClientRect()
      setTarget({ left: r.left, top: r.top, width: r.width, height: r.height })
      setViewport(viewportNow())
    }
    findTarget(step)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [step, steps])

  const go = useCallback((move: 'next' | 'back') => {
    if (!steps) return
    const to = moveStep(index, steps.length, move)
    if (to === 'finish') close()
    else if (to !== null) setIndex(to)
  }, [steps, index, close])

  const onNext = useCallback(() => go('next'), [go])
  const onBack = useCallback(() => go('back'), [go])

  const view = step && steps && target
    ? { step, index, total: steps.length, target, viewport, onBack, onNext, onClose: close }
    : null
  return { start, view }
}
