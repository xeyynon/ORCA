import { useState } from 'react'
import type { ReactNode } from 'react'
import type { LoginFailure } from '@/lib/authErrors'
import { evaluatorCredential } from '@/lib/evaluator'
import type { Credential } from '@/lib/evaluator'
import { useClipboard } from '@/hooks/useClipboard'
import { Brand } from '../../molecules/Brand/Brand'
import { Callout } from '../../molecules/Callout/Callout'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { DebrisBackdrop } from '../../organisms/DebrisBackdrop/DebrisBackdrop'
import { EvaluatorAccess } from '../../organisms/EvaluatorAccess/EvaluatorAccess'
import { LoginForm } from '../../organisms/LoginForm/LoginForm'
import './LoginView.css'

/** Build-time demo login (frontend/.env.local or the host's env). Absent unless both variables are set. */
const EVALUATOR = evaluatorCredential(import.meta.env)

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
  const [prefill, setPrefill] = useState<Credential | null>(null)
  const { last, copy } = useClipboard()

  return (
    <main className="login-view">
      <DebrisBackdrop />
      {corner ? <div className="login-view__corner">{corner}</div> : null}
      <div className="login-view__card">
        <div className="login-view__brand"><Brand size="card" /></div>
        <h1 className="login-view__title">Sign in</h1>
        <p className="login-view__sub">Follow satellites in orbit, see which ones pass close to each other, and check how up to date the data is.</p>

        {notice ? <Callout tone="warn" title="Signed out">{notice}</Callout> : null}

        {configured === false ? (
          <Callout tone="warn" title="No operator login has been set up yet">
            The server won’t share any data until one exists. In the project folder, run <code className="login-view__code">python auth.py set-password</code> and
            then reload this page.
          </Callout>
        ) : (
          <LoginForm initialUsername="admin" busy={busy} failure={failure} prefill={prefill} onSubmit={onSubmit} />
        )}

        {EVALUATOR && configured !== false ? (
          <EvaluatorAccess credential={EVALUATOR} lastCopy={last} onCopy={(key, text) => { void copy(key, text) }}
            onUse={() => setPrefill({ ...EVALUATOR })} />
        ) : null}

        <FieldNote>This is a tool for learning and research, built on free public orbit data. Do not use it to make decisions about real spacecraft.</FieldNote>
      </div>
    </main>
  )
}
