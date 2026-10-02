import type { ReactNode } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import './FieldNote.css'

type Props = { children: ReactNode }

/** A limitation stated next to the figure it qualifies (rules.md §2.6). Quiet on purpose: it informs, it does not alarm. */
export function FieldNote({ children }: Props) {
  return (
    <p className="field-note">
      <span className="field-note__icon"><Icon name="info" size={13} /></span>
      <span>{children}</span>
    </p>
  )
}
