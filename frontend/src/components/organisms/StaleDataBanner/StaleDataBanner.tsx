import type { StaleNotice } from '@/lib/staleness'
import { Button } from '../../atoms/Button/Button'
import { Dot } from '../../atoms/Dot/Dot'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import './StaleDataBanner.css'

type Props = { notice: StaleNotice; onGoData: () => void; onDismiss: () => void }

/**
 * One notice for the whole catalog, in place of an alarm colour on every row. A flat strip under the header, not a card:
 * a dot and one sentence, the fix as a plain action, and a way to close it. It offers the fix, not only the warning.
 */
export function StaleDataBanner({ notice, onGoData, onDismiss }: Props) {
  return (
    <div className="stale-banner" role="note">
      <p className="stale-banner__text">
        <span className="stale-banner__dot"><Dot tone="warn" /></span><span className="stale-banner__title">{notice.title}.</span> {notice.body}
      </p>
      <div className="stale-banner__actions">
        <Button size="sm" variant="ghost" onClick={onGoData}>Refresh data</Button>
        <IconButton label="Dismiss until the data ages another week" onClick={onDismiss}><Icon name="close" size={14} /></IconButton>
      </div>
    </div>
  )
}
