import { useMemo } from 'react'
import { useCatalogDistributions } from '@/hooks/useCatalogDistributions'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { StatisticsResponse, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { deriveSeries, summarizeCatalog } from '@/lib/catalog'
import { AGE_TONE_COLOR, ALTITUDE_BAND_COLOR, INCLINATION_COLOR } from '@/lib/chartColors'
import { countBy } from '@/lib/countBy'
import { fixed, integer, plural } from '@/lib/format'
import { topGroups, UNNAMED } from '@/lib/groups'
import { binGrid } from '@/lib/heatmap'
import type { GridSpec } from '@/lib/heatmap'
import { binLinear, binLog } from '@/lib/histogram'
import { ALTITUDE_BANDS, altitudeBand, INCLINATION_CLASSES, inclinationClass } from '@/lib/orbit'
import { ageVerdict, tleAgeTone } from '@/lib/tleAge'
import type { TleAgeTone } from '@/lib/tleAge'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { BarList } from '../../organisms/BarList/BarList'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { ChartLegend } from '../../organisms/ChartLegend/ChartLegend'
import { Histogram } from '../../organisms/Histogram/Histogram'
import { HeatmapChart } from '../../organisms/HeatmapChart/HeatmapChart'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { RegimeBreakdown } from '../../organisms/RegimeBreakdown/RegimeBreakdown'
import './AnalyticsView.css'

type Props = { catalog: AsyncResult<TleRecord[]>; stats: AsyncResult<StatisticsResponse>; totalCount: number | null; now: Date }

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

export function AnalyticsView({ catalog, stats, totalCount, now }: Props) {
  const rows = catalog.data
  // Whole-catalog counts from the server, so the regime share is not computed from the loaded slice alone.
  const server = useCatalogSummary(totalCount)
  // Every object, as raw columns. The charts are drawn from these when they arrive; until then (or if the request
  // fails) they fall back to the loaded rows, which are only the first N by name, and every chart's caption says which.
  const whole = useCatalogDistributions(totalCount)
  const chartRows = whole.rows && whole.rows.length > 0 ? whole.rows : rows
  const wholeCatalog = chartRows !== null && chartRows === whole.rows

  // Each chart type is chosen for the data it shows (see the ChartCard notes):
  //  regime share -> donut | constellation sizes -> bar | freshness, altitude, inclination, eccentricity -> histograms
  //  (altitude and eccentricity on log axes) | inclination x altitude -> heatmap (density, not an overplotted scatter).
  const model = useMemo(() => {
    if (!chartRows || chartRows.length === 0) return null
    const s = deriveSeries(chartRows, now)
    const summary = summarizeCatalog(chartRows, now)
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
  }, [chartRows, now])

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
        <EmptyState kind="none" title="Nothing to analyse">The catalog is empty. Load TLEs from the Data view.</EmptyState>
      </PageLayout>
    )
  }

  const s = stats.data?.statistics
  const hasStats = s && s.total_objects !== undefined
  const partial = totalCount !== null && totalCount > rows.length
  // Every chart except the regime donut is drawn from the loaded rows, which are the first ones the API returns (by name),
  // not a random sample. Say so on each chart, in view, rather than once in the page subtitle.
  const sampleScope = partial ? `First ${integer(rows.length)} of ${integer(totalCount)} objects (by name, not a random sample)` : `All ${integer(rows.length)} objects`
  const chartScope = wholeCatalog ? `All ${integer(chartRows.length)} objects` : sampleScope
  const wholeFailed = partial && !wholeCatalog && (whole.status === 'error' || whole.malformed)
  const regimeCounts = server.data ? server.data.by_regime : model.summary.regimes
  const regimeScope = server.data ? `All ${integer(server.data.total)} objects` : chartScope

  const ageSentence = ageVerdict(model.ageCounts, AGE_ORDER.reduce((n, t) => n + model.ageCounts[t], 0))
  return (
    <PageLayout>
      <SectionHeader
        title="Analytics"
        subtitle={wholeCatalog
          ? `All ${integer(chartRows.length)} stored objects.`
          : partial
            ? `The charts below are drawn from the first ${integer(rows.length)} objects only, so each says which objects it covers. The figures at the top cover all ${integer(totalCount)}.`
            : `${integer(rows.length)} objects.`}
      />

      {wholeFailed ? (
        <EmptyState kind="error" title="Whole-catalog charts unavailable" action={<Button onClick={whole.reload}>Retry</Button>}>
          {whole.malformed ? 'The server sent columns that do not line up, so they were not drawn' : whole.error?.message}. The charts below use only the first {integer(rows.length)} of {integer(totalCount)} objects (by name, not a random sample).
        </EmptyState>
      ) : null}

      {hasStats ? (
        <KpiRow
          items={[
            { label: 'Mean apogee', value: integer(s.apogee?.mean), unit: 'km' },
            { label: 'Median perigee', value: integer(s.perigee?.median), unit: 'km' },
            { label: 'Mean period', value: fixed(s.period_hours?.mean, 2), unit: 'h' },
            { label: 'Mean inclination', value: fixed(s.inclination?.mean, 1), unit: '°' },
          ]}
        />
      ) : stats.status === 'error' ? (
        <EmptyState kind="error" title="Server statistics unavailable" action={<Button onClick={stats.reload}>Retry</Button>}>{stats.error.message}. The charts below are computed in the browser and are unaffected.</EmptyState>
      ) : (
        <EmptyState kind="awaiting" title="Computing server statistics…" />
      )}

      <div className="analytics__grid">
        <ChartCard title="Orbit regime share" scope={regimeScope} note="Four parts of one whole, so a donut. Classified from perigee, apogee and eccentricity; derived, not stored.">
          <RegimeBreakdown counts={regimeCounts} />
        </ChartCard>

        <ChartCard title="Largest constellations" scope={chartScope} note="Grouped by the first word of the object name: a naming heuristic, not an ownership record. Comparing categories, so bars.">
          <BarList
            ariaLabel="Objects by constellation name"
            // One neutral colour: the names label the categories, and the categorical hues already mean orbit regime elsewhere
            // on this page (one colour, one meaning; audit 2026-11-15, Analytics).
            items={model.groups.map((g) => ({ label: g.label, value: g.count, color: g.label === 'Other' || g.label === UNNAMED ? 'var(--text-tertiary)' : 'var(--chart-1)', title: g.label === UNNAMED ? 'Objects named only by their international designator, such as 2021-050D' : undefined }))}
          />
        </ChartCard>

        <ChartCard title="How fresh is the catalog" scope={chartScope} note="Age of each element set, coloured as the TLE age chips are. Older sets propagate less accurately.">
          {ageSentence ? <p className="analytics__verdict">{ageSentence}</p> : null}
          <Histogram bins={model.age.bins} unit="days since TLE epoch" ariaLabel="Histogram of TLE age" colorOf={(b) => AGE_TONE_COLOR[tleAgeTone(mid(b))]} />
          <ChartLegend items={AGE_ORDER.map((t) => ({ label: AGE_LABEL[t], color: AGE_TONE_COLOR[t], value: integer(model.ageCounts[t]) }))} />
        </ChartCard>

        <ChartCard title="Altitude" scope={chartScope} note="Log axis: altitude runs from about 170 km to over 200,000 km, which a linear axis would crush into one bar. Derived from mean motion.">
          <Histogram bins={model.alt.bins} unit="mean altitude (km, log scale)" ariaLabel="Histogram of mean altitude on a log axis" colorOf={(b) => ALTITUDE_BAND_COLOR[altitudeBand(geoMid(b))]} />
          <ChartLegend items={ALTITUDE_BANDS.map((b) => ({ label: BAND_LABEL[b], color: ALTITUDE_BAND_COLOR[b], value: integer(model.altCounts[b]) }))} />
        </ChartCard>

        <ChartCard title="Inclination" scope={chartScope} note="Read directly from the TLE. The tall spikes are constellations: Starlink near 53°, sun-synchronous orbits near 97–98°, GEO near 0°.">
          <Histogram bins={model.incl.bins} unit="inclination (°)" ariaLabel="Histogram of inclination" colorOf={(b) => INCLINATION_COLOR[inclinationClass(mid(b))]} formatTick={(v) => `${Math.round(v)}°`} />
          <ChartLegend items={INCLINATION_CLASSES.map((c) => ({ label: c.label, color: INCLINATION_COLOR[c.id], value: integer(model.inclCounts[c.id]) }))} />
        </ChartCard>

        <ChartCard
          title="Eccentricity"
          scope={chartScope}
          note={`Log axis: nearly every orbit is close to circular.${model.ecc.unplottable > 0 ? ` ${plural(model.ecc.unplottable, 'object')} ${model.ecc.unplottable === 1 ? 'has' : 'have'} e = 0 exactly and cannot be placed on a log axis.` : ''}`}
        >
          <Histogram bins={model.ecc.bins} unit="eccentricity (log scale)" ariaLabel="Histogram of eccentricity on a log axis" colorOf={(b) => ECC_COLOR[eccClass(geoMid(b))]} formatTick={(v) => v.toExponential(0).replace('e+', 'e')} />
          <ChartLegend items={ECC_ORDER.map((c) => ({ label: ECC_LABEL[c], color: ECC_COLOR[c], value: integer(model.eccCounts[c]) }))} />
        </ChartCard>

        <div className="analytics__wide">
          <ChartCard
            title="Where objects live: inclination × altitude"
            scope={chartScope}
            note={`Density heatmap, because thousands of points overplot in a scatter. Brighter = more objects per cell (log colour scale). ${integer(model.heat.total)} plotted${model.heat.outside > 0 ? `, ${integer(model.heat.outside)} outside the 100 km to 1,000,000 km range` : ''}${model.heat.unplottable > 0 ? `, ${integer(model.heat.unplottable)} not placeable` : ''}.`}
          >
            <HeatmapChart grid={model.heat} spec={HEAT_SPEC} xUnit="inclination (°)" yUnit="mean altitude (km, log)" ariaLabel="Density heatmap of inclination against mean altitude" />
          </ChartCard>
        </div>
      </div>
    </PageLayout>
  )
}
