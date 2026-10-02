import { useId } from 'react'
import { Label } from '../../atoms/Label/Label'
import './SelectField.css'

type Option<V extends string> = { value: V; label: string }
type Props<V extends string> = {
  /** Visible caption. Omit for a compact select, and pass `ariaLabel` instead. */
  label?: string
  ariaLabel?: string
  value: V
  options: ReadonlyArray<Option<V>>
  onChange: (value: V) => void
  compact?: boolean
}

/** A native <select>: keyboard, screen-reader and mobile behaviour come for free. */
export function SelectField<V extends string>({ label, ariaLabel, value, options, onChange, compact = false }: Props<V>) {
  const id = useId()
  return (
    <div className={compact ? 'select-field select-field--compact' : 'select-field'}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <select id={id} className="select-field__control" aria-label={label ? undefined : ariaLabel} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
