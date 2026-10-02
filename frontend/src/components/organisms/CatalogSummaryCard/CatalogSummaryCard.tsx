import type { CatalogSummaryResponse } from '@/api/types'
import { OBJECT_TYPE_COLOR } from '@/lib/chartColors'
import { integer } from '@/lib/format'
import { OBJECT_TYPES, OBJECT_TYPE_LABEL } from '@/lib/objectTypes'
import { Button } from '../../atoms/Button/Button'
import { Mono } from '../../atoms/Mono/Mono'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import { Panel } from '../../molecules/Panel/Panel'
import './CatalogSummaryCard.css'

type Props = { summary: CatalogSummaryResponse | null; error: string | null; onRetry: () => void }

/**
 * Counts over the WHOLE stored catalog, not just what the browser has loaded. The types come from object names, so they
 * are "payloads", never "active satellites": the data holds no status field and cannot say whether a payload still works.
 */
export function CatalogSummaryCard({ summary, error, onRetry }: Props) {
  return (
    <Panel title="Catalog">
      {summary ? (
        <>
          <div className="catalog-summary__total"><Mono>{integer(summary.total)}</Mono></div>
          <div className="catalog-summary__sub">Total objects</div>
          <div className="catalog-summary__rows">
            {OBJECT_TYPES.map((t) => (
              <LegendItem key={t} shape="circle" color={OBJECT_TYPE_COLOR[t]} label={OBJECT_TYPE_LABEL[t]} value={integer(summary.by_type[t])} />
            ))}
          </div>
        </>
      ) : error ? (
        <EmptyState kind="error" title="Could not count the catalog" action={<Button size="sm" onClick={onRetry}>Retry</Button>}>{error}</EmptyState>
      ) : (
        <EmptyState kind="awaiting" title="Counting catalog…" />
      )}
    </Panel>
  )
}
