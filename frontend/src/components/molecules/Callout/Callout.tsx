import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from '../../atoms/Icon/Icon'
import './Callout.css'

type Props = { tone: 'warn' | 'bad'; title: string; children: ReactNode }

/** A warning that must not be missed, louder than FieldNote. Uniform border, no accent stripe. */
export function Callout({ tone, title, children }: Props) {
  return (
    <div className={cx('callout', `callout--${tone}`)} role="note">
      <span className="callout__icon"><Icon name="info" size={16} /></span>
      <div>
        <div className="callout__title">{title}</div>
        <div className="callout__body">{children}</div>
      </div>
    </div>
  )
}
