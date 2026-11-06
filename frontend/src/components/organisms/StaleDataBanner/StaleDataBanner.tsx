import type { StaleNotice } from '@/lib/staleness'
import { Button } from '../../atoms/Button/Button'
import { Callout } from '../../molecules/Callout/Callout'
import './StaleDataBanner.css'

type Props = { notice: StaleNotice; onGoData: () => void; onDismiss: () => void }

/** One notice for the whole catalog, in place of an alarm colour on every row. It offers the fix, not only the warning. */
export function StaleDataBanner({ notice, onGoData, onDismiss }: Props) {
  return (
    <div className="stale-banner">
      <Callout tone="warn" title={notice.title}>
        {notice.body}
        <div className="stale-banner__action">
          <Button size="sm" onClick={onGoData}>Refresh on Data page</Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
        </div>
      </Callout>
    </div>
  )
}
