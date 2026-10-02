import type { CameraGeo } from '@/lib/coords'
import { formatLat, formatLon, integer } from '@/lib/format'
import { Mono } from '../../atoms/Mono/Mono'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { Panel } from '../../molecules/Panel/Panel'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import './CameraCard.css'

type Props = { camera: CameraGeo | null }

/** Where the camera is looking from: the point on Earth below it and its height. A read-out, not a control. */
export function CameraCard({ camera }: Props) {
  return (
    <Panel title="Camera">
      <div className="camera-card__grid">
        <FactRow label="Latitude"><Mono>{camera ? formatLat(camera.latDeg) : '—'}</Mono></FactRow>
        <FactRow label="Longitude"><Mono>{camera ? formatLon(camera.lonDeg) : '—'}</Mono></FactRow>
        <FactRow label="Altitude"><ValueUnit value={camera ? integer(camera.altKm) : '—'} unit="km" /></FactRow>
      </div>
    </Panel>
  )
}
