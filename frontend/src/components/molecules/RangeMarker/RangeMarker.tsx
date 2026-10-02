import { Label } from '../../atoms/Label/Label'
import { Mono } from '../../atoms/Mono/Mono'
import './RangeMarker.css'

type Props = {
  label: string
  /** The object's own value, already formatted with its unit. */
  value: string
  /** Where it falls among the catalog, 0 (lowest) to 100 (highest); null when it cannot be placed. */
  percent: number | null
}

/** A track spanning the catalog's lowest to highest value with a marker where this object sits. */
export function RangeMarker({ label, value, percent }: Props) {
  return (
    <div className="range-marker">
      <div className="range-marker__head"><Label>{label}</Label><Mono>{value}</Mono></div>
      <div className="range-marker__track" role="img" aria-label={percent === null ? `${label}: ${value}` : `${label}: ${value}, higher than ${Math.round(percent)}% of the catalog`}>
        {percent !== null ? <span className="range-marker__dot" style={{ left: `${Math.min(100, Math.max(0, percent))}%` }} /> : null}
      </div>
    </div>
  )
}
