import type { ReactNode } from 'react'
import { Label } from '../../atoms/Label/Label'
import './FactRow.css'

type Props = {
  label: string
  /** Plain-language meaning of the label, shown as a tooltip: for terms a newcomer will not know. */
  hint?: string
  children: ReactNode
}

/** Label above value, stacked: side-by-side runs together in narrow cards ("COORDINATES14.2°N"). */
export function FactRow({ label, hint, children }: Props) {
  return (
    <div className="fact-row" title={hint}>
      <Label>{label}</Label>
      <div className="fact-row__value">{children}</div>
    </div>
  )
}
