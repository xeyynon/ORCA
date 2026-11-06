import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './NavTab.css'

type Props = { label: string; icon: ReactNode; hotkey: string; active: boolean; onClick: () => void }

/** A top-level view switch: a simple icon and its label. aria-current marks the page; the key is in the tooltip. */
export function NavTab({ label, icon, hotkey, active, onClick }: Props) {
  return (
    <button type="button" className={cx('nav-tab', active && 'nav-tab--active')} aria-current={active ? 'page' : undefined} title={`${label} (${hotkey})`} onClick={onClick}>
      <span className="nav-tab__icon" aria-hidden="true">{icon}</span>
      <span className="nav-tab__label">{label}</span>
    </button>
  )
}
