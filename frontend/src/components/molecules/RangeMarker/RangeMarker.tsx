import { Label } from '../../atoms/Label/Label'
import { Mono } from '../../atoms/Mono/Mono'
import './RangeMarker.css'

type Props = {
  label: string
  /** The object's own value, already formatted with its unit. */
  value: string
  /** Where it falls among the catalog, 0 (lowest) to 100 (highest); null when it cannot be placed. */
  percent: number | null
  /** The same position in words ("Higher than 54% of loaded objects"); the line only illustrates it. */
  words: string | null
}

/**
 * Where one object sits among the catalogue: a hairline from lowest to highest with a short tick, and the same fact in
 * words. Read-only, so it must not look like a slider (owner, 2026-11-15): no knob, no groove, no accent fill.
 */
export function RangeMarker({ label, value, percent, words }: Props) {
  return (
    <div className="range-marker">
      <div className="range-marker__head"><Label>{label}</Label><Mono>{value}</Mono></div>
      {percent !== null ? (
        <div className="range-marker__line" aria-hidden="true">
          <span className="range-marker__tick" style={{ left: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      ) : null}
      {words ? <p className="range-marker__words">{words}</p> : null}
    </div>
  )
}
