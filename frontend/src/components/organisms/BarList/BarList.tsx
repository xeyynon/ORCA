import { integer } from '@/lib/format'
import { Mono } from '../../atoms/Mono/Mono'
import { Swatch } from '../../atoms/Swatch/Swatch'
import './BarList.css'

export interface BarItem { label: string; value: number; color: string }
type Props = { items: readonly BarItem[]; ariaLabel: string }

/** Labelled horizontal bars. Values are printed (never inferred from length), so colour and length are secondary. */
export function BarList({ items, ariaLabel }: Props) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="bar-list" aria-label={ariaLabel}>
      {items.map((it) => (
        <li key={it.label} className="bar-list__row">
          <span className="bar-list__label"><Swatch color={it.color} /> {it.label}</span>
          <span className="bar-list__track"><span className="bar-list__fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} /></span>
          <Mono>{integer(it.value)}</Mono>
        </li>
      ))}
    </ul>
  )
}
