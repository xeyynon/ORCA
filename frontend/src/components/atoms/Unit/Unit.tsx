import type { ReactNode } from 'react'
import './Unit.css'

type Props = { children: ReactNode }

/** The unit beside a number. Units are never free text in a sentence (rules.md §3). */
export function Unit({ children }: Props) {
  return <span className="unit">{children}</span>
}
