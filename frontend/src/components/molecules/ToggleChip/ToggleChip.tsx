import { cx } from '@/lib/cx'
import './ToggleChip.css'

type Props = {
  label: string
  /** Shown after the label, e.g. how many rows the chip would include. */
  count?: string
  pressed: boolean
  onToggle: () => void
}

/** A filter chip that is on or off. State is `aria-pressed` and the fill, never colour alone. */
export function ToggleChip({ label, count, pressed, onToggle }: Props) {
  return (
    <button type="button" className={cx('chip', pressed && 'chip--on')} aria-pressed={pressed} onClick={onToggle}>
      <span className="chip__label">{label}</span>
      {count !== undefined ? <span className="chip__count">{count}</span> : null}
    </button>
  )
}
