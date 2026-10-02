import type { BadgeTone } from '../../atoms/Badge/Badge'
import { StatusField } from '../../molecules/StatusField/StatusField'
import './StatusBar.css'

export interface StatusItem { label: string; value: string | null; tone?: BadgeTone; title?: string; dotOnly?: boolean }
type Props = { items: readonly StatusItem[] }

/**
 * Always the same fields in the same order. It scrolls sideways when narrow rather than wrapping:
 * a bar that changes height makes everything above it jump.
 */
export function StatusBar({ items }: Props) {
  return (
    <footer className="statusbar" aria-label="System status">
      {items.map((it) => <StatusField key={it.label} {...it} />)}
    </footer>
  )
}
