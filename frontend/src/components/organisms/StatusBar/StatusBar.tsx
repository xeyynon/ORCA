import { cx } from '@/lib/cx'
import type { BadgeTone } from '../../atoms/Badge/Badge'
import { StatusField } from '../../molecules/StatusField/StatusField'
import './StatusBar.css'

export interface StatusItem { label: string; value: string | null; tone?: BadgeTone; title?: string; dotOnly?: boolean }
type Props = {
  /** The system's health (API, catalogue, data age, refresh): on the left, and the way into the Data page. */
  items: readonly StatusItem[]
  /** Where and when you are looking (camera on the Globe, the clock): on the right. */
  context?: readonly StatusItem[]
  onOpenData?: () => void
  /** On the Globe (desktop): a slim strip floating at the bottom left, so the globe and its right-hand widgets use the
      full height (owner, 2026-11-15). */
  floating?: boolean
}

/**
 * Always the same fields in the same order. It scrolls sideways when narrow rather than wrapping:
 * a bar that changes height makes everything above it jump.
 */
export function StatusBar({ items, context = [], onOpenData, floating = false }: Props) {
  const health = items.map((it) => <StatusField key={it.label} {...it} />)
  return (
    <footer className={cx('statusbar', floating && 'statusbar--floating')} aria-label="System status">
      {onOpenData
        ? <button type="button" className="statusbar__health" onClick={onOpenData} title="Open the Data page: where the catalogue comes from and how to refresh it">{health}</button>
        : <div className="statusbar__health">{health}</div>}
      {context.length ? <div className="statusbar__context">{context.map((it) => <StatusField key={it.label} {...it} />)}</div> : null}
    </footer>
  )
}
