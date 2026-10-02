import { compact, integer } from '@/lib/format'
import { heatColor } from '@/lib/heatColor'
import { yEdge } from '@/lib/heatmap'
import type { Grid, GridSpec } from '@/lib/heatmap'
import { Mono } from '../../atoms/Mono/Mono'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './HeatmapChart.css'

type Props = { grid: Grid; spec: GridSpec; xUnit: string; yUnit: string; ariaLabel: string }

const W = 460
const H = 250
const PAD = { l: 46, r: 8, t: 8, b: 34 }
const X_TICKS = 4
const Y_TICKS = 4

/**
 * 2D density: where objects concentrate across two variables. Chosen over a scatter because thousands of
 * points overplot (a constellation becomes one blob). Colour is a log-scaled sequential ramp, so a lone
 * object still shows next to a cluster of thousands; empty cells are left unfilled.
 */
export function HeatmapChart({ grid, spec, xUnit, yUnit, ariaLabel }: Props) {
  if (grid.total === 0) return <EmptyState kind="none" title="No points to plot" />

  const cw = (W - PAD.l - PAD.r) / spec.xBins
  const ch = (H - PAD.t - PAD.b) / spec.yBins
  const xAt = (c: number) => spec.xMin + (c / spec.xBins) * (spec.xMax - spec.xMin)

  return (
    <div className="heatmap">
      <svg className="heatmap__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        <rect className="heatmap__plot" x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        {grid.cells.map((row, r) => row.map((count, c) => count > 0 ? (
          <rect
            key={`${r}-${c}`}
            x={PAD.l + c * cw}
            y={PAD.t + (spec.yBins - 1 - r) * ch}
            width={cw + 0.4}
            height={ch + 0.4}
            style={{ fill: heatColor(count, grid.max) }}
          >
            <title>{`${integer(count)} objects · ${xAt(c).toFixed(0)}–${xAt(c + 1).toFixed(0)} ${xUnit}, ${compact(yEdge(spec, r))}–${compact(yEdge(spec, r + 1))} ${yUnit}`}</title>
          </rect>
        ) : null))}
        {Array.from({ length: X_TICKS + 1 }, (_, k) => {
          const c = (k * spec.xBins) / X_TICKS
          return <text key={k} className="heatmap__tick" x={PAD.l + c * cw} y={H - 18} textAnchor={k === 0 ? 'start' : k === X_TICKS ? 'end' : 'middle'}>{compact(xAt(c))}</text>
        })}
        {Array.from({ length: Y_TICKS + 1 }, (_, k) => {
          const r = (k * spec.yBins) / Y_TICKS
          return <text key={k} className="heatmap__tick" x={PAD.l - 4} y={PAD.t + (spec.yBins - r) * ch + 3} textAnchor="end">{compact(yEdge(spec, r))}</text>
        })}
        <text className="heatmap__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle">{xUnit}</text>
        <text className="heatmap__unit" x={10} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`}>{yUnit}</text>
      </svg>
      <div className="heatmap__key" aria-hidden="true">
        <Mono muted>1</Mono>
        <span className="heatmap__ramp" />
        <Mono muted>{integer(grid.max)}</Mono>
        <span className="heatmap__key-label">objects per cell</span>
      </div>
    </div>
  )
}
