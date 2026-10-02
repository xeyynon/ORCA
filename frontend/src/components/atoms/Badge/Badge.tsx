import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Badge.css'

export type BadgeTone =
  | 'neutral' | 'accent' | 'ok' | 'warn' | 'bad'
  | 'critical' | 'high' | 'medium' | 'low' | 'negligible'

type Props = { tone?: BadgeTone; title?: string; children: ReactNode }

/** Small pill: tinted fill, ink-coloured text. Meaning is carried by the words, never the colour alone. */
export function Badge({ tone = 'neutral', title, children }: Props) {
  return (
    <span className={cx('badge', `badge--${tone}`)} title={title}>
      {children}
    </span>
  )
}
