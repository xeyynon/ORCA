import type { ApiError } from '@/api/client'
import type { ConjunctionEvent, PairAssessment } from '@/api/types'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { PcValue } from '../../molecules/PcValue/PcValue'
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
        <FactRow label="Probability of collision"><PcValue value={event.probability_of_collision} /></FactRow>
        <FactRow label="Miss distance"><ValueUnit value={fixed(event.min_distance_km, 3)} unit="km" /></FactRow>
        <FactRow label="Position uncertainty (1 sigma)" hint="The assumed error in each object's position at closest approach. About two thirds of the time the true position is within this distance."><ValueUnit value={fixed(event.uncertainty_km, 2)} unit="km" /></FactRow>
        <FactRow label="Relative velocity"><ValueUnit value={fixed(event.relative_velocity_kms, event.relative_velocity_kms < 0.1 ? 4 : 2)} unit="km/s" /></FactRow>
        <FactRow label="Age of the older TLE at closest approach"><ValueUnit value={fixed(event.tle_age_days, 1)} unit="days" /></FactRow>
        <FactRow label="Time of closest approach">
          <Mono>{formatUtc(event.tca)}</Mono> <Mono muted>({formatRelative(event.tca)})</Mono>
        </FactRow>
        <FactRow label="Mahalanobis distance" hint="The miss distance measured in standard deviations of the combined position uncertainty. Smaller means the objects are closer than the uncertainty can rule out.">
          {full ? <ValueUnit value={fixed(full.mahalanobis_distance, 3)} unit="σ" /> : <Mono muted>—</Mono>}
        </FactRow>
        <FactRow label="Combined hard-body radius" hint="The two objects' physical radii added together. If they pass within this distance they touch.">
          {full ? <ValueUnit value={fixed(full.combined_hbr_km * 1000, 1)} unit="m" /> : <Mono muted>—</Mono>}
        </FactRow>
      </div>

      {assessing ? <div className="pair-card__state"><Spinner /> <span>Checking this pair again…</span></div> : null}
      {assessError ? <FieldNote>Could not check this pair again: {assessError.message}. The values above come from the search.</FieldNote> : null}
      {noRisk ? <FieldNote>Checking this pair again: {noRisk.message}.</FieldNote> : null}
      {full && full.tca !== event.tca ? (
        <FieldNote>
          Looking 7 days ahead, this pair gets closest on a different pass: <Mono>{fixed(full.min_distance_km, 3)}</Mono> km
          at <Mono>{formatUtc(full.tca)}</Mono> (Pc <PcValue value={full.probability_of_collision} />).
        </FieldNote>
      ) : null}
      {event.long_encounter ? (
        <FieldNote>
          Long encounter: these two drift past each other slower than 0.1 km/s and stay close for a long while. The probability model
          assumes a quick, straight-line pass, so here it can come out several times too low.
        </FieldNote>
      ) : null}

      <FieldNote>
        TLEs come with no error estimate, so Pc rests on the position uncertainty shown above, measured from successive public TLEs. A
        different assumption can shift the tier by orders of magnitude. Treat it as a research estimate, never as a basis for a
        manoeuvre.
      </FieldNote>

      <Button variant="primary" onClick={onShowOnGlobe}>Show both objects on the globe</Button>
    </aside>
  )
}
