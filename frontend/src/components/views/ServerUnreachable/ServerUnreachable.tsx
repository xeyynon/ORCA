import type { ReactNode } from 'react'
import { Brand } from '../../molecules/Brand/Brand'
import { Button } from '../../atoms/Button/Button'
import './ServerUnreachable.css'

type Props = {
  /** Why the saved sign-in could not be checked, in plain words. */
  message: string
  onRetry: () => void
  onSignOut: () => void
  /** Top-right slot: the theme toggle, as on the sign-in page. */
  corner?: ReactNode
}

/**
 * Shown when a saved sign-in could not be checked because ORCA's server did not answer or had an error.
 * The person is still signed in; nothing is lost, and Try again runs the check again.
 */
export function ServerUnreachable({ message, onRetry, onSignOut, corner }: Props) {
  return (
    <main className="server-unreachable">
      {corner ? <div className="server-unreachable__corner">{corner}</div> : null}
      <div className="server-unreachable__card" role="alert">
        <div className="server-unreachable__brand"><Brand size="card" /></div>
        <h1 className="server-unreachable__title">Can’t reach ORCA right now</h1>
        <p className="server-unreachable__text">{message}</p>
        <p className="server-unreachable__text">You are still signed in, so there is no need to sign in again.</p>
        <div className="server-unreachable__actions">
          <Button variant="primary" onClick={onRetry}>Try again</Button>
          <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </main>
  )
}
