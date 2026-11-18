import { Spinner } from '../../atoms/Spinner/Spinner'
import { Button } from '../../atoms/Button/Button'
import { Mono } from '../../atoms/Mono/Mono'
import './JobProgress.css'

type Props = { title: string; detail: string; elapsedSeconds: number; onCancel: () => void }

/**
 * A running long job: what it is doing, how long it has been, and a way out. The API reports no
 * stage or percentage for a search, so none is invented: elapsed time is the only honest progress.
 * Only the title is a live region: the timer ticks every second and would make a screen reader talk non-stop.
 */
export function JobProgress({ title, detail, elapsedSeconds, onCancel }: Props) {
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const ss = String(elapsedSeconds % 60).padStart(2, '0')
  return (
    <div className="job-progress">
      <span className="job-progress__spinner" aria-hidden="true"><Spinner size={18} label={title} /></span>
      <div className="job-progress__text">
        <div className="job-progress__title" role="status" aria-live="polite">{title}</div>
        <div className="job-progress__detail">{detail}</div>
      </div>
      <div className="job-progress__side">
        <span><span className="visually-hidden">Running for </span><Mono>{mm}:{ss}</Mono></span>
        <Button size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
