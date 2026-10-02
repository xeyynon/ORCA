import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import type { Theme } from '@/lib/theme'

type Props = { theme: Theme; onToggle: () => void }

export function ThemeToggle({ theme, onToggle }: Props) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <IconButton label={`Switch to ${next} theme (T)`} onClick={onToggle}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </IconButton>
  )
}
