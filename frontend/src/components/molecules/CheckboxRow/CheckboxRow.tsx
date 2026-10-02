import { Mono } from '../../atoms/Mono/Mono'
import { Swatch } from '../../atoms/Swatch/Swatch'
import './CheckboxRow.css'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** A count shown at the right edge. */
  count?: string
  /** A colour chip before the label (a token reference), for filters that match a colour in the legend. */
  swatch?: string
  disabled?: boolean
  /** Why it is disabled, shown as a tooltip: a control that does nothing must say so. */
  title?: string
}

export function CheckboxRow({ label, checked, onChange, count, swatch, disabled, title }: Props) {
  return (
    <label className={disabled ? 'checkbox-row checkbox-row--disabled' : 'checkbox-row'} title={title}>
      <input className="checkbox-row__input" type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {swatch ? <Swatch color={swatch} shape="circle" /> : null}
      <span className="checkbox-row__label">{label}</span>
      {count !== undefined ? <Mono muted>{count}</Mono> : null}
    </label>
  )
}
