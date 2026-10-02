import { Label } from '../../atoms/Label/Label'
import { ValueUnit } from '../ValueUnit/ValueUnit'
import './Kpi.css'

type Props = { label: string; value: string; unit?: string; hint?: string }

/** One headline number: caption, value, optional unit and a one-line hint. */
export function Kpi({ label, value, unit, hint }: Props) {
  return (
    <div className="kpi">
      <Label>{label}</Label>
      <div className="kpi__value"><ValueUnit value={value} unit={unit} /></div>
      {hint ? <div className="kpi__hint">{hint}</div> : null}
    </div>
  )
}
