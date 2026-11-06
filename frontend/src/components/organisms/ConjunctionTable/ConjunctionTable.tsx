import { useMemo, useState } from 'react'
import type { ConjunctionEvent } from '@/api/types'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed, pc } from '@/lib/format'
import { riskRank } from '@/lib/risk'
import { sortBy } from '@/lib/sort'
import { pairKey } from '@/lib/pair'
import { GLOSSARY } from '@/lib/glossary'
import { Badge } from '../../atoms/Badge/Badge'
import { Mono } from '../../atoms/Mono/Mono'
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
}

const SORT_KEYS: Record<string, (e: ConjunctionEvent) => number | string> = {
  risk: (e) => riskRank(e.risk_level),
  pc: (e) => e.probability_of_collision,
  miss: (e) => e.min_distance_km,
  unc: (e) => e.uncertainty_km,
  tca: (e) => Date.parse(e.tca),
}

/** Default order is Pc descending, which is how the backend returns it. */
export function ConjunctionTable({ events, selectedKey, onSelect, compact = false }: Props) {
  const [sortId, setSortId] = useState('pc')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const sorted = useMemo(() => sortBy(events, SORT_KEYS[sortId] ?? SORT_KEYS.pc, sortDir), [events, sortId, sortDir])

  const columns: Column<ConjunctionEvent>[] = [
    {
      id: 'risk', label: 'Risk', sortable: true,
      render: (e) => (
        <span>
          <RiskBadge level={e.risk_level} />
          {e.long_encounter ? <> <Badge tone="warn" title="Long encounter: relative speed under 0.1 km/s. The probability can be several times too low.">Long</Badge></> : null}
        </span>
      ),
    },
    { id: 'pair', label: 'Pair', render: (e) => <span>{e.sat1_name} <Mono muted>×</Mono> {e.sat2_name}</span> },
    { id: 'pc', label: 'Pc', hint: GLOSSARY.Pc, sortable: true, align: 'right', render: (e) => <Mono>{pc(e.probability_of_collision)}</Mono> },
    { id: 'miss', label: 'Miss distance', hint: GLOSSARY['miss distance'], sortable: true, align: 'right', render: (e) => <ValueUnit value={fixed(e.min_distance_km, 3)} unit="km" /> },
    {
      id: 'unc', label: 'Uncertainty (1 sigma)', hint: GLOSSARY.uncertainty, sortable: true, align: 'right',
      render: (e) => <span title="Position uncertainty at closest approach, and the age of the older TLE"><ValueUnit value={fixed(e.uncertainty_km, 2)} unit="km" /> <Mono muted>· {fixed(e.tle_age_days, 1)} d TLE</Mono></span>,
    },
    { id: 'tca', label: 'TCA', hint: GLOSSARY.TCA, sortable: true, render: (e) => <span><Mono>{formatUtc(e.tca)}</Mono> <Mono muted>({formatRelative(e.tca)})</Mono></span> },
  ]

  const shown = compact ? columns.filter((c) => c.id !== 'unc') : columns

  const onSort = (id: string) => {
    if (id === sortId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortId(id); setSortDir(id === 'pc' ? 'desc' : 'asc') }
  }

  return (
    <DataTable
      caption="Predicted conjunctions"
      columns={shown}
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
