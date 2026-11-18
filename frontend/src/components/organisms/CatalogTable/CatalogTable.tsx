import { useMemo, useState } from 'react'
import type { TleRecord } from '@/api/types'
import { ageDays, formatUtc } from '@/lib/time'
import { fixed, integer } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { pageContaining, pageOf } from '@/lib/paging'
import { sortBy } from '@/lib/sort'
import { Mono } from '../../atoms/Mono/Mono'
import { Badge } from '../../atoms/Badge/Badge'
import { Pager } from '../../molecules/Pager/Pager'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import type { SortDir } from '../../molecules/SortHeader/SortHeader'
import { DataTable } from '../DataTable/DataTable'
import type { Column } from '../DataTable/DataTable'
import './CatalogTable.css'

type Props = {
  rows: readonly TleRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  now: Date
  /** Rows per page. Rows are sorted first, so page 1 is the top of the chosen order. 50 (was 250 with "Show next"): the
      page stays short and the object card beside it stays in view (declutter plan 2026-11-15). */
  pageSize?: number
}

const SORT_KEYS: Record<string, (t: TleRecord) => number | string> = {
  name: (t) => t.object_name,
  id: (t) => Number(t.norad_cat_id),
  incl: (t) => t.inclination,
  ecc: (t) => t.eccentricity,
  alt: (t) => deriveOrbit(t)?.meanAltKm ?? -Infinity,
  age: (t) => -Date.parse(t.epoch),
}

export function CatalogTable({ rows, selectedId, onSelect, now, pageSize = 50 }: Props) {
  const [sortId, setSortId] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => sortBy(rows, SORT_KEYS[sortId] ?? SORT_KEYS.name, sortDir), [rows, sortId, sortDir])
  // Back to page 1 when the rows or their order change (a filter or a sort); to the selected object's page when it is
  // selected from elsewhere (search, the Globe).
  const [page, setPage] = useState(0)
  const [pageFor, setPageFor] = useState(sorted)
  const [seenId, setSeenId] = useState(selectedId)
  if (pageFor !== sorted) { setPageFor(sorted); setPage(0) }
  if (seenId !== selectedId) {
    setSeenId(selectedId)
    const target = selectedId ? pageContaining(sorted.findIndex((t) => t.norad_cat_id === selectedId), pageSize) : null
    if (target !== null) setPage(target)
  }
  const view = pageOf(sorted, page, pageSize)

  const columns: Column<TleRecord>[] = [
    { id: 'name', label: 'Object', sortable: true, render: (t) => t.object_name },
    { id: 'id', label: 'NORAD', sortable: true, align: 'right', render: (t) => <Mono>{t.norad_cat_id}</Mono> },
    { id: 'regime', label: 'Regime', render: (t) => { const o = deriveOrbit(t); return o ? <Badge>{o.regime}</Badge> : <Mono muted>—</Mono> } },
    { id: 'alt', label: 'Mean alt', sortable: true, align: 'right', render: (t) => <ValueUnit value={integer(deriveOrbit(t)?.meanAltKm)} unit="km" /> },
    { id: 'incl', label: 'Incl.', hideBelow: 520, sortable: true, align: 'right', render: (t) => <ValueUnit value={fixed(t.inclination, 2)} unit="°" /> },
    { id: 'ecc', label: 'Ecc.', hideBelow: 520, sortable: true, align: 'right', render: (t) => <Mono>{fixed(t.eccentricity, 5)}</Mono> },
    { id: 'epoch', label: 'TLE epoch', hideBelow: 520, render: (t) => <Mono muted>{formatUtc(t.epoch)}</Mono> },
    // A neutral number, not a coloured chip: on an aged catalog every row would carry the same alarm, and the tone flips
    // between 29.8 and 30.1 days for effectively the same data. The catalog-wide notice and the object card carry the warning.
    { id: 'age', label: 'TLE age', sortable: true, align: 'right', render: (t) => <ValueUnit value={fixed(ageDays(t.epoch, now), 1)} unit="d" /> },
  ]

  const onSort = (id: string) => {
    if (id === sortId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortId(id); setSortDir('asc') }
  }

  return (
    <div className="catalog-table">
      <DataTable
        caption="Catalog objects"
        columns={columns}
        rows={view.rows}
        rowKey={(t) => t.norad_cat_id}
        selectedKey={selectedId}
        onSelect={(t) => onSelect(t.norad_cat_id)}
        sortId={sortId}
        sortDir={sortDir}
        onSort={onSort}
      />
      <Pager noun="objects" page={view.page} pages={view.pages} from={view.from} to={view.to} total={view.total} onPage={setPage} />
    </div>
  )
}
