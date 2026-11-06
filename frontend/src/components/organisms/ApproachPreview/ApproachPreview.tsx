import { useMemo, useState } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { fixed, pc } from '@/lib/format'
import { GLOSSARY } from '@/lib/glossary'
import { pairKey } from '@/lib/pair'
import { riskRank } from '@/lib/risk'
import { sortBy } from '@/lib/sort'
import { formatUtc } from '@/lib/time'
import { Mono } from '../../atoms/Mono/Mono'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { BlockHeader } from '../../molecules/BlockHeader/BlockHeader'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import type { SortDir } from '../../molecules/SortHeader/SortHeader'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import { DataTable } from '../DataTable/DataTable'
import type { Column } from '../DataTable/DataTable'
import './ApproachPreview.css'

type Props = {
  status: 'loading' | 'failed' | 'ready'
  /** The preview rows (already the run's worst five), real screening records only. */
  events: readonly ConjunctionEvent[]
  /** Which run and window the rows come from, e.g. "Stored example run, 1-day window from …". */
  provenance: string | null
  reportKm: number | null
  onOpen: (e: ConjunctionEvent) => void
  onViewAll: () => void
}

const SORT_KEYS: Record<string, (e: ConjunctionEvent) => number | string> = {
  risk: (e) => riskRank(e.risk_level),
  pc: (e) => e.probability_of_collision,
  miss: (e) => e.min_distance_km,
  tca: (e) => Date.parse(e.tca),
}

/**
 * "Close approach intelligence": the run's five worst approaches, each row opening the full analysis on Conjunctions
 * (Section 03 of the homepage spec). Never sample data: while the run loads the rows are skeletons, if it cannot load
 * that is said, and a run that found nothing is a result.
 */
export function ApproachPreview({ status, events, provenance, reportKm, onOpen, onViewAll }: Props) {
  const [sortId, setSortId] = useState('risk')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const rows = useMemo(() => sortBy(events, SORT_KEYS[sortId] ?? SORT_KEYS.risk, sortDir), [events, sortId, sortDir])
  const onSort = (id: string) => {
    if (id === sortId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortId(id); setSortDir(id === 'pc' ? 'desc' : 'asc') }
  }

  const columns: Column<ConjunctionEvent>[] = [
    { id: 'pair', label: 'Object pair', render: (e) => <span className="approach__pair">{e.sat1_name} <Mono muted>×</Mono> {e.sat2_name}</span> },
    { id: 'tca', label: 'TCA', hint: GLOSSARY.TCA, sortable: true, render: (e) => <Mono>{formatUtc(e.tca)}</Mono> },
    { id: 'miss', label: 'Miss distance', hint: GLOSSARY['miss distance'], sortable: true, align: 'right', render: (e) => <ValueUnit value={fixed(e.min_distance_km, 3)} unit="km" /> },
    { id: 'pc', label: 'Pc', hint: GLOSSARY.Pc, sortable: true, align: 'right', render: (e) => <Mono>{pc(e.probability_of_collision)}</Mono> },
    { id: 'risk', label: 'Risk', sortable: true, render: (e) => <RiskBadge level={e.risk_level} /> },
  ]

  return (
    <section className="approach" aria-labelledby="approach-title">
      <BlockHeader
        id="approach-title"
        title="Close approach intelligence"
        sub="Potential encounters identified through orbital screening."
        action={<button type="button" className="approach__all" onClick={onViewAll}>View all conjunctions</button>}
      />
      {status === 'loading' ? (
        <div className="approach__loading" aria-busy="true" aria-label="Loading the close approaches">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} width="100%" height="18px" />)}
        </div>
      ) : status === 'failed' ? (
        <EmptyState kind="error" title="The close approaches could not be loaded">Open Conjunctions to run a search.</EmptyState>
      ) : events.length === 0 ? (
        <EmptyState kind="none" title="No close approaches in this run">{reportKm !== null ? `No pair came within ${reportKm} km.` : null}</EmptyState>
      ) : (
        <div className="approach__table">
          <DataTable caption="The five worst close approaches in this run" columns={columns} rows={rows} rowKey={pairKey} onSelect={onOpen} sortId={sortId} sortDir={sortDir} onSort={onSort} />
        </div>
      )}
      {provenance ? <p className="approach__provenance">{provenance} Select a row for the full analysis.</p> : null}
    </section>
  )
}
