import { useMemo } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { compact, pc } from '@/lib/format'
import { riskTone } from '@/lib/risk'
import { decadeTicks, linearScale, logScale } from '@/lib/scale'
import { formatShortUtc, formatUtc, parseUtc } from '@/lib/time'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './EventTimeline.css'

type Props = { events: readonly ConjunctionEvent[]; now: Date }

const W = 760
const H = 220
const PAD = { l: 52, r: 14, t: 10, b: 30 }
const X_TICKS = 5

/**
 * When the events happen and how risky each is: time on x, probability of collision on a log y axis (it spans
 * many decades), colour by risk tier. A dashed line marks "now", so events already behind us are obvious.
 */
export function EventTimeline({ events, now }: Props) {
  const plot = useMemo(() => {
    const pts = events
      .map((e) => ({ e, t: parseUtc(e.tca).getTime(), p: e.probability_of_collision }))
      .filter((d) => Number.isFinite(d.t) && d.p > 0)
    if (pts.length === 0) return null
    const nowMs = now.getTime()
    const ts = pts.map((d) => d.t)
    const t0 = Math.min(...ts, nowMs)
    const t1 = Math.max(...ts, nowMs)
    const pad = (t1 - t0) * 0.02 || 3_600_000
    const ps = pts.map((d) => d.p)
    const yLo = 10 ** Math.floor(Math.log10(Math.min(...ps)))
    const yHi = 10 ** Math.ceil(Math.log10(Math.max(...ps)))
    return { pts, t0: t0 - pad, t1: t1 + pad, yLo, yHi: yHi === yLo ? yLo * 10 : yHi, nowMs, skipped: events.length - pts.length }
  }, [events, now])

  if (!plot) return <EmptyState kind="none" title="No plottable events">Every event had a non-positive probability, which cannot be placed on a log axis.</EmptyState>

  const x = linearScale(plot.t0, plot.t1, PAD.l, W - PAD.r)
  const y = logScale(plot.yLo, plot.yHi, H - PAD.b, PAD.t)
  const yTicks = decadeTicks(plot.yLo, plot.yHi)

  return (
    <div className="timeline">
      <svg className="timeline__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Conjunction events over time, by probability of collision and risk tier">
        <rect className="timeline__plot" x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        {yTicks.map((v) => (
          <g key={v}>
            <line className="timeline__grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            <text className="timeline__tick" x={PAD.l - 5} y={y(v) + 3} textAnchor="end">{v.toExponential(0).replace('e+', 'e')}</text>
          </g>
        ))}
        {Array.from({ length: X_TICKS + 1 }, (_, k) => {
          const t = plot.t0 + (k / X_TICKS) * (plot.t1 - plot.t0)
          return <text key={k} className="timeline__tick" x={x(t)} y={H - 14} textAnchor={k === 0 ? 'start' : k === X_TICKS ? 'end' : 'middle'}>{formatShortUtc(t)}</text>
        })}
        <line className="timeline__now" x1={x(plot.nowMs)} x2={x(plot.nowMs)} y1={PAD.t} y2={H - PAD.b} />
        <text className="timeline__now-label" x={x(plot.nowMs) + 4} y={PAD.t + 10}>now</text>
        {plot.pts.map(({ e, t, p }) => (
          <circle key={`${e.sat1_id}|${e.sat2_id}|${e.tca}`} className={`timeline__dot timeline__dot--${riskTone(e.risk_level)}`} cx={x(t)} cy={y(p)} r={3.6}>
            <title>{`${e.risk_level}: ${e.sat1_name} × ${e.sat2_name}\nPc ${pc(p)} · miss ${compact(e.min_distance_km)} km\nTCA ${formatUtc(e.tca)}`}</title>
          </circle>
        ))}
        <text className="timeline__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 2} textAnchor="middle">time of closest approach (UTC)</text>
        <text className="timeline__unit" x={11} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 11 ${(PAD.t + H - PAD.b) / 2})`}>probability of collision</text>
      </svg>
      {plot.skipped > 0 ? <div className="timeline__note">{plot.skipped} event(s) with a non-positive probability are not plotted (no log).</div> : null}
    </div>
  )
}
