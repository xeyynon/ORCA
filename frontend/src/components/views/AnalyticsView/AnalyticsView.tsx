import { useMemo } from 'react'
import type { StatisticsResponse, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { fixed, integer } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { Histogram } from '../../organisms/Histogram/Histogram'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { ScatterPlot } from '../../organisms/ScatterPlot/ScatterPlot'
import './AnalyticsView.css'

type Props = { catalog: AsyncResult<TleRecord[]>; stats: AsyncResult<StatisticsResponse> }

export function AnalyticsView({ catalog, stats }: Props) {
  const rows = catalog.data

  const derived = useMemo(() => {
    const alt: number[] = [], period: number[] = [], incl: number[] = [], ecc: number[] = []
    const points: { x: number; y: number; label: string }[] = []
    for (const t of rows ?? []) {
      incl.push(t.inclination)
      ecc.push(t.eccentricity)
      const o = deriveOrbit(t)
      if (!o) continue
      alt.push(o.meanAltKm)
      period.push(o.periodMinutes)
      points.push({ x: t.inclination, y: o.meanAltKm, label: `${t.object_name}: ${o.meanAltKm.toFixed(0)} km, ${t.inclination.toFixed(1)}°` })
    }
    return { alt, period, incl, ecc, points }
  }, [rows])

  if (!rows) {
    return (
      <PageLayout>
        <SectionHeader title="Analytics" />
        {catalog.status === 'error'
          ? <EmptyState kind="error" title="Could not load the catalog" action={<Button onClick={catalog.reload}>Retry</Button>}>{catalog.error.message}</EmptyState>
          : <EmptyState kind="awaiting" title="Loading catalog…" />}
      </PageLayout>
    )
  }
  if (rows.length === 0) {
    return (
      <PageLayout>
        <SectionHeader title="Analytics" />
        <EmptyState kind="none" title="Nothing to analyse">The catalog is empty. Load TLEs from the Data view.</EmptyState>
      </PageLayout>
    )
  }

  const s = stats.data?.statistics
  const hasStats = s && s.total_objects !== undefined

  return (
    <PageLayout>
      <SectionHeader title="Analytics" subtitle={`Distributions over ${integer(rows.length)} stored objects.`} />

      {hasStats ? (
        <KpiRow
          items={[
            { label: 'Mean apogee', value: fixed(s.apogee?.mean, 0), unit: 'km', hint: 'server, /api/statistics' },
            { label: 'Median perigee', value: fixed(s.perigee?.median, 0), unit: 'km', hint: 'server, /api/statistics' },
            { label: 'Mean period', value: fixed(s.period_hours?.mean, 2), unit: 'h', hint: 'server, /api/statistics' },
            { label: 'Mean inclination', value: fixed(s.inclination?.mean, 1), unit: '°', hint: 'server, /api/statistics' },
          ]}
        />
      ) : stats.status === 'error' ? (
        <EmptyState kind="error" title="Server statistics unavailable" action={<Button onClick={stats.reload}>Retry</Button>}>{stats.error.message}. The charts below are computed in the browser and are unaffected.</EmptyState>
      ) : (
        <EmptyState kind="awaiting" title="Computing server statistics…" />
      )}

      <div className="analytics__grid">
        <ChartCard title="Mean altitude" note="Derived from TLE mean motion via Kepler's third law."><Histogram values={derived.alt} unit="km" ariaLabel="Histogram of mean altitude" /></ChartCard>
        <ChartCard title="Inclination" note="Read directly from the TLE (degrees)."><Histogram values={derived.incl} unit="°" ariaLabel="Histogram of inclination" digits={1} /></ChartCard>
        <ChartCard title="Eccentricity" note="Read directly from the TLE."><Histogram values={derived.ecc} unit="e" ariaLabel="Histogram of eccentricity" digits={3} /></ChartCard>
        <ChartCard title="Orbital period" note="1440 / mean motion (rev/day)."><Histogram values={derived.period} unit="min" ariaLabel="Histogram of orbital period" /></ChartCard>
        <ChartCard title="Altitude vs inclination" note="One point per object; hover for the name."><ScatterPlot points={derived.points} xUnit="inclination (°)" yUnit="altitude (km)" ariaLabel="Scatter of mean altitude against inclination" /></ChartCard>
      </div>
    </PageLayout>
  )
}
