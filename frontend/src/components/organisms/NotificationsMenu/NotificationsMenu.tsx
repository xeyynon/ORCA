import type { Notice } from '@/lib/notices'
import { badgeCount } from '@/lib/notices'
import type { ViewId } from '@/lib/views'
import { Dot } from '../../atoms/Dot/Dot'
import { Icon } from '../../atoms/Icon/Icon'
import { PopoverMenu } from '../PopoverMenu/PopoverMenu'
import './NotificationsMenu.css'

type Props = { notices: readonly Notice[]; onGo: (view: ViewId) => void }

/**
 * The bell: current conditions that need attention (API down, stale data, a search running, finished or failed), each
 * a row that opens the place to act. Only real conditions (lib/notices.ts); an empty list says so in words.
 */
export function NotificationsMenu({ notices, onGo }: Props) {
  const count = badgeCount(notices)
  return (
    <PopoverMenu label="Notifications" icon={<Icon name="bell" />} menuLabel="Notifications" badge={count} tourId="notifications">
      {(close) => (
        <>
          <div className="notices__head" role="presentation">Notifications</div>
          {notices.length === 0 ? (
            <p className="notices__empty" role="presentation">Nothing needs your attention.</p>
          ) : notices.map((n) => (
            <button
              key={n.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="notices__item"
              onClick={() => { close(false); if (n.go) onGo(n.go) }}
            >
              <span className="notices__dot"><Dot tone={n.tone} /></span>
              <span className="notices__text">
                <span className="notices__title">{n.title}</span>
                <span className="notices__detail">{n.detail}</span>
              </span>
            </button>
          ))}
        </>
      )}
    </PopoverMenu>
  )
}
