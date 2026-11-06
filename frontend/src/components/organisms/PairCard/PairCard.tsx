import type { ApiError } from '@/api/client'
import type { ConjunctionEvent, PairAssessment } from '@/api/types'
import { useSwipe } from '@/hooks/useSwipe'
import { formatRelative, formatUtc } from '@/lib/time'
import { fixed, pc } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { Spinner } from '../../atoms/Spinner/Spinner'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { PrevNextNav } from '../../molecules/PrevNextNav/PrevNextNav'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import './PairCard.css'

type Props = {
  event: ConjunctionEvent
  assessment: PairAssessment | null
  assessing: boolean
  assessError: ApiError | null
  /** The result on screen is the stored example run: show its values only, no live re-assessment. */
  saved?: boolean
  /** Neighbours in the list's order; null at that end. Also reached by a sideways swipe on touch. */
  onPrev: (() => void) | null
  onNext: (() => void) | null
  /** 1-based position of this pair in that order, and the count. */
  index?: number
  total?: number
  onShowOnGlobe: () => void
  onClose: () => void
}

/** Detail for one selected conjunction. The table row is the search result; the assessment is a second, finer look at the pair. */
export function PairCard({ event, assessment, assessing, assessError, saved = false, onPrev, onNext, index, total, onShowOnGlobe, onClose }: Props) {
  // Finger left = next, right = previous; the Previous/Next buttons above are the same thing without a gesture.
  const swipe = useSwipe((step) => (step === 1 ? onNext : onPrev)?.())
  const full = assessment && 'mahalanobis_distance' in assessment ? assessment : null
  const noRisk = assessment && 'status' in assessment ? assessment : null

  return (
    <aside className="pair-card" aria-label="Conjunction detail" {...swipe}>
      <PrevNextNav noun="pair" index={index} total={total} onPrev={onPrev} onNext={onNext} />
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
        <FactRow label="Position uncertainty (1 sigma)"><ValueUnit value={fixed(event.uncertainty_km, 2)} unit="km" /></FactRow>
        <FactRow label="Relative velocity"><ValueUnit value={fixed(event.relative_velocity_kms, event.relative_velocity_kms < 0.1 ? 4 : 2)} unit="km/s" /></FactRow>
        <FactRow label="Older TLE's age at closest approach"><ValueUnit value={fixed(event.tle_age_days, 1)} unit="days" /></FactRow>
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

      {saved ? <FieldNote>This pair is from the saved example run, so it is not re-assessed against the live catalog. The values above are the stored ones.</FieldNote> : null}
      {assessing ? <div className="pair-card__state"><Spinner /> <span>Re-assessing this pair…</span></div> : null}
      {assessError ? <FieldNote>Pair re-assessment failed: {assessError.message}. The values above are from the search result.</FieldNote> : null}
      {noRisk ? <FieldNote>Pair re-assessment: {noRisk.message}.</FieldNote> : null}
      {full && full.tca !== event.tca ? (
        <FieldNote>
          Over the next 7 days this pair comes closest on a different pass: <Mono>{fixed(full.min_distance_km, 3)}</Mono> km
          at <Mono>{formatUtc(full.tca)}</Mono> (Pc <Mono>{pc(full.probability_of_collision)}</Mono>).
        </FieldNote>
      ) : null}
      {event.long_encounter ? (
        <FieldNote>
          Long encounter: the two pass slower than 0.1 km/s and stay close for a long time. The probability assumes a fast, straight-line
          pass and can be several times too low here.
        </FieldNote>
      ) : null}

      <FieldNote>
        Pc assumes the position uncertainty above, measured from successive public TLEs, because TLEs carry no covariance. A different
        assumption can move the tier by orders of magnitude. It is a research estimate, not an operational one, and must not drive a
        manoeuvre decision.
      </FieldNote>

      <Button variant="primary" onClick={onShowOnGlobe}>Show both objects on the globe</Button>
    </aside>
  )
}
