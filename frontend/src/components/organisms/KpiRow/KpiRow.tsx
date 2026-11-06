import { Kpi } from '../../molecules/Kpi/Kpi'
import './KpiRow.css'

export interface KpiItem { label: string; value: string; unit?: string; hint?: string }
type Props = {
  items: readonly KpiItem[]
  /** The figures are on their way: each card keeps its caption and shows a skeleton in place of its value and hint.
      The row is marked busy; the section's own labelled loader says what is loading. */
  loading?: boolean
}

export function KpiRow({ items, loading = false }: Props) {
  return (
    <div className="kpi-row" aria-busy={loading || undefined}>
      {items.map((it) => <Kpi key={it.label} {...it} loading={loading} />)}
    </div>
  )
}
