import type { ReactNode } from 'react'
import './AppBar.css'

type Props = { left: ReactNode; center: ReactNode; right: ReactNode }

/**
 * The one shared header (rules.md §5.4). A 1fr/auto/1fr grid keeps the centre slot centred on
 * the bar, not between neighbours whose widths change.
 */
export function AppBar({ left, center, right }: Props) {
  return (
    <header className="appbar">
      <div className="appbar__left">{left}</div>
      <nav className="appbar__center" aria-label="Views">{center}</nav>
      <div className="appbar__right">{right}</div>
    </header>
  )
}
