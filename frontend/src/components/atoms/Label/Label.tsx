import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Label.css'

type Props = { children: ReactNode; htmlFor?: string; inline?: boolean }

/**
 * Small uppercase caption. Always visible, never tooltip-only. `inline` sits beside its value. Wrap a symbol or unit
 * whose case carries meaning (Pc, 1σ) in <span className="label__as-is"> so the uppercase transform leaves it alone.
 */
export function Label({ children, htmlFor, inline = false }: Props) {
  return <label className={cx('label', inline && 'label--inline')} htmlFor={htmlFor}>{children}</label>
}
