import { Swatch } from '../../atoms/Swatch/Swatch'
import { Mono } from '../../atoms/Mono/Mono'
import './LegendItem.css'

type Props = { color: string; label: string; value?: string; shape?: 'square' | 'circle' }

/** Chart/globe legend row. The label is always text; colour is never the only identity carrier. */
export function LegendItem({ color, label, value, shape }: Props) {
  return (
    <div className="legend-item">
      <Swatch color={color} shape={shape} />
      <span className="legend-item__label">{label}</span>
      {value !== undefined ? <Mono muted>{value}</Mono> : null}
    </div>
  )
}
