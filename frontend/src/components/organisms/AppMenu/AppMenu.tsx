import type { Theme } from '@/lib/theme'
import { Icon } from '../../atoms/Icon/Icon'
import { MenuItem } from '../../molecules/MenuItem/MenuItem'
import { PopoverMenu } from '../PopoverMenu/PopoverMenu'
import './AppMenu.css'

type Props = {
  username: string
  theme: Theme
  onToggleTheme: () => void
  onSignOut: () => void
}

/**
 * The profile menu: who is signed in, the theme, and Sign out. Help (Ask ORCA, shortcuts, the tour) has its own menu
 * beside it. Menu behaviour (keys, focus, outside click) is PopoverMenu's, shared with the other header menus.
 */
export function AppMenu({ username, theme, onToggleTheme, onSignOut }: Props) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return (
    <PopoverMenu label="Account menu" icon={<Icon name="menu" />} menuLabel="Account and preferences" tourId="menu">
      {(close) => (
        <>
          <div className="app-menu__who" role="presentation">Signed in as <span className="app-menu__user">{username}</span></div>
          <div className="app-menu__sep" role="separator" />
          <MenuItem label={`Switch to ${nextTheme} theme`} hint="T" icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />} onSelect={() => { close(true); onToggleTheme() }} />
          <div className="app-menu__sep" role="separator" />
          <MenuItem label="Sign out" icon={<Icon name="logout" />} onSelect={() => { close(false); onSignOut() }} />
        </>
      )}
    </PopoverMenu>
  )
}
