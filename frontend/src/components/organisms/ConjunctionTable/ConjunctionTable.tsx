import { useMemo, useState } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed, pc } from '@/lib/format'
import { riskRank } from '@/lib/risk'
import { sortBy } from '@/lib/sort'
import { pairKey } from '@/lib/pair'
import { Mono } from '../../atoms/Mono/Mono'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import type { SortDir } from '../../molecules/SortHeader/SortHeader'
import { DataTable } from '../DataTable/DataTable'
import type { Column } from '../DataTable/DataTable'

type Props = { events: readonly ConjunctionEvent[]; selectedKey: string | null; onSelect: (e: ConjunctionEvent) => void }

const SORT_KEYS: Record<string, (e: ConjunctionEvent) => number | string> = {
  risk: (e) => riskRank(e.risk_level),
  pc: (e) => e.probability_of_collision,
  miss: (e) => e.min_distance_km,
  tca: (e) => Date.parse(e.tca),
}

/** Default order is Pc descending, which is how the backend returns it. */
export function ConjunctionTable({ events, selectedKey, onSelect }: Props) {
  const [sortId, setSortId] = useState('pc')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const sorted = useMemo(() => sortBy(events, SORT_KEYS[sortId] ?? SORT_KEYS.pc, sortDir), [events, sortId, sortDir])

  const columns: Column<ConjunctionEvent>[] = [
    { id: 'risk', label: 'Risk', sortable: true, render: (e) => <RiskBadge level={e.risk_level} /> },
    { id: 'pair', label: 'Pair', render: (e) => <span>{e.sat1_name} <Mono muted>×</Mono> {e.sat2_name}</span> },
    { id: 'pc', label: 'Pc', sortable: true, align: 'right', render: (e) => <Mono>{pc(e.probability_of_collision)}</Mono> },
    { id: 'miss', label: 'Miss distance', sortable: true, align: 'right', render: (e) => <ValueUnit value={fixed(e.min_distance_km, 3)} unit="km" /> },
    { id: 'tca', label: 'TCA', sortable: true, render: (e) => <span><Mono>{formatUtc(e.tca)}</Mono> <Mono muted>({formatRelative(e.tca)})</Mono></span> },
  ]

  const onSort = (id: string) => {
    if (id === sortId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortId(id); setSortDir(id === 'pc' ? 'desc' : 'asc') }
  }

  return (
    <DataTable
      caption="Predicted conjunctions"
      columns={columns}
      rows={sorted}
      rowKey={pairKey}
      selectedKey={selectedKey}
      onSelect={onSelect}
      sortId={sortId}
      sortDir={sortDir}
      onSort={onSort}
    />
  )
}
