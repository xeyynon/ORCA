import { cx } from '@/lib/cx'
import './SegmentedControl.css'

type Option<V extends string> = { value: V; label: string }
type Props<V extends string> = {
  ariaLabel: string
  options: ReadonlyArray<Option<V>>
  value: V
  onChange: (value: V) => void
}

/** Toggle buttons with aria-pressed. Not role="tablist": there are no tab panels (rules.md §7). */
export function SegmentedControl<V extends string>({ ariaLabel, options, value, onChange }: Props<V>) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" className={cx('segmented__btn', o.value === value && 'segmented__btn--on')} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
