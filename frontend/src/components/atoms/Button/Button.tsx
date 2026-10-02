import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Button.css'

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
  onClick?: () => void
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', disabled, title, onClick, children }: Props) {
  return (
    <button type={type} className={cx('btn', `btn--${variant}`, `btn--${size}`)} disabled={disabled} title={title} onClick={onClick}>
      {children}
    </button>
  )
}
