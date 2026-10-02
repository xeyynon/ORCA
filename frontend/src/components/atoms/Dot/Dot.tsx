import { cx } from '@/lib/cx'
import type { BadgeTone } from '../Badge/Badge'
import './Dot.css'

type Props = { tone?: BadgeTone; size?: number }

/** A 7px status dot. Always paired with text by its caller. */
export function Dot({ tone = 'neutral', size = 7 }: Props) {
  return <span className={cx('dot', `dot--${tone}`)} style={{ width: size, height: size }} aria-hidden="true" />
}
