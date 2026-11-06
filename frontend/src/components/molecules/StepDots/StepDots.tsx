import { Dot } from '../../atoms/Dot/Dot'
import './StepDots.css'

type Props = { count: number; current: number }

/**
 * Progress through a short sequence, one dot per step, the current one in the accent and larger. Decorative: the
 * caller always shows the same fact as text ("Step 2 of 5"), so the dots are hidden from assistive tech.
 */
export function StepDots({ count, current }: Props) {
  return (
    <span className="step-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} tone={i === current ? 'accent' : 'neutral'} size={i === current ? 8 : 6} />
      ))}
    </span>
  )
}
