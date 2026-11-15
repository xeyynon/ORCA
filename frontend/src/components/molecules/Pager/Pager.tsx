import { integer } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import './Pager.css'

type Props = {
  /** What one row is called, for the labels: "pairs" gives "Previous pairs". */
  noun: string
  /** 0-based page shown and the page count. */
  page: number
  pages: number
  /** 1-based positions of the first and last row shown, and the row count. */
  from: number
  to: number
  total: number
  onPage: (page: number) => void
}

/**
 * Moves a table a page at a time, so a long list never pushes everything below it off the page (declutter plan
 * 2026-11-15). Shows nothing when one page holds every row.
 */
export function Pager({ noun, page, pages, from, to, total, onPage }: Props) {
  if (pages <= 1) return null
  return (
    <nav className="pager" aria-label={`Pages of ${noun}`}>
      <span className="pager__pos" role="status">{integer(from)} to {integer(to)} of {integer(total)}</span>
      <div className="pager__buttons">
        <Button size="sm" variant="ghost" disabled={page === 0} ariaLabel={`Previous ${noun}`} title={`Previous ${noun}`} onClick={() => onPage(page - 1)}>
          <Icon name="arrow-left" size={14} /> Previous
        </Button>
        <span className="pager__page">Page {page + 1} of {pages}</span>
        <Button size="sm" variant="ghost" disabled={page >= pages - 1} ariaLabel={`Next ${noun}`} title={`Next ${noun}`} onClick={() => onPage(page + 1)}>
          Next <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </nav>
  )
}
