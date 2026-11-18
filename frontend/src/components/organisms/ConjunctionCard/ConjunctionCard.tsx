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
  past: 'This has already happened. The globe only shows from now to 7 days ahead.',
  beyond: 'This is more than 7 days away, which is further ahead than the globe can show.',
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

      {/* Two columns, the time across both: three rows instead of six. The TLE age sits with the uncertainty it drives. */}
      <div className="conjunction-card__grid">
        <FactRow label="Time of closest approach"><Mono>{formatUtc(event.tca)}</Mono> <Mono muted>({formatRelative(event.tca, new Date(nowMs))})</Mono></FactRow>
        <FactRow label="Miss distance"><ValueUnit value={fixed(event.min_distance_km, 2)} unit="km" /></FactRow>
        <FactRow label="Probability (Pc)"><Mono>{pc(event.probability_of_collision)}</Mono></FactRow>
        <FactRow label="Relative speed">
          <ValueUnit value={fixed(event.relative_velocity_kms, event.relative_velocity_kms < 0.1 ? 4 : 2)} unit="km/s" />
          {coMoving ? <> <Badge tone="accent" title="The two move at under 50 m/s relative to each other at closest approach">Co-moving</Badge></> : null}
        </FactRow>
        <FactRow label="Uncertainty (1σ)"><ValueUnit value={fixed(event.uncertainty_km, 2)} unit="km" /> <Mono muted>· TLE is {fixed(event.tle_age_days, 1)} days old</Mono></FactRow>
      </div>

      {coMoving ? <FieldNote>These two fly together, as a formation or from a shared launch. A small miss distance is normal for them and does not mean their paths cross.</FieldNote> : null}
      {event.long_encounter ? <FieldNote>This is a long encounter (under 0.1 km/s). For these slow pairs the probability is not reliable: it may be too high or too low.</FieldNote> : null}
      <FieldNote>Pc is a research estimate based on an assumed uncertainty, because TLEs don’t include one. It is not an operational probability.</FieldNote>

      <div className="conjunction-card__actions">
        {/* The jump when it can happen; otherwise the reason in words, not a greyed button (playbook UI-09). */}
        {canJump
          ? <Button size="sm" onClick={onJumpToTca}>Jump to closest approach</Button>
          : <p className="conjunction-card__why">{REASON[(jump as { reason: 'past' | 'beyond' }).reason]}</p>}
        <Button size="sm" variant="primary" onClick={onViewDetails}>See the full details <Icon name="arrow-right" size={14} /></Button>
      </div>
    </Panel>
  )
}
