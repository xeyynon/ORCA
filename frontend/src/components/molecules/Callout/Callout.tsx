import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Dot } from '../../atoms/Dot/Dot'
import './Callout.css'

type Props = { tone: 'warn' | 'bad'; title: string; children: ReactNode }

/**
 * A note that must not be missed, louder than FieldNote but not a coloured box: the same plain surface and border as every
 * other card, with the state carried by a dot AND the words of the title. No tint, no icon, no accent stripe.
 */
export function Callout({ tone, title, children }: Props) {
  return (
    <div className={cx('callout', `callout--${tone}`)} role="note">
      <div className="callout__title"><Dot tone={tone} /> {title}</div>
      <div className="callout__body">{children}</div>
    </div>
  )
}
