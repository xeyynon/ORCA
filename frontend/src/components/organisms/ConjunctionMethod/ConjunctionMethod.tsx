import type { ConjunctionMethod as Method } from '@/api/types'
import { riskTierLines, RISK_TIER_SOURCE } from '@/lib/risk'
import { RiskBadge } from '../../molecules/RiskBadge/RiskBadge'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import './ConjunctionMethod.css'

type Props = {
  method: Method | null
  /** Set when the method could not be loaded. Only its presence is used: the page says it once, in plain words. */
  error: string | null
  /** Open before a first result (a learner needs it), folded once there is a result to read. The user can still toggle it. */
  open: boolean
}

/**
 * How the conjunction list is made and what it cannot tell you, next to the numbers (rules.md §2.6).
 * The technical rows come from the API (/api/conjunctions/method), so they cannot drift from the engine; the short
 * plain-language paragraph and the risk tiers are local, so they still show when the server isn't answering
 * (audit 2026-11-18 #20).
 */
export function ConjunctionMethod({ method, error, open }: Props) {
  const tiers = (
    <>
      <ul className="conj-method__tiers">
        {riskTierLines().map((t) => <li key={t.level}><RiskBadge level={t.level} /> <span>{t.rule}</span></li>)}
      </ul>
      <span className="conj-method__tier-source">{RISK_TIER_SOURCE}</span>
    </>
  )
  return (
    <details className="conj-method" open={open}>
      <summary className="conj-method__summary">How we make this list, and what it can’t tell you</summary>
      <p className="conj-method__plain">
        ORCA uses <GlossaryTerm term="SGP4" /> with the <GlossaryTerm term="TLE" /> provided for each object to work out where every object is. Then it finds
        all pairs of objects that come within {method ? `${method.report_km} kilometers` : 'a set distance'} of each other. For each of those pairs, it estimates a <GlossaryTerm term="Pc" /> value
        at the <GlossaryTerm term="TCA" />. The Pc values and the risk tiers rank pairs using an assumed uncertainty. They don’t predict that any
        two objects will collide.
      </p>
      {method ? (
        <>
          <div className="conj-method__grid">
            <FactRow label="Propagation">{method.propagator}</FactRow>
            <FactRow label="Screening">{method.screening}</FactRow>
            <FactRow label="Closest approach">{method.closest_approach}</FactRow>
            <FactRow label="Probability of collision">{method.collision_probability}</FactRow>
            <FactRow label="Uncertainty in object position">{method.uncertainty}</FactRow>
            <FactRow label="Risk tiers">{tiers}</FactRow>
          </div>
          <ul className="conj-method__limits" aria-label="Limits">
            {method.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </>
      ) : (
        <>
          <div className="conj-method__grid">
            <FactRow label="Risk tiers">{tiers}</FactRow>
          </div>
          <FieldNote>
            {error
              ? 'The rest of the method comes from ORCA’s server, which isn’t answering right now.'
              : 'Loading the rest of the method…'}
          </FieldNote>
        </>
      )}
    </details>
  )
}
