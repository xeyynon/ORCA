import type { PositionedObject, TleRecord } from '@/api/types'
import { ageDays, formatUtc } from '@/lib/time'
import { fixed } from '@/lib/format'
import { OBJECT_TYPE_SINGULAR } from '@/lib/objectTypes'
import { deriveOrbit } from '@/lib/orbit'
import { Badge } from '../../atoms/Badge/Badge'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { TleAgeChip } from '../../molecules/TleAgeChip/TleAgeChip'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import './ObjectCard.css'

type Props = {
  tle: TleRecord
  /** Current position, when this object is in the loaded globe subset; null otherwise. */
  position: PositionedObject | null
  now: Date
  onClose: () => void
}

export function ObjectCard({ tle, position, now, onClose }: Props) {
  const orbit = deriveOrbit(tle)
  return (
    <aside className="object-card" aria-label="Object detail">
      <div className="object-card__head">
        <div>
          <h3 className="object-card__title">{tle.object_name}</h3>
          <Mono muted>NORAD {tle.norad_cat_id}</Mono>
        </div>
        <IconButton label="Clear selection (Esc)" onClick={onClose}><Icon name="close" /></IconButton>
      </div>
      <div className="object-card__badges">
        {orbit ? <Badge>{orbit.regime}</Badge> : null}
        {position ? <Badge title="Inferred from the object name: the catalog stores no type or status">{OBJECT_TYPE_SINGULAR[position.type]}</Badge> : null}
        <TleAgeChip ageDays={ageDays(tle.epoch, now)} />
      </div>
      <div className="object-card__grid">
        <FactRow label="Mean altitude"><ValueUnit value={fixed(orbit?.meanAltKm, 0)} unit="km" /></FactRow>
        <FactRow label="Perigee / apogee"><ValueUnit value={`${fixed(orbit?.perigeeAltKm, 0)} / ${fixed(orbit?.apogeeAltKm, 0)}`} unit="km" /></FactRow>
        <FactRow label="Period"><ValueUnit value={fixed(orbit?.periodMinutes, 1)} unit="min" /></FactRow>
        <FactRow label="Inclination"><ValueUnit value={fixed(tle.inclination, 3)} unit="°" /></FactRow>
        <FactRow label="Eccentricity"><Mono>{fixed(tle.eccentricity, 6)}</Mono></FactRow>
        <FactRow label="TLE epoch"><Mono>{formatUtc(tle.epoch)}</Mono></FactRow>
        {position ? (
          <>
            <FactRow label="Latitude"><ValueUnit value={fixed(position.lat, 2)} unit="°" /></FactRow>
            <FactRow label="Longitude"><ValueUnit value={fixed(position.lon, 2)} unit="°" /></FactRow>
            <FactRow label="Altitude now"><ValueUnit value={fixed(position.alt_km, 0)} unit="km" /></FactRow>
            <FactRow label="Velocity"><ValueUnit value={fixed(Math.hypot(position.v[0], position.v[1], position.v[2]), 2)} unit="km/s" /></FactRow>
          </>
        ) : null}
      </div>
      {!position ? <FieldNote>This object is not in the loaded position subset, so there is no live position for it.</FieldNote> : null}
      <FieldNote>Size and shape here are derived from the TLE mean motion (rev/day → rad/s, then Kepler's third law), not read from a stored field.</FieldNote>
    </aside>
  )
}
