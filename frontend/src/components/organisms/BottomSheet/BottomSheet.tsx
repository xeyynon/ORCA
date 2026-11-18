import { useId, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { dragOffset, isDrag, offsetFor, releaseVelocity, settleExpanded } from '@/lib/sheetSnap'
import type { Sample } from '@/lib/sheetSnap'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { SheetHandle } from '../../atoms/SheetHandle/SheetHandle'
import './BottomSheet.css'

type Props = {
  /** Shown on the handle, so a collapsed sheet still says what it holds. */
  title: string
  children: ReactNode
  /**
   * Shows a close button beside the handle, so what the sheet holds can be dismissed by touch even while it is
   * collapsed (its body is inert then). Beside the handle, not inside it: a button cannot hold another button.
   */
  onClose?: () => void
}

type Drag = { id: number; x: number; y: number; startOffset: number; max: number; moved: boolean; samples: Sample[] }

/**
 * A sheet over the lower part of a stage (phones). Collapsed, only its handle shows; drag the handle up to expand, down
 * to collapse, or tap it (it is a button with aria-expanded). Snap rules are in lib/sheetSnap. It fills the box it is
 * placed in: the parent sets that box. Moves by transform only; under reduced motion base.css makes the snap instant.
 */
export function BottomSheet({ title, children, onClose }: Props) {
  const bodyId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [live, setLive] = useState<number | null>(null)
  const drag = useRef<Drag | null>(null)
  // A drag ends in a click on the handle in some browsers; that click must not toggle the sheet back.
  const swallowClick = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    swallowClick.current = false
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const max = (sheetRef.current?.offsetHeight ?? 0) - e.currentTarget.offsetHeight
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, startOffset: offsetFor(expanded, max), max, moved: false, samples: [{ t: e.timeStamp, y: e.clientY }] }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved && !isDrag(e.clientX - d.x, e.clientY - d.y)) return
    d.moved = true
    d.samples.push({ t: e.timeStamp, y: e.clientY })
    if (d.samples.length > 12) d.samples.shift()
    setLive(dragOffset(d.startOffset, e.clientY - d.y, d.max))
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId || !d.moved) return
    swallowClick.current = true
    d.samples.push({ t: e.timeStamp, y: e.clientY })
    setExpanded(settleExpanded(expanded, dragOffset(d.startOffset, e.clientY - d.y, d.max), d.max, releaseVelocity(d.samples)))
    setLive(null)
  }

  const onPointerCancel = () => { drag.current = null; setLive(null) }

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // detail 0 is Enter or Space: always a toggle
    if (swallowClick.current && e.detail !== 0) { swallowClick.current = false; return }
    setExpanded((v) => !v)
  }

  const transform = live !== null ? `translateY(${live}px)` : undefined
  return (
    <div
      ref={sheetRef}
      className={cx('bottom-sheet', expanded && 'bottom-sheet--open', live !== null && 'bottom-sheet--dragging')}
      style={transform ? { transform } : undefined}
    >
      <div className="bottom-sheet__head">
        <SheetHandle title={title} expanded={expanded} controls={bodyId} onClick={onClick} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} />
        {onClose ? <div className="bottom-sheet__close"><IconButton label="Close and clear the selection" onClick={onClose}><Icon name="close" size={14} /></IconButton></div> : null}
      </div>
      <div id={bodyId} className="bottom-sheet__body" inert={!expanded && live === null}>
        {children}
      </div>
    </div>
  )
}
