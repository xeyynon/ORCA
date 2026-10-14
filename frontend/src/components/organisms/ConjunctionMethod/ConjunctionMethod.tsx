import type { ConjunctionMethod as Method } from '@/api/types'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import './ConjunctionMethod.css'

type Props = { method: Method | null; error: string | null }

/**
 * How the conjunction list is made and what it cannot tell you, next to the numbers (rules.md §2.6).
 * Every sentence comes from the API (/api/conjunctions/method), so it cannot drift from the engine.
 */
export function ConjunctionMethod({ method, error }: Props) {
  if (!method) {
    return <FieldNote>{error ? `The method description could not be loaded: ${error}` : 'Loading the method description…'}</FieldNote>
  }
  return (
    <details className="conj-method" open>
      <summary className="conj-method__summary">How this list is made, and what it cannot tell you</summary>
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
