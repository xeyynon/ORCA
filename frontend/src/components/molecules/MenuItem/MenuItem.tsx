import type { ReactNode } from 'react'
import { Kbd } from '../../atoms/Kbd/Kbd'
import './MenuItem.css'

type Props = {
  label: string
  /** The shortcut key that does the same thing with the menu closed: recognition over recall. */
  hint?: string
  icon: ReactNode
  onSelect: () => void
}

/** One row of a menu: icon, label and (optionally) its shortcut key. A real button with role="menuitem". */
export function MenuItem({ label, hint, icon, onSelect }: Props) {
  return (
    <button type="button" role="menuitem" className="menu-item" tabIndex={-1} onClick={onSelect}>
      <span className="menu-item__icon">{icon}</span>
      <span className="menu-item__label">{label}</span>
      {hint ? <span className="menu-item__hint"><Kbd>{hint}</Kbd></span> : null}
    </button>
  )
}
