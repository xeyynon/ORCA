import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Button.css'

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost'
  /** `lg` is for a page's main call to action (the home hero), not for toolbars. */
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
  /** Overrides the accessible name. Needed when the visible text is hidden at some widths. */
  ariaLabel?: string
  onClick?: () => void
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', disabled, title, ariaLabel, onClick, children }: Props) {
  return (
    <button type={type} className={cx('btn', `btn--${variant}`, `btn--${size}`)} disabled={disabled} title={title} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  )
}
