import type { ReactNode } from 'react'
import type { LoginFailure } from '@/lib/authErrors'
import { Brand } from '../../molecules/Brand/Brand'
import { Callout } from '../../molecules/Callout/Callout'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { DebrisBackdrop } from '../../organisms/DebrisBackdrop/DebrisBackdrop'
import { LoginForm } from '../../organisms/LoginForm/LoginForm'
import './LoginView.css'

type Props = {
  /** null = the server has not answered yet (the form is shown; a real connection error appears on submit). */
  configured: boolean | null
  /** Why the person is here after being signed in, e.g. an expired session. */
  notice: string | null
  busy: boolean
  failure: LoginFailure | null
  onSubmit: (username: string, password: string) => void
  /** Top-right slot: the theme toggle, so the light theme is reachable from here too. */
  corner?: ReactNode
}

export function LoginView({ configured, notice, busy, failure, onSubmit, corner }: Props) {
  return (
    <main className="login-view">
      <DebrisBackdrop />
      {corner ? <div className="login-view__corner">{corner}</div> : null}
      <div className="login-view__card">
        <div className="login-view__brand"><Brand size="card" /></div>
        <h1 className="login-view__title">Sign in</h1>
        <p className="login-view__sub">Space situational awareness: orbits, conjunctions and catalog health.</p>

        {notice ? <Callout tone="warn" title="Signed out">{notice}</Callout> : null}

        {configured === false ? (
          <Callout tone="warn" title="No operator credential is set up yet">
            The server refuses all data until one exists. In the project folder, run <code className="login-view__code">python auth.py set-password</code> and
            then reload this page.
          </Callout>
        ) : (
          <LoginForm initialUsername="admin" busy={busy} failure={failure} onSubmit={onSubmit} />
        )}

        <FieldNote>Educational and research tool built on public TLEs. Not for operational decisions.</FieldNote>
      </div>
    </main>
  )
}
