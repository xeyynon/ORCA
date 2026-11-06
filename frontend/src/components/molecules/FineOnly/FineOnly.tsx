import type { ReactNode } from 'react'
import './FineOnly.css'

type Props = { children: ReactNode }

/** Hides what only makes sense with a keyboard and mouse (the shortcuts button) on touch-first devices, where it is dead weight. */
export function FineOnly({ children }: Props) {
  return <span className="fine-only">{children}</span>
}
