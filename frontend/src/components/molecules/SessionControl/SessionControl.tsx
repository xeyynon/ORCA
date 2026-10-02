import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { Mono } from '../../atoms/Mono/Mono'
import './SessionControl.css'

type Props = { username: string; onSignOut: () => void }

/**
 * Who is signed in, and the way out. A labelled button, not an icon alone: a user who cannot find Sign out
 * is a worse outcome than a slightly louder header. It deliberately has no keyboard shortcut (accidental sign-out).
 */
export function SessionControl({ username, onSignOut }: Props) {
  return (
    <div className="session-control">
      <span className="session-control__who" title={`Signed in as ${username}`}><Mono muted>{username}</Mono></span>
      <Button variant="ghost" size="sm" title="Sign out of ORCA" onClick={onSignOut}>
        <Icon name="logout" size={14} /> Sign out
      </Button>
    </div>
  )
}
