import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './IconButton.css'

type Props = {
  /** Accessible name. Also the tooltip, so include the key: "Theme (T)". */
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

export function IconButton({ label, pressed, disabled, onClick, children }: Props) {
  return (
    <button
      type="button"
      className={cx('icon-btn', pressed && 'icon-btn--on')}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
