import { useMemo, useState } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed, pc } from '@/lib/format'
import { riskRank } from '@/lib/risk'
import { sortBy } from '@/lib/sort'
import { pairKey } from '@/lib/pair'
import { pageContaining, pageOf } from '@/lib/paging'
import { GLOSSARY } from '@/lib/glossary'
import { Badge } from '../../atoms/Badge/Badge'
import { Mono } from '../../atoms/Mono/Mono'
import { Pager } from '../../molecules/Pager/Pager'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import type { SortDir } from '../../molecules/SortHeader/SortHeader'
import { DataTable } from '../DataTable/DataTable'
import type { Column } from '../DataTable/DataTable'

type Props = {
  events: readonly ConjunctionEvent[]
  selectedKey: string | null
  onSelect: (e: ConjunctionEvent) => void
  /** Beside the detail card: drop the uncertainty column (the card shows it) so the TCA stays in view. */
  compact?: boolean
  /** Rows per page (declutter plan 2026-11-15: 25, so the page stays short and the detail card stays beside its row). */
  pageSize?: number
}

const SORT_KEYS: Record<string, (e: ConjunctionEvent) => number | string> = {
  risk: (e) => riskRank(e.risk_level),
  pc: (e) => e.probability_of_collision,
  miss: (e) => e.min_distance_km,
  unc: (e) => e.uncertainty_km,
  tca: (e) => Date.parse(e.tca),
}

/** On a phone (under 600 px) the table keeps Risk, Pair and Pc; the detail card has the rest (audit 2026-11-18 #8). */
const NARROW_HIDDEN: Record<string, number> = { miss: 600, unc: 600, tca: 600 }

/** Default order is Pc descending, which is how the backend returns it. */
export function ConjunctionTable({ events, selectedKey, onSelect, compact = false, pageSize = 25 }: Props) {
  const [sortId, setSortId] = useState('pc')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const sorted = useMemo(() => sortBy(events, SORT_KEYS[sortId] ?? SORT_KEYS.pc, sortDir), [events, sortId, sortDir])

  // Back to the first page when the rows or their order change; to the selected pair's page when the selection moves
  // there from outside the table (Previous / Next on the detail card, a point on the timeline).
  const [page, setPage] = useState(0)
  const [pageFor, setPageFor] = useState(sorted)
  const [seenKey, setSeenKey] = useState(selectedKey)
  if (pageFor !== sorted) { setPageFor(sorted); setPage(0) }
  if (seenKey !== selectedKey) {
    setSeenKey(selectedKey)
    const target = selectedKey ? pageContaining(sorted.findIndex((e) => pairKey(e) === selectedKey), pageSize) : null
    if (target !== null) setPage(target)
  }
  const view = pageOf(sorted, page, pageSize)

  const columns: Column<ConjunctionEvent>[] = [
    {
      id: 'risk', label: 'Risk', sortable: true,
      render: (e) => (
        <span>
          <RiskBadge level={e.risk_level} />
          {e.long_encounter ? <> <Badge tone="warn" title="Long encounter. The two objects pass each other at under 0.1 km/s, so the probability can be several times too low.">Long</Badge></> : null}
        </span>
      ),
    },
    { id: 'pair', label: 'Pair', render: (e) => <span>{e.sat1_name} <Mono muted>×</Mono> {e.sat2_name}</span> },
    { id: 'pc', label: 'Pc', hint: GLOSSARY.Pc, sortable: true, align: 'right', render: (e) => <Mono>{pc(e.probability_of_collision)}</Mono> },
    { id: 'miss', label: 'Miss distance', hint: GLOSSARY['miss distance'], sortable: true, align: 'right', render: (e) => <ValueUnit value={fixed(e.min_distance_km, 3)} unit="km" /> },
    {
      id: 'unc', label: 'Uncertainty (1 sigma)', hint: GLOSSARY.uncertainty, sortable: true, align: 'right',
      render: (e) => <span title="How uncertain the positions are at closest approach, and how old the older TLE is"><ValueUnit value={fixed(e.uncertainty_km, 2)} unit="km" /> <Mono muted>· TLE is {fixed(e.tle_age_days, 1)} days old</Mono></span>,
    },
    { id: 'tca', label: 'TCA', hint: GLOSSARY.TCA, sortable: true, render: (e) => <span><Mono>{formatUtc(e.tca)}</Mono> <Mono muted>({formatRelative(e.tca)})</Mono></span> },
  ]

  const shown = (compact ? columns.filter((c) => c.id !== 'unc') : columns).map((c) => ({ ...c, hideBelow: NARROW_HIDDEN[c.id] }))

  const onSort = (id: string) => {
    if (id === sortId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortId(id); setSortDir(id === 'pc' ? 'desc' : 'asc') }
  }

  return (
    <>
      <DataTable
        caption="Predicted close approaches"
        columns={shown}
        rows={view.rows}
        rowKey={pairKey}
        selectedKey={selectedKey}
        onSelect={onSelect}
        sortId={sortId}
        sortDir={sortDir}
        onSort={onSort}
      />
      <Pager noun="pairs" page={view.page} pages={view.pages} from={view.from} to={view.to} total={view.total} onPage={setPage} />
    </>
  )
}
