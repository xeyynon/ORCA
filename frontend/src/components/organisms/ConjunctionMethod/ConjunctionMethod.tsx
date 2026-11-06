import type { ConjunctionMethod as Method } from '@/api/types'
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
    return <FieldNote>{error ? `The method description could not be loaded: ${error}` : 'Loading the method description…'}</FieldNote>
  }
  return (
    <details className="conj-method" open={open}>
      <summary className="conj-method__summary">How this list is made, and what it cannot tell you</summary>
      <p className="conj-method__plain">
        ORCA computes every object&rsquo;s position with <GlossaryTerm term="SGP4" /> from its <GlossaryTerm term="TLE" />, finds each pair that comes
        within {method.report_km} km, and estimates a <GlossaryTerm term="Pc" /> for it at the <GlossaryTerm term="TCA" />. Pc and the risk tiers
        rank pairs under an assumed uncertainty; they are not a prediction that anything will collide.
      </p>
      <div className="conj-method__grid">
        <FactRow label="Propagation">{method.propagator}</FactRow>
        <FactRow label="Screening">{method.screening}</FactRow>
        <FactRow label="Closest approach">{method.closest_approach}</FactRow>
        <FactRow label="Probability of collision">{method.collision_probability}</FactRow>
        <FactRow label="Position uncertainty">{method.uncertainty}</FactRow>
        <FactRow label="Risk tiers">{method.risk_tiers}</FactRow>
      </div>
      <ul className="conj-method__limits" aria-label="Limits">
        {method.limits.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </details>
  )
}
