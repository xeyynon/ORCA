import { cx } from '@/lib/cx'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import './ChartLegend.css'

export interface LegendEntry { label: string; color: string; value?: string }
type Props = {
  items: readonly LegendEntry[]
  /** One column, for a narrow slot beside a chart (the donut). The default flows into several columns under a chart. */
  layout?: 'flow' | 'stack'
}

/** Names every colour used in a chart: colour is never the only carrier of identity. */
export function ChartLegend({ items, layout = 'flow' }: Props) {
  return (
    <div className={cx('chart-legend', layout === 'stack' && 'chart-legend--stack')}>
      {items.map((it) => <LegendItem key={it.label} color={it.color} label={it.label} value={it.value} />)}
    </div>
  )
}
