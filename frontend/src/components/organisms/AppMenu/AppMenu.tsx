import type { Notice } from '@/lib/notices'
import { badgeCount } from '@/lib/notices'
import type { Theme } from '@/lib/theme'
import type { ViewId } from '@/lib/views'
import { Icon } from '../../atoms/Icon/Icon'
import { FineOnly } from '../../molecules/FineOnly/FineOnly'
import { MenuItem } from '../../molecules/MenuItem/MenuItem'
import { NoticeRow } from '../../molecules/NoticeRow/NoticeRow'
import { PopoverMenu } from '../PopoverMenu/PopoverMenu'
import './AppMenu.css'

type Props = {
  username: string
  theme: Theme
  notices: readonly Notice[]
  onGo: (view: ViewId) => void
  onAsk: () => void
  onShortcuts: () => void
  onTour: () => void
  onToggleTheme: () => void
  onSignOut: () => void
}

/**
 * The one hamburger menu (owner, 2026-11-07: "a proper hamburger with all of the things there"): who is signed in, the
 * notifications, help (Ask ORCA, keyboard shortcuts, the tour), the theme and Sign out, in that order. The button
 * carries a count when a notice needs action. Behaviour (keys, focus, outside click) is PopoverMenu's.
 */
export function AppMenu({ username, theme, notices, onGo, onAsk, onShortcuts, onTour, onToggleTheme, onSignOut }: Props) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return (
    <PopoverMenu label="Menu" icon={<Icon name="menu" />} menuLabel="Menu" badge={badgeCount(notices)} tourId="menu">
      {(close) => (
        <>
          <div className="app-menu__who" role="presentation">Signed in as <span className="app-menu__user">{username}</span></div>

          <div className="app-menu__sep" role="separator" />
          <div className="app-menu__heading" role="presentation">Notifications</div>
          {notices.length === 0
            ? <p className="app-menu__empty" role="presentation">Nothing needs your attention.</p>
            : notices.map((n) => <NoticeRow key={n.id} notice={n} onSelect={() => { close(false); if (n.go) onGo(n.go) }} />)}

          <div className="app-menu__sep" role="separator" />
          <div className="app-menu__heading" role="presentation">Help</div>
          <MenuItem label="Ask ORCA" hint="." icon={<Icon name="chat" />} onSelect={() => { close(false); onAsk() }} />
          <FineOnly><MenuItem label="Keyboard shortcuts" hint="?" icon={<Icon name="keyboard" />} onSelect={() => { close(false); onShortcuts() }} /></FineOnly>
          {/* Focus goes back to the menu button first, so the tour returns it there when it closes. */}
          <MenuItem label="Take the tour" icon={<Icon name="info" />} onSelect={() => { close(true); onTour() }} />

          <div className="app-menu__sep" role="separator" />
          <MenuItem label={`Switch to ${nextTheme} theme`} hint="T" icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />} onSelect={() => { close(true); onToggleTheme() }} />
          <MenuItem label="Sign out" icon={<Icon name="logout" />} onSelect={() => { close(false); onSignOut() }} />
        </>
      )}
    </PopoverMenu>
  )
}
