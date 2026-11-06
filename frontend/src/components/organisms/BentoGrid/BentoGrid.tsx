import type { ReactNode } from 'react'
import './BentoGrid.css'

type Props = { children: ReactNode }

/**
 * The 12-column grid an overview screen's tiles sit on (Bento grid 2.0, MD/design_system_v2.md). Layout only: each
 * BentoTile says how many columns it spans, and on a phone every tile takes the full width in source order, so put the
 * hero first. No dense packing: what you see stays in the order you Tab through.
 */
export function BentoGrid({ children }: Props) {
  return <div className="bento-grid">{children}</div>
}
