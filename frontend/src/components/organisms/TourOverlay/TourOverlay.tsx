import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { moveStep } from '@/lib/tour'
import type { TourStep } from '@/lib/tour'
import { placeCard, spotlightRect } from '@/lib/tourPlacement'
import type { Rect, Size } from '@/lib/tourPlacement'
import { TourCard } from '../TourCard/TourCard'
import './TourOverlay.css'

type Props = {
  step: TourStep
  index: number
  total: number
  /** The current target's box in viewport pixels, measured by useTour. */
  target: Rect
  viewport: Size
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The guided tour's spotlight and card. The page is dimmed with --scrim except a cut-out around the target (one element
 * with a 9999px spread shadow), which glides from target to target; the card sits beside it (lib/tourPlacement.ts) or,
 * on a phone, is a bottom sheet. Clicks on the page are blocked while it is open; the tour is left with Skip, Finish or Esc.
 *
 * Keys, from the capture phase like Modal, so the app-wide shortcuts never also fire: Esc closes (swallowed, one press
 * one step); Left and Right go Back and Next (Right does not finish on the last step: that needs Finish); Tab cycles
 * inside the card; other single-character keys are swallowed so 1 to 5, T, / and ? do not act behind the dialog.
 * Focus goes to Next on open and returns to whatever had it before (or nowhere, if nothing did) on close.
 */
export function TourOverlay({ step, index, total, target, viewport, onBack, onNext, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState<Size>({ width: 0, height: 0 })
  const [ready, setReady] = useState(false)
  const ids = useId()

  // Focus in on open, back out on close. A layout effect declared first, so it records the previous focus before the
  // effect below (also a layout effect, which runs ahead of any passive one) moves it into the card.
  useLayoutEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    cardRef.current?.querySelector<HTMLElement>('[data-tour-primary] button')?.focus()
    return () => {
      if (prev && prev !== document.body && prev.isConnected) prev.focus({ preventScroll: true })
    }
  }, [])

  // A control that went away (Back is disabled on step 1) must not drop focus to the page: hand it to Next.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (el && !el.contains(document.activeElement)) el.querySelector<HTMLElement>('[data-tour-primary] button')?.focus()
  }, [index])

  // Keys. Bound once; the latest values are read through a ref.
  const latest = useRef({ index, total, onBack, onNext, onClose })
  latest.current = { index, total, onBack, onNext, onClose }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { index: i, total: n, onBack: back, onNext: next, onClose: close } = latest.current
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
      if (e.key === 'Tab') {
        const els = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        if (els.length === 0) { e.preventDefault(); return }
        const at = els.indexOf(document.activeElement as HTMLElement)
        const to = e.shiftKey ? (at <= 0 ? els.length - 1 : at - 1) : (at === -1 || at === els.length - 1 ? 0 : at + 1)
        e.preventDefault()
        els[to].focus()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.repeat) return
        const to = moveStep(i, n, e.key === 'ArrowRight' ? 'next' : 'back')
        if (typeof to === 'number') (e.key === 'ArrowRight' ? next : back)()
        return
      }
      if (e.key.length === 1 && e.key !== ' ') e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // The card's size, for placement. offsetWidth/Height ignore the entry transform.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (w !== card.width || h !== card.height) setCard({ width: w, height: h })
  })

  // Glide between steps only after the first placement has been painted, so the card and spotlight do not fly in from 0,0.
  useEffect(() => {
    if (ready || card.width === 0) return
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [ready, card.width])

  const spot = spotlightRect(target, viewport)
  const place = placeCard(spot, card, viewport)
  const sheet = place.mode === 'sheet'

  return (
    <div className={ready ? 'tour-overlay tour-overlay--ready' : 'tour-overlay'}>
      <div className="tour-overlay__block" aria-hidden="true" />
      <div
        className="tour-overlay__spot"
        aria-hidden="true"
        style={{ width: spot.width, height: spot.height, transform: `translate(${spot.left}px, ${spot.top}px)` }}
      />
      <div
        className={sheet ? 'tour-overlay__place tour-overlay__place--sheet' : 'tour-overlay__place'}
        style={place.mode === 'float' ? { transform: `translate(${place.left}px, ${place.top}px)` } : undefined}
      >
        <TourCard
          ref={cardRef}
          stepId={step.id}
          title={step.title}
          body={step.body}
          index={index}
          total={total}
          sheet={sheet}
          titleId={`${ids}-title`}
          bodyId={`${ids}-body`}
          onBack={onBack}
          onNext={onNext}
          onSkip={onClose}
        />
      </div>
    </div>
  )
}
