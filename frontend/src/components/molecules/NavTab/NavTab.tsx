import { cx } from '@/lib/cx'
import { Kbd } from '../../atoms/Kbd/Kbd'
import './NavTab.css'

type Props = { label: string; hotkey: string; active: boolean; onClick: () => void }

/** A top-level view switch. aria-current marks the page; the key is shown in the control. */
export function NavTab({ label, hotkey, active, onClick }: Props) {
  return (
    <button type="button" className={cx('nav-tab', active && 'nav-tab--active')} aria-current={active ? 'page' : undefined} title={`${label} (${hotkey})`} onClick={onClick}>
      <span>{label}</span>
      <span className="nav-tab__key"><Kbd>{hotkey}</Kbd></span>
    </button>
  )
}
