import { Icon } from '../../atoms/Icon/Icon'
import { cx } from '@/lib/cx'
import './SortHeader.css'

export type SortDir = 'asc' | 'desc'
type Props = {
  label: string
  /** Plain-language meaning. Exposed as title + accessible description; the visible definition lives in a footnote by the table. */
  hint?: string
  align: 'left' | 'right'
  sortable: boolean
  active: boolean
  dir: SortDir
  onSort: () => void
}

/** A table header cell. Sortable ones are real buttons and expose aria-sort. */
export function SortHeader({ label, hint, align, sortable, active, dir, onSort }: Props) {
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined
  return (
    <th scope="col" className={cx('sort-header', `sort-header--${align}`)} aria-sort={ariaSort}>
      {sortable ? (
        <button type="button" className="sort-header__btn" title={hint} onClick={onSort}>
          <span>{label}</span>
          <span className="sort-header__arrow" aria-hidden="true">{active ? <Icon name={dir === 'asc' ? 'sort-up' : 'sort-down'} size={10} /> : null}</span>
        </button>
      ) : (
        <span title={hint}>{label}</span>
      )}
    </th>
  )
}
