import './Switch.css'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Why it is disabled, shown as a tooltip: a control that does nothing must say so. */
  title?: string
}

/**
 * An on/off setting that takes effect at once (a view option), as opposed to a checkbox that picks items for a filter.
 * A real checkbox with role="switch", so it is announced as on/off and Space toggles it; the track and thumb are drawn.
 * State is the thumb's side AND the track's fill, never motion alone.
 */
export function Switch({ label, checked, onChange, disabled, title }: Props) {
  return (
    <label className={disabled ? 'switch switch--disabled' : 'switch'} title={title}>
      <input className="switch__input" type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
      <span className="switch__label">{label}</span>
    </label>
  )
}
