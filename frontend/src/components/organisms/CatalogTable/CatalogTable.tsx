import { useMemo, useState } from 'react'
import type { TleRecord } from '@/api/types'
import { ageDays, formatUtc } from '@/lib/time'
import { fixed, integer } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { sortBy } from '@/lib/sort'
import { Button } from '../../atoms/Button/Button'
import { Mono } from '../../atoms/Mono/Mono'
import { Badge } from '../../atoms/Badge/Badge'
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
  /** True when `rows` is already a filtered subset: the cap line then counts matching objects, not the whole load. */
  filtered?: boolean
  /** Rows per page. Rows are sorted first, so a page shows the top of the chosen order; the count is stated above the
      table and "Show next" extends it (audit 2026-11-15, Overview). */
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

export function CatalogTable({ rows, selectedId, onSelect, now, filtered = false, pageSize = 250 }: Props) {
  const [sortId, setSortId] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => sortBy(rows, SORT_KEYS[sortId] ?? SORT_KEYS.name, sortDir), [rows, sortId, sortDir])
  // How many rows are shown; back to one page whenever the rows or their order change (a new filter or sort).
  const [limit, setLimit] = useState(pageSize)
  const [limitFor, setLimitFor] = useState(sorted)
  if (limitFor !== sorted) { setLimitFor(sorted); setLimit(pageSize) }
  const shown = sorted.slice(0, limit)
  const rest = rows.length - shown.length

  const columns: Column<TleRecord>[] = [
    { id: 'name', label: 'Object', sortable: true, render: (t) => t.object_name },
    { id: 'id', label: 'NORAD', sortable: true, align: 'right', render: (t) => <Mono>{t.norad_cat_id}</Mono> },
    { id: 'regime', label: 'Regime', render: (t) => { const o = deriveOrbit(t); return o ? <Badge>{o.regime}</Badge> : <Mono muted>—</Mono> } },
    { id: 'alt', label: 'Mean alt', sortable: true, align: 'right', render: (t) => <ValueUnit value={integer(deriveOrbit(t)?.meanAltKm)} unit="km" /> },
    { id: 'incl', label: 'Incl.', sortable: true, align: 'right', render: (t) => <ValueUnit value={fixed(t.inclination, 2)} unit="°" /> },
    { id: 'ecc', label: 'Ecc.', sortable: true, align: 'right', render: (t) => <Mono>{fixed(t.eccentricity, 5)}</Mono> },
    { id: 'epoch', label: 'TLE epoch', render: (t) => <Mono muted>{formatUtc(t.epoch)}</Mono> },
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
      <p className="catalog-table__count" role="status">
        Showing <Mono>{integer(shown.length)}</Mono> of <Mono>{integer(rows.length)}</Mono> {filtered ? 'matching' : 'loaded'} objects, in this order.
      </p>
      <DataTable
        caption="Catalog objects"
        columns={columns}
        rows={shown}
        rowKey={(t) => t.norad_cat_id}
        selectedKey={selectedId}
        onSelect={(t) => onSelect(t.norad_cat_id)}
        sortId={sortId}
        sortDir={sortDir}
        onSort={onSort}
      />
      {rest > 0 ? (
        <div className="catalog-table__more">
          <Button onClick={() => setLimit((l) => l + pageSize)}>Show next {integer(Math.min(pageSize, rest))}</Button>
          <span className="catalog-table__rest">{integer(rest)} more in this order</span>
        </div>
      ) : null}
    </div>
  )
}
