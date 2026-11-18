import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * On a one-column layout the detail card sits below the table, often far off the screen, so tapping a row seemed to do
 * nothing (audit 2026-11-18 #7). When the selection changes and `singleColumnQuery` matches, this scrolls the card to
 * the top of the view (smoothly, unless the reader asked for reduced motion) and moves focus to the card's heading.
 *
 * `ref` is the card itself, or a box around it when `selector` names the card inside that box. Nothing happens on the
 * first render, when the selection is cleared, or when focus is already inside the card (its own Previous and Next).
 */
export function useRevealOnSelect(ref: RefObject<HTMLElement | null>, selectionKey: string | null, singleColumnQuery: string, selector?: string) {
  const seen = useRef(selectionKey)
  useEffect(() => {
    if (seen.current === selectionKey) return
    seen.current = selectionKey
    if (selectionKey === null || typeof window === 'undefined') return
    if (!window.matchMedia(singleColumnQuery).matches) return
    const box = ref.current
    const card = selector ? box?.querySelector<HTMLElement>(selector) : box
    if (!card || card.contains(document.activeElement)) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    const heading = card.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    }
  }, [ref, selectionKey, singleColumnQuery, selector])
}
