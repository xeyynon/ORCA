import type { ApiError } from '@/api/client'
import type { ConjunctionEvent, PairAssessment } from '@/api/types'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed, pc } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { Spinner } from '../../atoms/Spinner/Spinner'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import './PairCard.css'

type Props = {
  event: ConjunctionEvent
  assessment: PairAssessment | null
  assessing: boolean
  assessError: ApiError | null
  onShowOnGlobe: () => void
  onClose: () => void
}

/** Detail for one selected conjunction. The table row is the search result; the assessment is a second, finer look at the pair. */
export function PairCard({ event, assessment, assessing, assessError, onShowOnGlobe, onClose }: Props) {
  const full = assessment && 'mahalanobis_distance' in assessment ? assessment : null
  const noRisk = assessment && 'status' in assessment ? assessment : null

  return (
    <aside className="pair-card" aria-label="Conjunction detail">
      <div className="pair-card__head">
        <div>
          <RiskBadge level={event.risk_level} />
          <h3 className="pair-card__title">{event.sat1_name} <Mono muted>×</Mono> {event.sat2_name}</h3>
          <Mono muted>{event.sat1_id} · {event.sat2_id}</Mono>
        </div>
        <IconButton label="Close detail (Esc)" onClick={onClose}><Icon name="close" /></IconButton>
      </div>

      <div className="pair-card__grid">
        <FactRow label="Probability of collision"><Mono>{pc(event.probability_of_collision)}</Mono></FactRow>
        <FactRow label="Miss distance"><ValueUnit value={fixed(event.min_distance_km, 3)} unit="km" /></FactRow>
        <FactRow label="Time of closest approach">
          <Mono>{formatUtc(event.tca)}</Mono> <Mono muted>({formatRelative(event.tca)})</Mono>
        </FactRow>
        <FactRow label="Mahalanobis distance">
          {full ? <ValueUnit value={fixed(full.mahalanobis_distance, 3)} unit="σ" /> : <Mono muted>—</Mono>}
        </FactRow>
        <FactRow label="Combined hard-body radius">
          {full ? <ValueUnit value={fixed(full.combined_hbr_km * 1000, 1)} unit="m" /> : <Mono muted>—</Mono>}
        </FactRow>
      </div>

      {assessing ? <div className="pair-card__state"><Spinner /> <span>Re-assessing this pair…</span></div> : null}
      {assessError ? <FieldNote>Pair re-assessment failed: {assessError.message}. The values above are from the search result.</FieldNote> : null}
      {noRisk ? (
        <FieldNote>
          The pair re-assessment (7-day horizon, 1 h step) did not reproduce this event. The search used different settings, so the
          two can disagree; treat this row as a screening hit, not a confirmed encounter.
        </FieldNote>
      ) : null}

      <FieldNote>
        Pc uses an assumed, time-growing position uncertainty, because TLEs carry no covariance. It ranks encounters; it is not a
        validated collision probability and must not drive a manoeuvre decision.
      </FieldNote>

      <Button variant="primary" onClick={onShowOnGlobe}>Show both objects on the globe</Button>
    </aside>
  )
}
