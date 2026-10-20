import { useMemo } from 'react'
import type { FetchOutcome, StatisticsResponse, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { deriveSeries, summarizeCatalog } from '@/lib/catalog'
import { whyCatalogEmpty } from '@/lib/catalogState'
import { AGE_TONE_COLOR, ALTITUDE_BAND_COLOR, catColor, INCLINATION_COLOR } from '@/lib/chartColors'
import { countBy } from '@/lib/countBy'
import { fixed, integer } from '@/lib/format'
import { topGroups, UNNAMED } from '@/lib/groups'
import { binGrid } from '@/lib/heatmap'
import type { GridSpec } from '@/lib/heatmap'
import { binLinear, binLog } from '@/lib/histogram'
import { ALTITUDE_BANDS, altitudeBand, INCLINATION_CLASSES, inclinationClass } from '@/lib/orbit'
import { tleAgeTone } from '@/lib/tleAge'
import type { TleAgeTone } from '@/lib/tleAge'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { BarList } from '../../organisms/BarList/BarList'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { ChartLegend } from '../../organisms/ChartLegend/ChartLegend'
import { EmptyCatalog } from '../../organisms/EmptyCatalog/EmptyCatalog'
import { Histogram } from '../../organisms/Histogram/Histogram'
import { HeatmapChart } from '../../organisms/HeatmapChart/HeatmapChart'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { RegimeBreakdown } from '../../organisms/RegimeBreakdown/RegimeBreakdown'
import './AnalyticsView.css'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  stats: AsyncResult<StatisticsResponse>
  totalCount: number | null
  /** The API's record of its last Celestrak fetch, so an empty catalog is explained by what actually happened. */
  lastFetch: FetchOutcome | null | undefined
  onGoData: () => void
  now: Date
}

const BAND_LABEL = { LEO: 'LEO (<2,000 km)', MEO: 'MEO (2,000–35,300 km)', GEO: 'GEO (≈35,786 km)', BEYOND: 'Beyond GEO' } as const
const AGE_ORDER: readonly TleAgeTone[] = ['ok', 'warn', 'bad']
const AGE_LABEL: Record<TleAgeTone, string> = { ok: 'Fresh (<7 days)', warn: 'Aging (7–30 days)', bad: 'Stale (≥30 days)' }
const ECC_ORDER = ['circular', 'elliptical', 'high'] as const
type EccClass = (typeof ECC_ORDER)[number]
const ECC_LABEL: Record<EccClass, string> = { circular: 'Near-circular (e < 0.01)', elliptical: 'Elliptical (0.01–0.25)', high: 'Highly elliptical (≥ 0.25)' }
const ECC_COLOR: Record<EccClass, string> = { circular: 'var(--cat-1)', elliptical: 'var(--cat-2)', high: 'var(--cat-5)' }
const eccClass = (e: number): EccClass => (e < 0.01 ? 'circular' : e < 0.25 ? 'elliptical' : 'high')

/** Altitude spans ~170 to 240,000+ km: a log axis (below) and a log y in the heatmap keep every regime visible. */
const HEAT_SPEC: GridSpec = { xMin: 0, xMax: 180, xBins: 36, yMin: 100, yMax: 1_000_000, yBins: 24, yLog: true }

const mid = (b: { x0: number; x1: number }) => (b.x0 + b.x1) / 2
const geoMid = (b: { x0: number; x1: number }) => Math.sqrt(b.x0 * b.x1)

export function AnalyticsView({ catalog, stats, totalCount, lastFetch, onGoData, now }: Props) {
  const rows = catalog.data

  // Each chart type is chosen for the data it shows (see the ChartCard notes):
  //  regime share -> donut | constellation sizes -> bar | freshness, altitude, inclination, eccentricity -> histograms
  //  (altitude and eccentricity on log axes) | inclination x altitude -> heatmap (density, not an overplotted scatter).
  const model = useMemo(() => {
    if (!rows || rows.length === 0) return null
    const s = deriveSeries(rows, now)
    const summary = summarizeCatalog(rows, now)
    const maxAge = s.ageDays.length ? Math.max(...s.ageDays) : 1
    return {
      summary,
      groups: topGroups(s.names, 8),
      age: binLinear(s.ageDays, { min: 0, max: Math.max(1, Math.ceil(maxAge)), binCount: 24 }),
      ageCounts: countBy(s.ageDays, AGE_ORDER, tleAgeTone),
      alt: binLog(s.altKm, 28),
      altCounts: countBy(s.altKm, ALTITUDE_BANDS, altitudeBand),
      incl: binLinear(s.inclDeg, { min: 0, max: 180, binCount: 36 }),
      inclCounts: countBy(s.inclDeg, INCLINATION_CLASSES.map((c) => c.id), inclinationClass),
      ecc: binLog(s.ecc, 24),
      eccCounts: countBy(s.ecc, ECC_ORDER, eccClass),
      heat: binGrid(s.points, HEAT_SPEC),
    }
  }, [rows, now])

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
  if (!model) {
    return (
      <PageLayout>
        <SectionHeader title="Analytics" />
        <EmptyCatalog cause={whyCatalogEmpty(lastFetch)} onGoData={onGoData} />
      </PageLayout>
    )
  }

  const s = stats.data?.statistics
  const hasStats = s && s.total_objects !== undefined
  const partial = totalCount !== null && totalCount > rows.length

  return (
    <PageLayout>
      <SectionHeader
        title="Analytics"
        subtitle={partial
          ? `The charts show ${integer(rows.length)} of ${integer(totalCount)} objects. The summary figures cover all ${integer(totalCount)}.`
          : `${integer(rows.length)} objects in the catalog.`}
      />

      {hasStats ? (
        <KpiRow
          items={[
            { label: 'Mean apogee', value: fixed(s.apogee?.mean, 0), unit: 'km' },
            { label: 'Median perigee', value: fixed(s.perigee?.median, 0), unit: 'km' },
            { label: 'Mean period', value: fixed(s.period_hours?.mean, 2), unit: 'h' },
            { label: 'Mean inclination', value: fixed(s.inclination?.mean, 1), unit: '°' },
          ]}
        />
      ) : stats.status === 'error' ? (
        <EmptyState kind="error" title="Summary figures unavailable" action={<Button onClick={stats.reload}>Retry</Button>}>{stats.error.message}. The charts below do not depend on them and are still shown.</EmptyState>
      ) : (
        <EmptyState kind="awaiting" title="Loading summary figures…" />
      )}

      <div className="analytics__grid">
        <ChartCard title="Orbit regime share" note="How the catalog splits by orbit class. Each object's class is worked out from its lowest and highest altitude and its eccentricity.">
          <RegimeBreakdown counts={model.summary.regimes} />
        </ChartCard>

        <ChartCard title="Largest constellations" note="Objects grouped by the first word of their name. This is a rough guide to constellations, not a record of who owns what.">
          <BarList
            ariaLabel="Objects by constellation name"
            items={model.groups.map((g, i) => ({ label: g.label, value: g.count, color: g.label === 'Other' || g.label === UNNAMED ? 'var(--text-tertiary)' : catColor(i) }))}
          />
        </ChartCard>

        <ChartCard title="How fresh is the catalog" note="How old each TLE is, coloured like the age labels elsewhere in the app. Older TLEs give less accurate positions.">
          <Histogram bins={model.age.bins} unit="days since TLE epoch" ariaLabel="Histogram of TLE age" colorOf={(b) => AGE_TONE_COLOR[tleAgeTone(mid(b))]} />
          <ChartLegend items={AGE_ORDER.map((t) => ({ label: AGE_LABEL[t], color: AGE_TONE_COLOR[t], value: integer(model.ageCounts[t]) }))} />
        </ChartCard>

        <ChartCard title="Altitude" note="Altitude is on a log scale because objects range from about 170 km to over 200,000 km, and a plain scale would squash almost all of them into one bar. Worked out from each object's orbital period.">
          <Histogram bins={model.alt.bins} unit="mean altitude (km, log scale)" ariaLabel="Histogram of mean altitude on a log axis" colorOf={(b) => ALTITUDE_BAND_COLOR[altitudeBand(geoMid(b))]} />
          <ChartLegend items={ALTITUDE_BANDS.map((b) => ({ label: BAND_LABEL[b], color: ALTITUDE_BAND_COLOR[b], value: integer(model.altCounts[b]) }))} />
        </ChartCard>

        <ChartCard title="Inclination" note="Taken straight from the TLE. The tall bars are constellations: Starlink near 53°, sun-synchronous satellites near 97–98°, and geostationary objects near 0°.">
          <Histogram bins={model.incl.bins} unit="inclination (°)" ariaLabel="Histogram of inclination" colorOf={(b) => INCLINATION_COLOR[inclinationClass(mid(b))]} formatTick={(v) => `${Math.round(v)}°`} />
          <ChartLegend items={INCLINATION_CLASSES.map((c) => ({ label: c.label, color: INCLINATION_COLOR[c.id], value: integer(model.inclCounts[c.id]) }))} />
        </ChartCard>

        <ChartCard
          title="Eccentricity"
          note={`Log scale. Nearly every orbit is close to circular.${model.ecc.unplottable > 0 ? ` ${integer(model.ecc.unplottable)} ${model.ecc.unplottable === 1 ? 'object has' : 'objects have'} an eccentricity of exactly 0, which a log scale cannot show.` : ''}`}
        >
          <Histogram bins={model.ecc.bins} unit="eccentricity (log scale)" ariaLabel="Histogram of eccentricity on a log axis" colorOf={(b) => ECC_COLOR[eccClass(geoMid(b))]} formatTick={(v) => v.toExponential(0).replace('e+', 'e')} />
          <ChartLegend items={ECC_ORDER.map((c) => ({ label: ECC_LABEL[c], color: ECC_COLOR[c], value: integer(model.eccCounts[c]) }))} />
        </ChartCard>

        <div className="analytics__wide">
          <ChartCard
            title="Inclination against altitude"
            note={`Each cell counts the objects at that inclination and altitude. Brighter means more (log colour scale). ${integer(model.heat.total)} plotted${model.heat.outside > 0 ? `, ${integer(model.heat.outside)} outside the 100 km to 1,000,000 km range` : ''}${model.heat.unplottable > 0 ? `, ${integer(model.heat.unplottable)} could not be placed` : ''}.`}
          >
            <HeatmapChart grid={model.heat} spec={HEAT_SPEC} xUnit="inclination (°)" yUnit="mean altitude (km, log)" ariaLabel="Density heatmap of inclination against mean altitude" />
          </ChartCard>
        </div>
      </div>
    </PageLayout>
  )
}
