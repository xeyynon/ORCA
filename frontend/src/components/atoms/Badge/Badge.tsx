import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Dot } from '../Dot/Dot'
import './Badge.css'

export type BadgeTone =
  | 'neutral' | 'accent' | 'ok' | 'warn' | 'bad'
  | 'critical' | 'high' | 'medium' | 'low' | 'negligible'

type Props = { tone?: BadgeTone; title?: string; children: ReactNode }

/**
 * A status said as a word: a small dot and the word in the status ink, no box and no tinted fill (playbook UI-13/UI-22,
 * audit 2026-11-15 #3). A neutral badge is just quiet text. Meaning is in the words, never the colour alone.
 */
export function Badge({ tone = 'neutral', title, children }: Props) {
  return (
    <span className={cx('badge', `badge--${tone}`)} title={title}>
      {tone !== 'neutral' ? <Dot tone={tone} size={6} /> : null}
      {children}
    </span>
  )
}
