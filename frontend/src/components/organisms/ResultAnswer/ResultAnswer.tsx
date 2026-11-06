import type { ResultAnswer as Answer } from '@/lib/conjunctionSummary'
import { Dot } from '../../atoms/Dot/Dot'
import './ResultAnswer.css'

type Props = { answer: Answer; context: string }

const TONE = { alert: 'critical', watch: 'high', calm: 'low' } as const

/**
 * The single hero of the results: what needs attention, in a sentence, before any chart or table. The tone is a dot
 * AND the words, never colour alone. `context` is the run's own facts (horizon, objects, when it ran).
 */
export function ResultAnswer({ answer, context }: Props) {
  return (
    <section className="result-answer" aria-label="Result summary">
      <h2 className="result-answer__headline"><Dot tone={TONE[answer.tone]} size={10} /> {answer.headline}</h2>
      <p className="result-answer__detail">{answer.detail}</p>
      <p className="result-answer__context">{context}</p>
    </section>
  )
}
