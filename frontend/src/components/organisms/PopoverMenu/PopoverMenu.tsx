import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { nextMenuIndex } from '@/lib/menuNav'
import { cx } from '@/lib/cx'
import { IconButton } from '../../atoms/IconButton/IconButton'
import './PopoverMenu.css'

type Props = {
  /** The button's accessible name and tooltip, with its key if it has one: "Help". */
  label: string
  icon: ReactNode
  /** The popover's accessible name: "Help", "Notifications". */
  menuLabel: string
  /** A small count on the button (unread notices). Hidden at 0; the label carries the number for screen readers. */
  badge?: number
  /** Marks the root for the tour. */
  tourId?: string
  /** The popover content. `close(restoreFocus)` closes it; items call it before acting. */
  children: (close: (restoreFocus: boolean) => void) => ReactNode
}

/**
 * The one popover-menu behaviour every header control shares (help, notifications, profile), so they cannot drift:
 * ARIA menu pattern, focus moves to the first item on open, Up/Down wrap, Home/End jump, Tab closes, Esc closes and is
 * swallowed (one press undoes one step), focus returns to the button, an outside click closes it. Opens with a small
 * rise and fade (base.css turns it off under reduced motion); closing is instant so focus never waits.
 */
export function PopoverMenu({ label, icon, menuLabel, badge = 0, tourId, children }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const items = (): HTMLElement[] =>
    Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter((el) => el.offsetParent !== null)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) rootRef.current?.querySelector<HTMLElement>('.icon-btn')?.focus()
  }

  useEffect(() => { if (open) items()[0]?.focus() }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return }
    if (e.key === 'Tab') { setOpen(false); return }
    const list = items()
    const next = nextMenuIndex(list.indexOf(document.activeElement as HTMLElement), list.length, e.key)
    if (next !== null) { e.preventDefault(); list[next]?.focus() }
  }

  const named = badge > 0 ? `${label} (${badge})` : label
  return (
    <div className="pop-menu" ref={rootRef} onKeyDown={onKeyDown} data-tour={tourId}>
      <IconButton label={named} popup="menu" expanded={open} onClick={() => setOpen((o) => !o)}>
        {icon}
      </IconButton>
      {badge > 0 ? <span className="pop-menu__badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span> : null}
      {open ? (
        <div className={cx('pop-menu__popover')} role="menu" aria-label={menuLabel} ref={popRef}>
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}
