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
}

/**
 * Always the same fields in the same order. It scrolls sideways when narrow rather than wrapping:
 * a bar that changes height makes everything above it jump.
 */
export function StatusBar({ items, context = [], onOpenData }: Props) {
  const health = items.map((it) => <StatusField key={it.label} {...it} />)
  return (
    <footer className="statusbar" aria-label="System status">
      {onOpenData
        ? <button type="button" className="statusbar__health" onClick={onOpenData} title="Open the Data page: where the catalogue comes from and how to refresh it">{health}</button>
        : <div className="statusbar__health">{health}</div>}
      {context.length ? <div className="statusbar__context">{context.map((it) => <StatusField key={it.label} {...it} />)}</div> : null}
    </footer>
  )
}
