import { useMemo, useState } from 'react'
import type { TleRecord } from '@/api/types'
import { ageDays, formatUtc } from '@/lib/time'
import { fixed, integer } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { sortBy } from '@/lib/sort'
import { Mono } from '../../atoms/Mono/Mono'
import { Badge } from '../../atoms/Badge/Badge'
import { TleAgeChip } from '../../molecules/TleAgeChip/TleAgeChip'
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
  /** Objects stored by the API, when more than `rows` were loaded. */
  totalCount?: number | null
  /** Render cap. Rows are sorted first, so the cap shows the top of the chosen order, and the cap is stated. */
  maxRows?: number
}

const SORT_KEYS: Record<string, (t: TleRecord) => number | string> = {
  name: (t) => t.object_name,
  id: (t) => Number(t.norad_cat_id),
  incl: (t) => t.inclination,
  ecc: (t) => t.eccentricity,
  alt: (t) => deriveOrbit(t)?.meanAltKm ?? -Infinity,
  age: (t) => -Date.parse(t.epoch),
}

export function CatalogTable({ rows, selectedId, onSelect, now, totalCount = null, maxRows = 250 }: Props) {
  const [sortId, setSortId] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => sortBy(rows, SORT_KEYS[sortId] ?? SORT_KEYS.name, sortDir), [rows, sortId, sortDir])
  const shown = sorted.slice(0, maxRows)

  const columns: Column<TleRecord>[] = [
    { id: 'name', label: 'Object', sortable: true, render: (t) => t.object_name },
    { id: 'id', label: 'NORAD', sortable: true, align: 'right', render: (t) => <Mono>{t.norad_cat_id}</Mono> },
    { id: 'regime', label: 'Regime', render: (t) => { const o = deriveOrbit(t); return o ? <Badge>{o.regime}</Badge> : <Mono muted>—</Mono> } },
    { id: 'alt', label: 'Mean alt', sortable: true, align: 'right', render: (t) => <ValueUnit value={fixed(deriveOrbit(t)?.meanAltKm, 0)} unit="km" /> },
    { id: 'incl', label: 'Incl.', sortable: true, align: 'right', render: (t) => <ValueUnit value={fixed(t.inclination, 2)} unit="°" /> },
    { id: 'ecc', label: 'Ecc.', sortable: true, align: 'right', render: (t) => <Mono>{fixed(t.eccentricity, 5)}</Mono> },
    { id: 'epoch', label: 'TLE epoch', render: (t) => <Mono muted>{formatUtc(t.epoch)}</Mono> },
    { id: 'age', label: 'Age', sortable: true, render: (t) => <TleAgeChip ageDays={ageDays(t.epoch, now)} /> },
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
        rows={shown}
        rowKey={(t) => t.norad_cat_id}
        selectedKey={selectedId}
        onSelect={(t) => onSelect(t.norad_cat_id)}
        sortId={sortId}
        sortDir={sortDir}
        onSort={onSort}
      />
      {rows.length > maxRows ? (
        <div className="catalog-table__cap">Showing the first {integer(maxRows)} of {integer(rows.length)} loaded objects in this order{totalCount !== null && totalCount > rows.length ? ` (${integer(totalCount)} are stored; the API returns at most 5,000 per request, and search covers only the loaded ones)` : ''}.</div>
      ) : null}
    </div>
  )
}
