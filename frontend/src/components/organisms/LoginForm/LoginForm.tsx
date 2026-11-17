import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginFailure } from '@/lib/authErrors'
import type { Credential } from '@/lib/evaluator'
import { Button } from '../../atoms/Button/Button'
import { Callout } from '../../molecules/Callout/Callout'
import { TextField } from '../../molecules/TextField/TextField'
import './LoginForm.css'

type Props = {
  initialUsername: string
  busy: boolean
  /** A new object per failed attempt, so the form reacts to every failure, including two identical ones in a row. */
  failure: LoginFailure | null
  /** Values to put into the fields, e.g. from the evaluator panel. A new object per request, like `failure`. */
  prefill?: Credential | null
  onSubmit: (username: string, password: string) => void
}

const TITLE: Record<LoginFailure['kind'], string> = {
  rejected: 'Sign-in failed',
  locked: 'Too many attempts',
  unconfigured: 'Sign-in hasn’t been set up',
  unreachable: 'Server unreachable',
  error: 'Sign-in failed',
}

/**
 * Username prefilled, focus on the password. After a failure the password is cleared and re-focused and the username
 * is kept, so the person can retype without losing their place. No "remember me" and no "forgot password": each would
 * look like it works and not work.
 */
export function LoginForm({ initialUsername, busy, failure, prefill = null, onSubmit }: Props) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => { passwordRef.current?.focus() }, [])
  useEffect(() => {
    if (!failure) return
    setPassword('')
    passwordRef.current?.focus()
  }, [failure])
  useEffect(() => {
    if (!prefill) return
    setUsername(prefill.username)
    setPassword(prefill.password)
    passwordRef.current?.focus() // Enter now signs in
  }, [prefill])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!busy && username.trim() && password) onSubmit(username.trim(), password)
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <TextField label="Username" name="username" autoComplete="username" value={username} onChange={setUsername} disabled={busy} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" inputRef={passwordRef} value={password} onChange={setPassword} disabled={busy} />
      {failure ? <Callout tone="bad" title={TITLE[failure.kind]}>{failure.message}</Callout> : null}
      <Button variant="primary" type="submit" disabled={busy || !username.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      {/* A disabled control says why (playbook UI-09). */}
      {!busy && (!username.trim() || !password) ? <p className="login-form__hint">Enter {!username.trim() && !password ? 'a username and password' : !username.trim() ? 'a username' : 'the password'} to sign in.</p> : null}
    </form>
  )
}
