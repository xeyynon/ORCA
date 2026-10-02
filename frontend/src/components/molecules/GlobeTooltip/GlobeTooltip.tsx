import { Mono } from '../../atoms/Mono/Mono'
import './GlobeTooltip.css'

type Props = { name: string; id: string; x: number; y: number }

/** Hover label that follows the pointer. Fixed-position so it is never clipped by the canvas container. */
export function GlobeTooltip({ name, id, x, y }: Props) {
  return (
    <div className="globe-tooltip" style={{ left: x + 12, top: y + 12 }} role="tooltip">
      <span>{name}</span> <Mono muted>{id}</Mono>
    </div>
  )
}
