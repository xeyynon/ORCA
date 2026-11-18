import type { ReactNode } from 'react'
import { Kbd } from '../../atoms/Kbd/Kbd'
import { FineOnly } from '../FineOnly/FineOnly'
import './MenuItem.css'

type Props = {
  label: string
  /** The shortcut key that does the same thing with the menu closed (recognition over recall), or a short plain note. */
  hint?: string
  /** 'key' (the default) draws the hint as a keyboard key and hides it on touch screens, where there are no keys;
      'text' draws plain words such as "Build 1009", which are not a key (audit 2026-11-18, P3). */
  hintKind?: 'key' | 'text'
  icon: ReactNode
  onSelect: () => void
}

/** One row of a menu: icon, label and (optionally) its shortcut key or a note. A real button with role="menuitem". */
export function MenuItem({ label, hint, hintKind = 'key', icon, onSelect }: Props) {
  return (
    <button type="button" role="menuitem" className="menu-item" tabIndex={-1} onClick={onSelect}>
      <span className="menu-item__icon">{icon}</span>
      <span className="menu-item__label">{label}</span>
      {!hint ? null : hintKind === 'text'
        ? <span className="menu-item__hint menu-item__hint--text">{hint}</span>
        : <FineOnly><span className="menu-item__hint"><Kbd>{hint}</Kbd></span></FineOnly>}
    </button>
  )
}
