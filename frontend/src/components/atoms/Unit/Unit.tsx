import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Unit.css'

type Props = { children: ReactNode }

/** Units written against the number with no space: angles ("97.33°"). Everything else takes a thin gap ("504 km"). */
const ATTACHED = new Set(['°', '′', '″'])

/** The unit beside a number. Units are never free text in a sentence (rules.md §3). */
export function Unit({ children }: Props) {
  return <span className={cx('unit', typeof children === 'string' && ATTACHED.has(children) && 'unit--attached')}>{children}</span>
}
