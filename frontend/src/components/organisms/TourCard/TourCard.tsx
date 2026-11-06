import type { Ref } from 'react'
import { stepLabel } from '@/lib/tour'
import { Button } from '../../atoms/Button/Button'
import { StepDots } from '../../molecules/StepDots/StepDots'
import './TourCard.css'

type Props = {
  ref?: Ref<HTMLDivElement>
  /** A unique key for the step, so its text fades in when the step changes. */
  stepId: string
  title: string
  body: string
  index: number
  total: number
  /** A bottom sheet on a phone (full width, rounded top) instead of a card beside the target. */
  sheet: boolean
  titleId: string
  bodyId: string
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

/**
 * One step of the guided tour: where you are ("Step 2 of 5" and dots), what this part of the app is for, and the way on.
 * It is the dialog itself (role, label, description); the overlay that places it owns focus and keys. The step text sits
 * in a polite live region so moving on with an arrow key or Next is read out, not only seen.
 */
export function TourCard({ ref, stepId, title, body, index, total, sheet, titleId, bodyId, onBack, onNext, onSkip }: Props) {
  const last = index === total - 1
  return (
    <div ref={ref} className={sheet ? 'tour-card tour-card--sheet' : 'tour-card'} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} tabIndex={-1}>
      <div className="tour-card__progress">
        <span className="tour-card__count">{stepLabel(index, total)}</span>
        <StepDots count={total} current={index} />
      </div>
      <div aria-live="polite">
        <div className="tour-card__text" key={stepId}>
          <h2 className="tour-card__title" id={titleId}>{title}</h2>
          <p className="tour-card__body" id={bodyId}>{body}</p>
        </div>
      </div>
      <div className="tour-card__actions">
        <Button variant="ghost" title="Skip tour (Esc)" onClick={onSkip}>Skip tour</Button>
        <span className="tour-card__nav">
          <Button disabled={index === 0} title="Back (Left arrow)" onClick={onBack}>Back</Button>
          <span className="tour-card__primary" data-tour-primary="">
            <Button variant="primary" title={last ? 'Finish the tour' : 'Next (Right arrow)'} onClick={onNext}>{last ? 'Finish' : 'Next'}</Button>
          </span>
        </span>
      </div>
    </div>
  )
}
