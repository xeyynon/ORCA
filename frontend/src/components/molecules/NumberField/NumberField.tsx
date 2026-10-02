import { useId } from 'react'
import { Label } from '../../atoms/Label/Label'
import { Unit } from '../../atoms/Unit/Unit'
import './NumberField.css'

type Props = {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

/** Numeric input that clamps to its range, so the API's own validation (422) is never the first line of defence. */
export function NumberField({ label, value, min, max, step, unit, onChange }: Props) {
  const id = useId()
  return (
    <div className="number-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="number-field__box">
        <input
          id={id}
          className="number-field__input"
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = e.target.valueAsNumber
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
        />
        {unit ? <Unit>{unit}</Unit> : null}
      </div>
    </div>
  )
}
