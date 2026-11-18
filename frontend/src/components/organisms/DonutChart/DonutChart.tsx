import { integer } from '@/lib/format'
import { Mono } from '../../atoms/Mono/Mono'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { ChartLegend } from '../ChartLegend/ChartLegend'
import './DonutChart.css'

export interface Slice { label: string; value: number; color: string }
type Props = { slices: readonly Slice[]; centerLabel: string; ariaLabel: string }

const R = 42
const C = 2 * Math.PI * R

/** Part-to-whole for a handful of categories. The total sits in the middle; every slice is named with count and share in the legend. */
export function DonutChart({ slices, centerLabel, ariaLabel }: Props) {
  const total = slices.reduce((n, s) => n + s.value, 0)
  if (total === 0) return <EmptyState kind="none" title="No values to plot" />

  let offset = 0
  return (
    <div className="donut">
      {/* The ring and its centre text share one box, so the text stays inside the ring at every width. */}
      <div className="donut__ring">
        <svg className="donut__svg" viewBox="0 0 120 120" role="img" aria-label={ariaLabel}>
          <g transform="rotate(-90 60 60)">
            {slices.filter((s) => s.value > 0).map((s) => {
              const len = (s.value / total) * C
              const el = (
                <circle key={s.label} cx="60" cy="60" r={R} fill="none" strokeWidth="16" style={{ stroke: s.color }} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}>
                  <title>{`${s.label}: ${integer(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
                </circle>
              )
              offset += len
              return el
            })}
          </g>
        </svg>
        <div className="donut__center">
          <div className="donut__total"><Mono>{integer(total)}</Mono></div>
          <div className="donut__label">{centerLabel}</div>
        </div>
      </div>
      <div className="donut__legend">
        <ChartLegend layout="stack" items={slices.map((s) => ({ label: s.label, color: s.color, value: `${integer(s.value)} · ${((s.value / total) * 100).toFixed(1)}%` }))} />
      </div>
    </div>
  )
}
