import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './ScatterPlot.css'

export interface Point { x: number; y: number; label: string }
type Props = { points: readonly Point[]; xUnit: string; yUnit: string; ariaLabel: string }

const W = 320
const H = 190
const PAD = { l: 40, r: 10, t: 8, b: 28 }

/** Hand-written SVG scatter. Only finite points are drawn; the axis extents are printed. */
export function ScatterPlot({ points, xUnit, yUnit, ariaLabel }: Props) {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (pts.length === 0) return <EmptyState kind="awaiting" title="No points to plot" />

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const sx = (x: number) => PAD.l + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const sy = (y: number) => H - PAD.b - (yMax === yMin ? 0.5 : (y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)

  return (
    <svg className="scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <line className="scatter__axis" x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} />
      <line className="scatter__axis" x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} />
      {pts.map((p, i) => (
        <circle key={i} className="scatter__pt" cx={sx(p.x)} cy={sy(p.y)} r={2.2}>
          <title>{p.label}</title>
        </circle>
      ))}
      <text className="scatter__tick" x={PAD.l - 4} y={PAD.t + 8} textAnchor="end">{Math.round(yMax)}</text>
      <text className="scatter__tick" x={PAD.l - 4} y={H - PAD.b} textAnchor="end">{Math.round(yMin)}</text>
      <text className="scatter__tick" x={PAD.l} y={H - 14} textAnchor="start">{Math.round(xMin)}</text>
      <text className="scatter__tick" x={W - PAD.r} y={H - 14} textAnchor="end">{Math.round(xMax)}</text>
      <text className="scatter__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 3} textAnchor="middle">{xUnit}</text>
      <text className="scatter__unit" x={10} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`}>{yUnit}</text>
    </svg>
  )
}
