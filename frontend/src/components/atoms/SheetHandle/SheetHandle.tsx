import type { PointerEvent, MouseEvent } from 'react'
import './SheetHandle.css'

type Props = {
  /** What the sheet holds; part of the button's name. */
  title: string
  expanded: boolean
  /** id of the region the handle opens and closes. */
  controls: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: () => void
}

/**
 * The grab handle of a bottom sheet. Drag it up or down; it is also a plain disclosure button (tap, click, Enter or
 * Space toggles), so the drag is never the only way (WCAG 2.5.1, 2.5.7). The state is spelled out, not only drawn.
 */
export function SheetHandle({ title, expanded, controls, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: Props) {
  return (
    <button
      type="button"
      className="sheet-handle"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <span className="sheet-handle__grip" aria-hidden="true" />
      <span className="sheet-handle__row">
        <span className="sheet-handle__title">{title}</span>
        <span className="sheet-handle__state">
          {expanded ? 'Collapse' : 'Expand'}
          <span className={expanded ? 'sheet-handle__chevron sheet-handle__chevron--down' : 'sheet-handle__chevron'} aria-hidden="true" />
        </span>
      </span>
    </button>
  )
}
