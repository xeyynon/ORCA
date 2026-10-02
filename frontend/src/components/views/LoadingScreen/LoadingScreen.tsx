import { cx } from '@/lib/cx'
import { LoadingMark } from '../../molecules/LoadingMark/LoadingMark'
import './LoadingScreen.css'

type Props = {
  /** What is actually happening ("Checking your session", "Loading the globe"). Never a generic "Loading…" when it is known. */
  message: string
  /** screen = the whole window (startup, session check); area = fills the space of a view (a lazy-loaded screen). */
  fill?: 'screen' | 'area'
}

/**
 * The loading state. It deliberately shows no percentage or stage: none of these waits report progress, so an
 * indeterminate bar and the plain-language reason are the only honest things to show.
 */
export function LoadingScreen({ message, fill = 'screen' }: Props) {
  return (
    <div className={cx('loading-screen', `loading-screen--${fill}`)} role="status" aria-live="polite" aria-busy="true">
      <LoadingMark size={fill === 'screen' ? 240 : 176} />
      <div className="loading-screen__message">{message}</div>
      <span className="loading-screen__bar" aria-hidden="true"><span className="loading-screen__bar-fill" /></span>
    </div>
  )
}
