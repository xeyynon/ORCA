import type { ReactNode } from 'react'
import { Label } from '../../atoms/Label/Label'
import './FactRow.css'

/** `label` may hold a GlossaryTerm (its tooltip resets the uppercase). */
type Props = { label: ReactNode; children: ReactNode }

/** Label above value, stacked: side-by-side runs together in narrow cards ("COORDINATES14.2°N"). */
export function FactRow({ label, children }: Props) {
  return (
    <div className="fact-row">
      <Label>{label}</Label>
      <div className="fact-row__value">{children}</div>
    </div>
  )
}
