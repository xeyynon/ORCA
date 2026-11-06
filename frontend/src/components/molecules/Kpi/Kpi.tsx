import { Label } from '../../atoms/Label/Label'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { ValueUnit } from '../ValueUnit/ValueUnit'
import './Kpi.css'

type Props = {
  label: string
  value: string
  unit?: string
  hint?: string
  /** The figure is on its way: its slot shows a skeleton the size of a number, never a 0 (rules.md 11.1). */
  loading?: boolean
}

/** One headline number: caption, value, optional unit and a one-line hint. */
export function Kpi({ label, value, unit, hint, loading = false }: Props) {
  return (
    <div className="kpi">
      <Label>{label}</Label>
      <div className="kpi__value">{loading ? <Skeleton width="5ch" height="1em" /> : <ValueUnit value={value} unit={unit} />}</div>
      {loading ? <div className="kpi__hint"><Skeleton width="14ch" height="0.9em" /></div> : hint ? <div className="kpi__hint">{hint}</div> : null}
    </div>
  )
}
