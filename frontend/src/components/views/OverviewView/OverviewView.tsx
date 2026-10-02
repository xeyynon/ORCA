import { useMemo } from 'react'
import type { TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { deriveSeries } from '@/lib/catalog'
import type { CatalogSummary } from '@/lib/catalog'
import { days, fixed, integer } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { CatalogTable } from '../../organisms/CatalogTable/CatalogTable'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { ObjectStanding } from '../../organisms/ObjectStanding/ObjectStanding'
import type { CatalogRanks } from '../../organisms/ObjectStanding/ObjectStanding'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { RegimeBreakdown } from '../../organisms/RegimeBreakdown/RegimeBreakdown'
import './OverviewView.css'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  summary: CatalogSummary | null
  /** Objects stored by the API. Can exceed the loaded subset (the API returns at most 5,000 per request). */
  totalCount: number | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpenGlobe: (id: string) => void
  onGoData: () => void
  now: Date
}

function loadedHint(summary: CatalogSummary, totalCount: number | null): string {
  if (totalCount !== null && totalCount > summary.count) return `${integer(summary.count)} loaded here (API returns up to 5,000)`
  return summary.unclassified ? `${integer(summary.unclassified)} could not be classified` : 'all classified'
}

export function OverviewView({ catalog, summary, totalCount, selectedId, onSelect, onOpenGlobe, onGoData, now }: Props) {
  const rows = catalog.data
  const selected = rows?.find((t) => t.norad_cat_id === selectedId) ?? null
  const ranks = useMemo<CatalogRanks | null>(() => {
    if (!rows || rows.length === 0) return null
    const s = deriveSeries(rows, now)
    const asc = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)
    return { altKm: asc(s.altKm), inclDeg: asc(s.inclDeg), ecc: asc(s.ecc), ageDays: asc(s.ageDays) }
  }, [rows, now])

  let body
  if (!rows && catalog.status === 'error') {
    body = <EmptyState kind="error" title="Could not load the catalog" action={<Button onClick={catalog.reload}>Retry</Button>}>{catalog.error.message}</EmptyState>
  } else if (!rows) {
    body = <EmptyState kind="awaiting" title="Loading catalog…" />
  } else if (rows.length === 0) {
    body = (
      <EmptyState kind="none" title="The catalog is empty" action={<Button variant="primary" onClick={onGoData}>Go to Data</Button>}>
        No TLEs are stored. This is what an empty database looks like, and also what a failed Celestrak fetch looks like, because the API reports both as an empty list.
      </EmptyState>
    )
  } else {
    body = (
      <>
        {summary ? (
          <KpiRow
            items={[
              { label: 'Objects', value: integer(totalCount ?? summary.count), hint: loadedHint(summary, totalCount) },
              { label: 'Newest TLE', value: summary.newestAgeDays === null ? '—' : days(summary.newestAgeDays), hint: summary.futureEpochs > 0 ? `${integer(summary.futureEpochs)} epoch(s) ahead of this clock excluded` : 'age of the freshest element set' },
              { label: 'Median TLE age', value: summary.medianAgeDays === null ? '—' : days(summary.medianAgeDays), hint: 'typical element-set age' },
              { label: 'Oldest TLE', value: summary.oldestAgeDays === null ? '—' : days(summary.oldestAgeDays), hint: 'older sets propagate less accurately' },
              { label: 'Median altitude', value: fixed(summary.medianAltKm, 0), unit: 'km', hint: 'derived from mean motion' },
            ]}
          />
        ) : null}
        <div className={selected ? 'overview__grid overview__grid--split' : 'overview__grid'}>
          <div className="overview__main">
            <CatalogTable rows={rows} totalCount={totalCount} selectedId={selectedId} onSelect={onSelect} now={now} />
          </div>
          <div className="overview__side">
            {selected ? (
              <>
                <ObjectCard tle={selected} position={null} now={now} onClose={() => onSelect(null)} />
                <Button variant="primary" onClick={() => onOpenGlobe(selected.norad_cat_id)}>Show on globe</Button>
                {ranks ? <ObjectStanding tle={selected} ranks={ranks} now={now} /> : null}
              </>
            ) : null}
            {summary ? (
              <ChartCard title="Whole catalog by regime" note={`Classified from perigee/apogee altitude and eccentricity. Derived, not stored.${totalCount !== null && totalCount > rows.length ? ` Counts cover the ${integer(rows.length)} loaded objects.` : ''}`}>
                <RegimeBreakdown counts={summary.regimes} />
              </ChartCard>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  return (
    <PageLayout>
      <SectionHeader title="Catalog overview" subtitle="Orbital element sets stored by the API, with their age." />
      {body}
    </PageLayout>
  )
}
