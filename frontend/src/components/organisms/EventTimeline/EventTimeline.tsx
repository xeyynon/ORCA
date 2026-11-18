import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { cx } from '@/lib/cx'
import { compact, pc, plural, powerOfTen } from '@/lib/format'
import { pairKey } from '@/lib/pair'
import { riskTone } from '@/lib/risk'
import { decadeTicks, linearScale, logScale } from '@/lib/scale'
import { formatShortUtc, formatUtc, parseUtc } from '@/lib/time'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import './EventTimeline.css'

type Props = {
  events: readonly ConjunctionEvent[]
  now: Date
  /** When given, a point is a button that selects its pair (the same selection as a table row). */
  selectedKey?: string | null
  onSelect?: (e: ConjunctionEvent) => void
}

/** Width before the first measurement, and the narrowest the drawing goes. */
const FALLBACK_W = 760
const MIN_W = 280
// 160 (was 220): the points sit in a narrow band, so the extra height was empty space (declutter plan 2026-11-15).
// A phone gets a little more, since its plot is narrow and the points crowd.
const heightFor = (w: number) => (w < 520 ? 190 : 160)
const PAD = { l: 52, r: 14, t: 10, b: 30 }
/** About one time label per 110 px, so labels never overlap on a phone; at most 5 gaps. */
const xTickCount = (plotW: number) => Math.max(2, Math.min(5, Math.floor(plotW / 110)))
/** Radius of the invisible circle that takes a tap or click around each dot: 24 px across, the target floor. */
const HIT_R = 12

/**
 * When the events happen and how risky each is: time on x, probability of collision on a log y axis (it spans
 * many decades), colour by risk tier. A dashed line marks "now", so events already behind us are obvious.
 *
 * The drawing is sized from its container (audit 2026-11-18 #14): one viewBox unit is one CSS pixel, so its text stays
 * 11 px on a phone instead of shrinking with the picture. The points are one tab stop: Tab reaches the chart, the arrow
 * keys move between points in time order, Enter or Space opens that pair.
 */
export function EventTimeline({ events, now, selectedKey = null, onSelect }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(FALLBACK_W)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => { if (el.clientWidth > 0) setWidth(Math.max(MIN_W, Math.round(el.clientWidth))) }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const plot = useMemo(() => {
    const pts = events
      .map((e) => ({ e, key: pairKey(e), t: parseUtc(e.tca).getTime(), p: e.probability_of_collision }))
      .filter((d) => Number.isFinite(d.t) && d.p > 0)
      .sort((a, b) => a.t - b.t || b.p - a.p)
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

  // The one point that holds the tab stop: the last one moved to, else the selected pair, else the earliest.
  const tabKey = useMemo(() => {
    if (!plot) return null
    const has = (k: string | null) => k !== null && plot.pts.some((d) => d.key === k)
    return has(activeKey) ? activeKey : has(selectedKey) ? selectedKey : plot.pts[0].key
  }, [plot, activeKey, selectedKey])

  if (!plot) return <EmptyState kind="none" title="There are no events to plot">Every event has a probability of zero or less, and those can’t be shown on a log axis.</EmptyState>

  const W = width
  const H = heightFor(W)
  const x = linearScale(plot.t0, plot.t1, PAD.l, W - PAD.r)
  const y = logScale(plot.yLo, plot.yHi, H - PAD.b, PAD.t)
  const yTicks = decadeTicks(plot.yLo, plot.yHi)
  const xTicks = xTickCount(W - PAD.l - PAD.r)
  const pickable = onSelect !== undefined

  const moveFocus = (ev: KeyboardEvent<SVGGElement>, i: number) => {
    const last = plot.pts.length - 1
    const to = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? Math.min(last, i + 1)
      : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? Math.max(0, i - 1)
        : ev.key === 'Home' ? 0
          : ev.key === 'End' ? last
            : null
    if (to === null) return false
    ev.preventDefault()
    setActiveKey(plot.pts[to].key)
    svgRef.current?.querySelectorAll<SVGGElement>('[data-point]')[to]?.focus()
    return true
  }

  return (
    <div className="timeline" ref={boxRef}>
      <svg
        ref={svgRef}
        className="timeline__svg"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role={pickable ? 'group' : 'img'}
        aria-label={`Conjunction events over time, by probability of collision and risk tier${pickable ? '. Use the arrow keys to move between points, and Enter to open one.' : ''}`}
      >
        <rect className="timeline__plot" x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        {yTicks.map((v) => (
          <g key={v} aria-hidden="true">
            <line className="timeline__grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            {/* Written as the table writes Pc ("10⁻⁴"), not "1e-4" (audit 2026-11-18 #25). */}
            <text className="timeline__tick" x={PAD.l - 5} y={y(v) + 4} textAnchor="end">{powerOfTen(Math.round(Math.log10(v)))}</text>
          </g>
        ))}
        <g aria-hidden="true">
          {Array.from({ length: xTicks + 1 }, (_, k) => {
            const t = plot.t0 + (k / xTicks) * (plot.t1 - plot.t0)
            return <text key={k} className="timeline__tick" x={x(t)} y={H - 14} textAnchor={k === 0 ? 'start' : k === xTicks ? 'end' : 'middle'}>{formatShortUtc(t)}</text>
          })}
          <line className="timeline__now" x1={x(plot.nowMs)} x2={x(plot.nowMs)} y1={PAD.t} y2={H - PAD.b} />
          <text className="timeline__now-label" x={x(plot.nowMs) + 4} y={PAD.t + 10}>now</text>
        </g>
        {/* The tap targets first, in a layer under every dot: a 24 px circle around each point catches a finger or a
            near miss, while a visible dot always stays clickable even where targets overlap. */}
        {pickable ? (
          <g aria-hidden="true">
            {plot.pts.map(({ e, key, t, p }) => (
              <circle key={key} className="timeline__hit" cx={x(t)} cy={y(p)} r={HIT_R} onClick={() => { setActiveKey(key); onSelect(e) }} />
            ))}
          </g>
        ) : null}
        {plot.pts.map(({ e, key, t, p }, i) => {
          const label = `${e.risk_level}: ${e.sat1_name} × ${e.sat2_name}`
          const tip = `${label}\nPc of ${pc(p)} · Miss distance of ${compact(e.min_distance_km)} km\nClosest approach at ${formatUtc(e.tca)}`
          const selected = key === selectedKey
          const dot = <circle className={cx('timeline__dot', `timeline__dot--${riskTone(e.risk_level)}`, selected && 'timeline__dot--selected')} cx={x(t)} cy={y(p)} r={selected ? 5.2 : 3.6} />
          if (!pickable) return <g key={key}>{dot}<title>{tip}</title></g>
          const pick = () => { setActiveKey(key); onSelect(e) }
          return (
            <g
              key={key}
              data-point=""
              className="timeline__point"
              role="button"
              tabIndex={key === tabKey ? 0 : -1}
              aria-label={`${label}. Pc ${pc(p)}, closest approach ${formatUtc(e.tca)}. Show details.`}
              aria-current={selected ? 'true' : undefined}
              onClick={pick}
              onFocus={() => setActiveKey(key)}
              onKeyDown={(ev) => {
                if (moveFocus(ev, i)) return
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick() }
              }}
            >
              {dot}
              <title>{tip}</title>
            </g>
          )
        })}
        <g aria-hidden="true">
          <text className="timeline__unit" x={(PAD.l + W - PAD.r) / 2} y={H - 2} textAnchor="middle">time of closest approach (UTC)</text>
          <text className="timeline__unit" x={11} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 11 ${(PAD.t + H - PAD.b) / 2})`}>probability of collision</text>
        </g>
      </svg>
      {plot.skipped > 0 ? <div className="timeline__note">{plural(plot.skipped, 'event')} with a probability of zero or less {plot.skipped === 1 ? 'is' : 'are'} not shown, because a log axis can’t place {plot.skipped === 1 ? 'it' : 'them'}.</div> : null}
    </div>
  )
}
