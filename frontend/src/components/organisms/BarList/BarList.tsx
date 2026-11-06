import { integer } from '@/lib/format'
import { Mono } from '../../atoms/Mono/Mono'
import { Swatch } from '../../atoms/Swatch/Swatch'
import './BarList.css'

export interface BarItem {
  label: string
  value: number
  color: string
  /** Printed after the count, e.g. "95%". */
  share?: string
  /** The label in full, for the tooltip and screen readers ("Low Earth orbit" for LEO). */
  title?: string
}
type Props = { items: readonly BarItem[]; ariaLabel: string }

/** Labelled horizontal bars. Values are printed (never inferred from length), so colour and length are secondary. */
export function BarList({ items, ariaLabel }: Props) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="bar-list" aria-label={ariaLabel}>
      {items.map((it) => (
        <li key={it.label} className="bar-list__row" title={it.title}>
          <span className="bar-list__label"><Swatch color={it.color} /> {it.label}</span>
          <span className="bar-list__track"><span className="bar-list__fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} /></span>
          <span className="bar-list__value"><Mono>{integer(it.value)}</Mono>{it.share ? <Mono muted> {it.share}</Mono> : null}</span>
        </li>
      ))}
    </ul>
  )
}
