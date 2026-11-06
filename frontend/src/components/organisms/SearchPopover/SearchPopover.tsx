import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import './SearchPopover.css'

type Props = {
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** The search input inside `children`, focused when the field opens. */
  inputRef: RefObject<HTMLInputElement | null>
  /** The search itself (ObjectSearch). */
  children: ReactNode
}

/**
 * Search as an icon that expands into a floating field growing leftwards. The field is positioned absolutely, so it
 * never moves or resizes the centred navigation. Opens with the icon, "/" or Ctrl/Cmd+K (bound in Workspace); focuses
 * the input on open; closes with Esc (after the search has cleared its own list) or a click outside.
 */
export function SearchPopover({ open, onOpen, onClose, inputRef, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open, inputRef])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose])

  return (
    <div
      className="search-pop"
      ref={rootRef}
      data-tour="search"
      onKeyDown={(e) => {
        if (open && e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation(); onClose()
          rootRef.current?.querySelector<HTMLElement>('.icon-btn')?.focus()
        }
      }}
    >
      <IconButton label="Search objects (/ or Ctrl+K)" popup="menu" expanded={open} onClick={() => (open ? onClose() : onOpen())}>
        <Icon name="search" />
      </IconButton>
      {open ? <div className="search-pop__panel">{children}</div> : null}
    </div>
  )
}
