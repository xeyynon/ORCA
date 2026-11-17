import { useMemo, useState } from 'react'
import type { TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { deriveSeries } from '@/lib/catalog'
import { describeFilter, filterCatalog, isFilterActive, NO_FILTER, regimeCounts, toggleRegime } from '@/lib/catalogFilter'
import type { CatalogFilter } from '@/lib/catalogFilter'
import type { CatalogSummary } from '@/lib/catalog'
import { days, integer, plural } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { CatalogFilterBar } from '../../organisms/CatalogFilterBar/CatalogFilterBar'
import { CatalogTable } from '../../organisms/CatalogTable/CatalogTable'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { ObjectStanding } from '../../organisms/ObjectStanding/ObjectStanding'
import type { CatalogRanks } from '../../organisms/ObjectStanding/ObjectStanding'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
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

/** The KPI captions, shown with skeletons while the catalog loads. Same order and words as the loaded row below. */
const KPI_CAPTIONS = ['Objects', 'TLE age (median)', 'Median altitude'] as const

/** The loaded-subset limit is said once, by the filter bar; this hint only covers classification. */
function objectsHint(summary: CatalogSummary): string {
  return summary.unclassified ? `${integer(summary.unclassified)} couldn’t be classified` : 'all classified'
}

/** Newest and oldest in one hint: three cards for one fact (TLE age) were two too many (declutter plan 2026-11-15). */
function ageHint(summary: CatalogSummary): string {
  const parts = [
    summary.newestAgeDays === null ? null : `Newest is ${summary.newestAgeDays.toFixed(1)} days old`,
    summary.oldestAgeDays === null ? null : `Oldest is ${summary.oldestAgeDays.toFixed(1)} days old`,
    summary.futureEpochs > 0 ? `Excluded ${plural(summary.futureEpochs, 'future epoch')}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Typical age of the orbital data'
}

export function OverviewView({ catalog, summary, totalCount, selectedId, onSelect, onOpenGlobe, onGoData, now }: Props) {
  const rows = catalog.data
  const [filter, setFilter] = useState<CatalogFilter>(NO_FILTER)
  const filterOn = isFilterActive(filter)
  const filteredRows = useMemo(() => (rows ? filterCatalog(rows, filter) : []), [rows, filter])
  const counts = useMemo(() => regimeCounts(rows ?? [], filter.query), [rows, filter.query])
  const selected = rows?.find((t) => t.norad_cat_id === selectedId) ?? null
  const ranks = useMemo<CatalogRanks | null>(() => {
    if (!rows || rows.length === 0) return null
    const s = deriveSeries(rows, now)
    const asc = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)
    return { altKm: asc(s.altKm), inclDeg: asc(s.inclDeg), ecc: asc(s.ecc), ageDays: asc(s.ageDays) }
  }, [rows, now])

  let body
  if (!rows && catalog.status === 'error') {
    body = <EmptyState kind="error" title="We couldn’t load the catalog" action={<Button onClick={catalog.reload}>Retry</Button>}>{catalog.error.message}</EmptyState>
  } else if (!rows) {
    // The figures wait in their own places (skeletons, never 0); the labelled loader below is for the table section.
    body = (
      <>
        <KpiRow loading items={KPI_CAPTIONS.map((label) => ({ label, value: '' }))} />
        <EmptyState kind="awaiting" title="Loading the catalog…" />
      </>
    )
  } else if (rows.length === 0) {
    body = (
      <EmptyState kind="none" title="The catalog is empty" action={<Button variant="primary" onClick={onGoData}>Go to Data</Button>}>
        There are no TLEs stored. An empty database looks like this, and so does a failed Celestrak fetch, because the API reports both as an empty list.
      </EmptyState>
    )
  } else {
    body = (
      <>
        {summary ? (
          <KpiRow
            items={[
              { label: 'Objects', value: integer(totalCount ?? summary.count), hint: objectsHint(summary) },
              { label: 'TLE age (median)', value: summary.medianAgeDays === null ? '—' : days(summary.medianAgeDays), hint: ageHint(summary) },
              { label: 'Median altitude', value: integer(summary.medianAltKm), unit: 'km', hint: 'worked out from mean motion' },
            ]}
          />
        ) : null}
        <div className={selected ? 'overview__grid overview__grid--split' : 'overview__grid'}>
          <div className="overview__main">
            <CatalogFilterBar
              query={filter.query}
              regimes={filter.regimes}
              counts={counts}
              active={filterOn}
              matchCount={filteredRows.length}
              loadedCount={rows.length}
              totalCount={totalCount}
              onQueryChange={(query) => setFilter((f) => ({ ...f, query }))}
              onToggleRegime={(r) => setFilter((f) => ({ ...f, regimes: toggleRegime(f.regimes, r) }))}
              onClear={() => setFilter(NO_FILTER)}
            />
            {filteredRows.length === 0 ? (
              <EmptyState kind="none" title="None of the loaded objects match" action={<Button onClick={() => setFilter(NO_FILTER)}>Clear filter</Button>}>
                None of the {integer(rows.length)} loaded objects has {describeFilter(filter)}.
                {totalCount !== null && totalCount > rows.length ? ' Objects that weren’t loaded aren’t searched here.' : ''}
              </EmptyState>
            ) : (
              <CatalogTable rows={filteredRows} selectedId={selectedId} onSelect={onSelect} now={now} />
            )}
          </div>
          {/* The object card only. The regime donut that sat here repeated the regime chips' counts above the table, and
              stretched across the page when nothing was selected (owner, 2026-11-15); Analytics keeps the regime chart. */}
          {selected ? (
            <div className="overview__side">
              <ObjectCard tle={selected} position={null} now={now} onClose={() => onSelect(null)} />
              <Button variant="primary" onClick={() => onOpenGlobe(selected.norad_cat_id)}>Show on globe</Button>
              {ranks ? <ObjectStanding tle={selected} ranks={ranks} now={now} /> : null}
            </div>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <PageLayout>
      <SectionHeader title="Catalog overview" subtitle="All the orbit data stored by the API, and how old it is." />
      {body}
    </PageLayout>
  )
}
