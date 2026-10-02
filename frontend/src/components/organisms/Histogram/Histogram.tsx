import { useMemo } from 'react'
import { histogram } from '@/lib/histogram'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './Histogram.css'

type Props = { values: readonly number[]; binCount?: number; unit: string; ariaLabel: string; digits?: number }

const W = 320
const H = 150
const PAD = { l: 34, r: 8, t: 8, b: 26 }

/** Hand-written SVG histogram. Axis ends and the tallest count are labelled directly. */
export function Histogram({ values, binCount = 16, unit, ariaLabel, digits = 0 }: Props) {
  const bins = useMemo(() => histogram(values, binCount), [values, binCount])
  if (bins.length === 0) return <EmptyState kind="awaiting" title="No values to plot" />

  const maxCount = Math.max(...bins.map((b) => b.count))
  const x0 = bins[0].x0
  const x1 = bins[bins.length - 1].x1
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const bw = innerW / bins.length

  return (
    <svg className="histogram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <line className="histogram__axis" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} />
      {bins.map((b, i) => {
        const h = maxCount === 0 ? 0 : (b.count / maxCount) * innerH
        return (
          <rect key={i} className="histogram__bar" x={PAD.l + i * bw + 1} y={PAD.t + innerH - h} width={Math.max(0, bw - 2)} height={h}>
            <title>{`${b.x0.toFixed(digits)} to ${b.x1.toFixed(digits)} ${unit}: ${b.count}`}</title>
          </rect>
        )
      })}
      <text className="histogram__tick" x={PAD.l - 4} y={PAD.t + 8} textAnchor="end">{maxCount}</text>
      <text className="histogram__tick" x={PAD.l - 4} y={PAD.t + innerH} textAnchor="end">0</text>
      <text className="histogram__tick" x={PAD.l} y={H - 8} textAnchor="start">{x0.toFixed(digits)}</text>
      <text className="histogram__tick" x={W - PAD.r} y={H - 8} textAnchor="end">{x1.toFixed(digits)}</text>
      <text className="histogram__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle">{unit}</text>
    </svg>
  )
}
