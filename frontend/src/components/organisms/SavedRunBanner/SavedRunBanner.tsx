import { Button } from '../../atoms/Button/Button'
import { Callout } from '../../molecules/Callout/Callout'

type Props = { ranAt: string; disabled: boolean; onRunFresh: () => void }

/**
 * Shown above every result of a saved example run, so a stored result is never mistaken for a live one. It says what it
 * is, when it was made, and offers the way back to real data.
 */
export function SavedRunBanner({ ranAt, disabled, onRunFresh }: Props) {
  return (
    <Callout tone="warn" title="Saved example run, not live">
      This is a real search stored with the app (run {ranAt}), shown so the page can be explored without waiting several minutes.
      Its times are in the past by now and its element sets have aged since.{' '}
      <Button size="sm" disabled={disabled} onClick={onRunFresh}>Run a fresh search</Button>
    </Callout>
  )
}
