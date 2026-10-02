import { cx } from '@/lib/cx'
import './SortHeader.css'

export type SortDir = 'asc' | 'desc'
type Props = {
  label: string
  align: 'left' | 'right'
  sortable: boolean
  active: boolean
  dir: SortDir
  onSort: () => void
}

/** A table header cell. Sortable ones are real buttons and expose aria-sort. */
export function SortHeader({ label, align, sortable, active, dir, onSort }: Props) {
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined
  return (
    <th scope="col" className={cx('sort-header', `sort-header--${align}`)} aria-sort={ariaSort}>
      {sortable ? (
        <button type="button" className="sort-header__btn" onClick={onSort}>
          <span>{label}</span>
          <span className="sort-header__arrow" aria-hidden="true">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
      ) : (
        <span>{label}</span>
      )}
    </th>
  )
}
