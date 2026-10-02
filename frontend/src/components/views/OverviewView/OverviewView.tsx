import type { TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import type { CatalogSummary } from '@/lib/catalog'
import { days, fixed, integer } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { CatalogTable } from '../../organisms/CatalogTable/CatalogTable'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { KpiRow } from '../../organisms/KpiRow/KpiRow'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { RegimeBreakdown } from '../../organisms/RegimeBreakdown/RegimeBreakdown'
import './OverviewView.css'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  summary: CatalogSummary | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpenGlobe: (id: string) => void
  onGoData: () => void
  now: Date
}

export function OverviewView({ catalog, summary, selectedId, onSelect, onOpenGlobe, onGoData, now }: Props) {
  const rows = catalog.data
  const selected = rows?.find((t) => t.norad_cat_id === selectedId) ?? null

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
              { label: 'Objects', value: integer(summary.count), hint: summary.unclassified ? `${integer(summary.unclassified)} could not be classified` : 'all classified' },
              { label: 'Newest TLE', value: summary.newestAgeDays === null ? '—' : days(summary.newestAgeDays), hint: 'age of the freshest element set' },
              { label: 'Oldest TLE', value: summary.oldestAgeDays === null ? '—' : days(summary.oldestAgeDays), hint: 'older sets propagate less accurately' },
              { label: 'Median altitude', value: fixed(summary.medianAltKm, 0), unit: 'km', hint: 'derived from mean motion' },
            ]}
          />
        ) : null}
        <div className={selected ? 'overview__grid overview__grid--split' : 'overview__grid'}>
          <div className="overview__main">
            <CatalogTable rows={rows} selectedId={selectedId} onSelect={onSelect} now={now} />
          </div>
          <div className="overview__side">
            {selected ? (
              <>
                <ObjectCard tle={selected} position={null} now={now} onClose={() => onSelect(null)} />
                <Button variant="primary" onClick={() => onOpenGlobe(selected.norad_cat_id)}>Show on globe</Button>
              </>
            ) : null}
            {summary ? (
              <ChartCard title="Objects by regime" note="Classified from perigee/apogee altitude and eccentricity. Derived, not stored.">
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
