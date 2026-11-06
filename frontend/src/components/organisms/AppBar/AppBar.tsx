import type { ReactNode } from 'react'
import './AppBar.css'

type Props = { left: ReactNode; center: ReactNode; right: ReactNode }

/**
 * The one shared header (rules.md §5.4), drawn as three separate shapes rather than one strip (the owner's sketch,
 * 2026-11-07): a capsule holding the logo, attached to the left edge; the views as a tab hanging from the top edge;
 * a capsule of utilities attached to the right edge. The 1fr / auto / 1fr grid keeps the views on the viewport's
 * centre whatever the capsules' widths. Each side cell spans its whole column, so a floating search field can grow
 * leftwards inside it without ever reaching the views.
 */
export function AppBar({ left, center, right }: Props) {
  return (
    <header className="appbar">
      <div className="appbar__cell appbar__cell--left"><div className="appbar__left">{left}</div></div>
      <nav className="appbar__center" aria-label="Views">{center}</nav>
      <div className="appbar__cell appbar__cell--right"><div className="appbar__right">{right}</div></div>
    </header>
  )
}
