import type { ConjunctionEvent } from '@/api/types'
import { fixed, pc } from '@/lib/format'
import { isCoMoving } from '@/lib/pair'
import { offsetForTca } from '@/lib/playback'
import { formatRelative, formatUtc, parseUtc } from '@/lib/time'
import { Badge } from '../../atoms/Badge/Badge'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { Panel } from '../../molecules/Panel/Panel'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import './ConjunctionCard.css'

type Props = {
  event: ConjunctionEvent
  nowMs: number
  onJumpToTca: () => void
  onViewDetails: () => void
  onClose: () => void
}

const REASON = {
  past: 'This closest approach is already in the past. Positions can only be shown from now to 7 days ahead.',
  beyond: 'This closest approach is more than 7 days ahead, beyond what positions can be shown for.',
} as const

/** The conjunction shown on the globe: when, how close, how fast, how risky, and a way to see it happen. */
export function ConjunctionCard({ event, nowMs, onJumpToTca, onViewDetails, onClose }: Props) {
  const tcaMs = parseUtc(event.tca).getTime()
  const jump = offsetForTca(tcaMs, nowMs)
  const canJump = 'offsetH' in jump
  const coMoving = isCoMoving(event.relative_velocity_kms)

  return (
    <Panel>
      <div className="conjunction-card__head">
        <div className="conjunction-card__title">
          <span>Conjunction</span>
          <RiskBadge level={event.risk_level} />
        </div>
        <IconButton label="Hide conjunction" onClick={onClose}><Icon name="close" size={14} /></IconButton>
      </div>

      <div className="conjunction-card__pair">
        <div><div className="conjunction-card__name">{event.sat1_name}</div><Mono muted>{event.sat1_id}</Mono></div>
        <Mono muted>×</Mono>
        <div><div className="conjunction-card__name">{event.sat2_name}</div><Mono muted>{event.sat2_id}</Mono></div>
      </div>

      <div className="conjunction-card__grid">
        <FactRow label="Time of closest approach"><Mono>{formatUtc(event.tca)}</Mono> <Mono muted>({formatRelative(event.tca, new Date(nowMs))})</Mono></FactRow>
        <FactRow label="Miss distance"><ValueUnit value={fixed(event.min_distance_km, 2)} unit="km" /></FactRow>
        <FactRow label="Relative velocity">
          <ValueUnit value={fixed(event.relative_velocity_kms, event.relative_velocity_kms < 0.1 ? 4 : 2)} unit="km/s" />
          {coMoving ? <> <Badge tone="accent" title="Relative speed under 50 m/s at closest approach">Co-moving</Badge></> : null}
        </FactRow>
        <FactRow label="Probability of collision"><Mono>{pc(event.probability_of_collision)}</Mono></FactRow>
        <FactRow label="Position uncertainty (1 sigma)"><ValueUnit value={fixed(event.uncertainty_km, 2)} unit="km" /></FactRow>
        <FactRow label="Older TLE's age"><ValueUnit value={fixed(event.tle_age_days, 1)} unit="days" /></FactRow>
      </div>

      {coMoving ? <FieldNote>These two are flying together (a formation or a shared launch). A small miss distance between co-moving objects is expected and is not a crossing encounter.</FieldNote> : null}
      {event.long_encounter ? <FieldNote>Long encounter (under 0.1 km/s): the probability assumes a fast pass and can be several times too low.</FieldNote> : null}
      <FieldNote>Pc assumes the position uncertainty above (TLEs carry none): a research estimate, not an operational probability.</FieldNote>

      <div className="conjunction-card__actions">
        <Button size="sm" disabled={!canJump} title={canJump ? 'Move the globe to the moment of closest approach' : REASON[(jump as { reason: 'past' | 'beyond' }).reason]} onClick={onJumpToTca}>Jump to closest approach</Button>
        <Button size="sm" variant="primary" onClick={onViewDetails}>View full conjunction details <Icon name="arrow-right" size={14} /></Button>
      </div>
    </Panel>
  )
}
