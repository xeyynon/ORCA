import type { Bin } from '@/lib/histogram'
import { compact } from '@/lib/format'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './Histogram.css'

type Props = {
  bins: readonly Bin[]
  ariaLabel: string
  unit: string
  /** CSS colour for a bin (a token reference). Defaults to the neutral series colour. */
  colorOf?: (bin: Bin) => string
  formatTick?: (v: number) => string
}

const W = 340
const H = 160
const PAD = { l: 38, r: 8, t: 8, b: 30 }
const TICKS = 4

/** Hand-written SVG histogram. The tallest count and five x ticks are labelled; each bar's range is in its hover text. */
export function Histogram({ bins, ariaLabel, unit, colorOf, formatTick = compact }: Props) {
  if (bins.length === 0) return <EmptyState kind="none" title="No values to plot" />

  const maxCount = Math.max(1, ...bins.map((b) => b.count))
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const bw = innerW / bins.length
  const tickAt = (i: number) => (i >= bins.length ? bins[bins.length - 1].x1 : bins[i].x0)

  return (
    <svg className="histogram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <line className="histogram__axis" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} />
      {bins.map((b, i) => {
        const h = (b.count / maxCount) * innerH
        return (
          <rect key={i} className="histogram__bar" style={colorOf ? { fill: colorOf(b) } : undefined} x={PAD.l + i * bw + 0.5} y={PAD.t + innerH - h} width={Math.max(0, bw - 1)} height={h}>
            <title>{`${compact(b.x0)} to ${compact(b.x1)} ${unit}: ${b.count.toLocaleString('en-US')} objects`}</title>
          </rect>
        )
      })}
      <text className="histogram__tick" x={PAD.l - 4} y={PAD.t + 8} textAnchor="end">{compact(maxCount)}</text>
      <text className="histogram__tick" x={PAD.l - 4} y={PAD.t + innerH} textAnchor="end">0</text>
      {Array.from({ length: TICKS + 1 }, (_, k) => {
        const idx = Math.round((k * bins.length) / TICKS)
        const anchor = k === 0 ? 'start' : k === TICKS ? 'end' : 'middle'
        return (
          <text key={k} className="histogram__tick" x={PAD.l + idx * bw} y={H - 16} textAnchor={anchor}>{formatTick(tickAt(idx))}</text>
        )
      })}
      <text className="histogram__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 3} textAnchor="middle">{unit}</text>
    </svg>
  )
}
