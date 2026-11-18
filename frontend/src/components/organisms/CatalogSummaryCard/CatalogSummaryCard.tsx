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

type Props = {
  summary: CatalogSummaryResponse | null
  error: string | null
  onRetry: () => void
  /** True while the Globe colours objects by type: only then do the rows carry the type colour dots. Under the altitude
      colours the same blue and pink mean LEO and GEO, so a dot here would say two things (audit 2026-11-18, P2 #31). */
  typeColours: boolean
}

/**
 * Counts over the WHOLE stored catalog, not just what the browser has loaded. The catalog is CelesTrak's list of active
 * satellites, so it holds almost no debris or rocket bodies, and the types are guessed from object names; the card says
 * both under the counts (audit 2026-11-18, P0 #1), so a beginner does not read it as a picture of everything in orbit.
 */
export function CatalogSummaryCard({ summary, error, onRetry, typeColours }: Props) {
  return (
    <Panel title="Catalog">
      {summary ? (
        <>
          <div className="catalog-summary__total"><Mono>{integer(summary.total)}</Mono></div>
          <div className="catalog-summary__sub">Total objects</div>
          <div className="catalog-summary__rows">
            {OBJECT_TYPES.map((t) => typeColours ? (
              <LegendItem key={t} shape="circle" color={OBJECT_TYPE_COLOR[t]} label={OBJECT_TYPE_LABEL[t]} value={integer(summary.by_type[t])} />
            ) : (
              <div key={t} className="catalog-summary__row">
                <span className="catalog-summary__label">{OBJECT_TYPE_LABEL[t]}</span>
                <Mono muted>{integer(summary.by_type[t])}</Mono>
              </div>
            ))}
          </div>
          <p className="catalog-summary__note">This list holds active satellites, so it has almost no debris or rocket bodies. Types are guessed from names.</p>
        </>
      ) : error ? (
        <EmptyState kind="error" title="We couldn’t count the catalog" action={<Button size="sm" onClick={onRetry}>Retry</Button>}>{error}</EmptyState>
      ) : (
        <EmptyState kind="awaiting" title="Counting the catalog…" />
      )}
    </Panel>
  )
}
