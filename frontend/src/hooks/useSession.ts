import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { fetchAuthStatus, fetchMe, loginRequest } from '@/api/auth'
import { clearToken, getToken, onSessionEnd, setToken } from '@/api/session'
import { describeLoginFailure } from '@/lib/authErrors'
import type { LoginFailure } from '@/lib/authErrors'
import { SESSION_ENDED, sessionCheckOutcome } from '@/lib/sessionCheck'

export type SessionState =
  | { status: 'checking' }
  | { status: 'signedOut'; notice: string | null }
  | { status: 'signedIn'; username: string }
  /** A saved sign-in could not be checked because the server is unreachable or erred. The token is kept. */
  | { status: 'unreachable'; message: string }

export type SignInResult = { ok: true } | { ok: false; failure: LoginFailure }

/**
 * Owns the whole sign-in lifecycle:
 *  - on load, a stored token is VALIDATED against the server (never trusted just because it exists);
 *    only a 401 forgets it. If the server cannot be reached or errs, the token is kept and the person gets Try again
 *  - a 401 anywhere later (expired token, rotated password) returns to the login screen with a notice
 *  - signOut forgets the token and unmounts the workspace, which drops every piece of loaded data
 */
export function useSession() {
  const [state, setState] = useState<SessionState>(() => (getToken() ? { status: 'checking' } : { status: 'signedOut', notice: null }))
  /** null = not known yet. Assumed true if the server cannot be reached, so the real connection error shows on submit. */
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (state.status !== 'checking') return
    const ctl = new AbortController()
    fetchMe({ signal: ctl.signal }).then(
      (me) => { if (!ctl.signal.aborted) setState({ status: 'signedIn', username: me.username }) },
      (err: unknown) => {
        if (ctl.signal.aborted) return
        const outcome = sessionCheckOutcome(err)
        if (outcome.action === 'signOut') {
          clearToken(false)
          setState({ status: 'signedOut', notice: outcome.notice })
        } else {
          setState({ status: 'unreachable', message: outcome.message })
        }
      },
    )
    return () => ctl.abort()
  }, [state.status])

  useEffect(() => onSessionEnd(() => setState({ status: 'signedOut', notice: SESSION_ENDED })), [])

  useEffect(() => {
    if (state.status !== 'signedOut') return
    const ctl = new AbortController()
    fetchAuthStatus({ signal: ctl.signal }).then(
      (r) => { if (!ctl.signal.aborted) setConfigured(r.configured) },
      () => { if (!ctl.signal.aborted) setConfigured(true) },
    )
    return () => ctl.abort()
  }, [state.status])

  const signIn = useCallback(async (username: string, password: string): Promise<SignInResult> => {
    try {
      const res = await loginRequest(username, password)
      setToken(res.token)
      setState({ status: 'signedIn', username: res.username })
      return { ok: true }
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('network', String(err))
      return { ok: false, failure: describeLoginFailure(e) }
    }
  }, [])

  /** Run the session check again (Try again on the "can't reach ORCA" screen). */
  const retry = useCallback(() => {
    setState(getToken() ? { status: 'checking' } : { status: 'signedOut', notice: null })
  }, [])

  const signOut = useCallback(() => {
    clearToken(false)
    setState({ status: 'signedOut', notice: null })
  }, [])

  return { state, configured, signIn, signOut, retry }
}
