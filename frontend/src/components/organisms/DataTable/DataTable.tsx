import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { SortHeader } from '../../molecules/SortHeader/SortHeader'
import type { SortDir } from '../../molecules/SortHeader/SortHeader'
import './DataTable.css'

export interface Column<T> {
  id: string
  label: string
  align?: 'left' | 'right'
  sortable?: boolean
  render: (row: T) => ReactNode
}

type Props<T> = {
  caption: string
  columns: ReadonlyArray<Column<T>>
  rows: readonly T[]
  rowKey: (row: T) => string
  selectedKey?: string | null
  onSelect?: (row: T) => void
  sortId: string
  sortDir: SortDir
  onSort: (columnId: string) => void
}

/** Generic sortable table. Rows are keyboard-reachable buttons-in-effect when onSelect is given. */
export function DataTable<T>({ caption, columns, rows, rowKey, selectedKey, onSelect, sortId, sortDir, onSort }: Props<T>) {
  return (
    <div className="data-table__scroll">
      {/* A selectable table is a grid: that is what makes aria-selected valid on its rows. */}
      <table className="data-table" role={onSelect ? 'grid' : undefined}>
        <caption className="data-table__caption">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <SortHeader key={c.id} label={c.label} align={c.align ?? 'left'} sortable={c.sortable ?? false} active={sortId === c.id} dir={sortDir} onSort={() => onSort(c.id)} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row)
            const selected = key === selectedKey
            return (
              <tr
                key={key}
                className={cx('data-table__row', onSelect && 'data-table__row--clickable', selected && 'data-table__row--selected')}
                aria-selected={onSelect ? selected : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={onSelect ? () => onSelect(row) : undefined}
                onKeyDown={onSelect ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(row) } } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.id} className={cx('data-table__cell', c.align === 'right' && 'data-table__cell--right')}>{c.render(row)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
