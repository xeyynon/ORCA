import { Kpi } from '../../molecules/Kpi/Kpi'
import './KpiRow.css'

export interface KpiItem { label: string; value: string; unit?: string; hint?: string }
type Props = { items: readonly KpiItem[] }

export function KpiRow({ items }: Props) {
  return (
    <div className="kpi-row">
      {items.map((it) => <Kpi key={it.label} {...it} />)}
    </div>
  )
}
