import { cx } from '@/lib/cx'
import type { BadgeTone } from '../../atoms/Badge/Badge'
import { StatusField } from '../../molecules/StatusField/StatusField'
import './StatusBar.css'

export interface StatusItem { label: string; value: string | null; tone?: BadgeTone; title?: string; dotOnly?: boolean }
type Props = {
  /** The system's health (API, catalog, data age, refresh): on the left, and the way into the Data page. */
  items: readonly StatusItem[]
  /** Where and when you are looking (camera on the Globe, the clock): on the right. */
  context?: readonly StatusItem[]
  onOpenData?: () => void
  /** On the Globe (desktop): the two capsules float over the bottom of the globe instead of taking a row of their own. */
  floating?: boolean
}

/**
 * Two capsules like the top bar's: health from the left edge, context from the right, nothing between (owner,
 * 2026-11-16). Always the same fields in the same order, one line, never wrapping: a bar that changes height makes
 * everything above it jump.
 */
export function StatusBar({ items, context = [], onOpenData, floating = false }: Props) {
  const health = items.map((it) => <StatusField key={it.label} {...it} />)
  return (
    <footer className={cx('statusbar', floating && 'statusbar--floating')} aria-label="System status">
      {onOpenData
        ? <button type="button" className="statusbar__health" onClick={onOpenData} title="Open the Data page to see where the catalog comes from and how to refresh it">{health}</button>
        : <div className="statusbar__health">{health}</div>}
      {context.length ? <div className="statusbar__context">{context.map((it) => <StatusField key={it.label} {...it} />)}</div> : null}
    </footer>
  )
}
