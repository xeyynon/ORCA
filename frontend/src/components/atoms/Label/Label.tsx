import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Label.css'

type Props = { children: ReactNode; htmlFor?: string; inline?: boolean }

/** Small uppercase caption. Always visible, never tooltip-only. `inline` sits beside its value. */
export function Label({ children, htmlFor, inline = false }: Props) {
  return <label className={cx('label', inline && 'label--inline')} htmlFor={htmlFor}>{children}</label>
}
