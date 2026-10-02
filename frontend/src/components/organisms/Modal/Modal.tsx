import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import './Modal.css'

type Props = { title: string; onClose: () => void; children: ReactNode }

/**
 * Centred dialog. Esc closes it from the CAPTURE phase and prevents default, so the app-wide Esc
 * handler (which skips handled events) does not also fire on the same press: one press, one step.
 */
export function Modal({ title, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.() }
  }, [onClose])

  return (
    <div className="modal__scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <IconButton label="Close (Esc)" onClick={onClose}><Icon name="close" /></IconButton>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
