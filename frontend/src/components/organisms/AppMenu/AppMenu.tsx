import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { nextMenuIndex } from '@/lib/menuNav'
import type { Theme } from '@/lib/theme'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { FineOnly } from '../../molecules/FineOnly/FineOnly'
import { MenuItem } from '../../molecules/MenuItem/MenuItem'
import './AppMenu.css'

type Props = {
  username: string
  theme: Theme
  onToggleTheme: () => void
  onShowShortcuts: () => void
  onSignOut: () => void
}

/**
 * The account and preferences menu: who is signed in, the keyboard shortcuts, the theme and Sign out, behind one
 * hamburger button instead of four controls in the header. Each row shows the key that does the same with the menu closed.
 *
 * ARIA menu pattern: the button has aria-haspopup and aria-expanded; focus moves to the first item on open; Up/Down wrap,
 * Home/End jump; Tab closes; focus returns to the button on close. Esc closes the menu and is swallowed (preventDefault),
 * so the app-wide Esc does not also fire: one press undoes one step. Outside clicks close it.
 */
export function AppMenu({ username, theme, onToggleTheme, onShowShortcuts, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const items = (): HTMLElement[] =>
    Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter((el) => el.offsetParent !== null)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) rootRef.current?.querySelector<HTMLElement>('.icon-btn')?.focus()
  }

  // On open, focus the first item (keyboard and screen-reader users start inside the menu).
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

  const choose = (action: () => void, restoreFocus: boolean) => () => { close(restoreFocus); action() }
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <div className="app-menu" ref={rootRef} onKeyDown={onKeyDown}>
      <IconButton label="Menu" popup="menu" expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="menu" />
      </IconButton>
      {open ? (
        <div className="app-menu__popover" role="menu" aria-label="Account and preferences" ref={popRef}>
          <div className="app-menu__who" role="presentation">Signed in as <span className="app-menu__user">{username}</span></div>
          <div className="app-menu__sep" role="separator" />
          <FineOnly><MenuItem label="Keyboard shortcuts" hint="?" icon={<Icon name="keyboard" />} onSelect={choose(onShowShortcuts, false)} /></FineOnly>
          <MenuItem label={`Switch to ${nextTheme} theme`} hint="T" icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />} onSelect={choose(onToggleTheme, true)} />
          <div className="app-menu__sep" role="separator" />
          <MenuItem label="Sign out" icon={<Icon name="logout" />} onSelect={choose(onSignOut, false)} />
        </div>
      ) : null}
    </div>
  )
}
