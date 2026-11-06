import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { GLOSSARY } from '@/lib/glossary'
import type { GlossaryTermKey } from '@/lib/glossary'
import { tooltipAlign } from '@/lib/tooltipPlacement'
import type { TipAlign } from '@/lib/tooltipPlacement'
import './GlossaryTerm.css'

type Props = { term: GlossaryTermKey; children?: ReactNode }

/**
 * A technical term with its plain-language meaning, reachable by hover AND keyboard focus (a title attribute is neither
 * visible on touch nor reachable by Tab). The definition comes from lib/glossary.ts so a term reads the same everywhere.
 * WCAG 1.4.13: Esc dismisses it, the pointer can move onto it without it closing, and it stays until hover or focus leaves.
 * Do not place it inside a button or link: it is focusable itself.
 */
export function GlossaryTerm({ term, children }: Props) {
  const id = useId()
  const termRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [align, setAlign] = useState<TipAlign>('left')
  const visible = (hovered || focused) && !dismissed

  // Esc closes the tooltip first: swallow it before the app-wide shortcuts (and any open dialog) see it.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault(); e.stopPropagation()
      setDismissed(true)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible])

  // Keep the tooltip inside the viewport: measured once it is shown, before paint.
  useLayoutEffect(() => {
    if (!visible || !termRef.current || !tipRef.current) return
    setAlign(tooltipAlign(termRef.current.getBoundingClientRect(), tipRef.current.offsetWidth, document.documentElement.clientWidth))
  }, [visible])

  return (
    <span
      ref={termRef}
      className="term"
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={() => { setHovered(true); setDismissed(false) }}
      onMouseLeave={() => { setHovered(false); setDismissed(false) }}
      onFocus={() => { setFocused(true); setDismissed(false) }}
      onBlur={() => { setFocused(false); setDismissed(false) }}
    >
      {children ?? term}
      <span ref={tipRef} className="term__tip" role="tooltip" id={id} data-open={visible} data-align={align}>{GLOSSARY[term]}</span>
    </span>
  )
}
