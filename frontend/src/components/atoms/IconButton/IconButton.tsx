import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './IconButton.css'

type Props = {
  /** Accessible name. Also the tooltip, so include the key: "Theme (T)". */
  label: string
  pressed?: boolean
  /** For a button that opens a menu: announces the popup and whether it is open. */
  popup?: 'menu'
  expanded?: boolean
  disabled?: boolean
  /** `tactile` is the raised, physical look. Only for the Globe playback transport (Neumorphism). */
  variant?: 'plain' | 'tactile'
  onClick: () => void
  children: ReactNode
}

export function IconButton({ label, pressed, popup, expanded, disabled, variant = 'plain', onClick, children }: Props) {
  return (
    <button
      type="button"
      className={cx('icon-btn', variant === 'tactile' && 'icon-btn--tactile', pressed && 'icon-btn--on')}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-haspopup={popup}
      aria-expanded={popup ? expanded : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
