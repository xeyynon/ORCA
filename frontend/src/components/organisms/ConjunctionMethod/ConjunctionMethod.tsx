import type { ConjunctionMethod as Method } from '@/api/types'
import { riskTierLines, RISK_TIER_SOURCE } from '@/lib/risk'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import './ConjunctionMethod.css'

type Props = {
  method: Method | null
  error: string | null
  /** Open before a first result (a learner needs it), folded once there is a result to read. The user can still toggle it. */
  open: boolean
}

/**
 * How the conjunction list is made and what it cannot tell you, next to the numbers (rules.md §2.6).
 * The technical rows come from the API (/api/conjunctions/method), so they cannot drift from the engine; the short
 * plain-language paragraph above them only defines terms and states the one thing to remember.
 */
export function ConjunctionMethod({ method, error, open }: Props) {
  if (!method) {
    return <FieldNote>{error ? `We couldn’t load the method description: ${error}` : 'Loading the method description…'}</FieldNote>
  }
  return (
    <details className="conj-method" open={open}>
      <summary className="conj-method__summary">How we make this list, and what it can’t tell you</summary>
      <p className="conj-method__plain">
        ORCA uses <GlossaryTerm term="SGP4" /> with the <GlossaryTerm term="TLE" /> provided for each object to determine where every object is located. Then it identifies
        all pairs of objects that come within {method.report_km} kilometers of each other. For those pairs of objects, it computes an estimated <GlossaryTerm term="Pc" /> value
        at <GlossaryTerm term="TCA" />. The Pc values along with the risk categories rank pairs of objects using an assumed uncertainty. They are NOT predictions that any
        two objects WILL collide.
      </p>
      <div className="conj-method__grid">
        <FactRow label="Propagation">{method.propagator}</FactRow>
        <FactRow label="Screening">{method.screening}</FactRow>
        <FactRow label="Closest Approach">{method.closest_approach}</FactRow>
        <FactRow label="Probability of Collision">{method.collision_probability}</FactRow>
        <FactRow label="Uncertainty in Object Position">{method.uncertainty}</FactRow>
        <FactRow label="Risk Categories/Tiers">
          <ul className="conj-method__tiers">
            {riskTierLines().map((t) => <li key={t.level}><RiskBadge level={t.level} /> <span>{t.rule}</span></li>)}
          </ul>
          <span className="conj-method__tier-source">{RISK_TIER_SOURCE}</span>
        </FactRow>
      </div>
      <ul className="conj-method__limits" aria-label="Limits">
        {method.limits.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </details>
  )
}
