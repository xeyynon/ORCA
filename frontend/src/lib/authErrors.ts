export type LoginFailureKind = 'rejected' | 'locked' | 'unconfigured' | 'unreachable' | 'error'

export interface LoginFailure { kind: LoginFailureKind; message: string }

/**
 * Turn a failed sign-in into something the person can act on. "Wrong password" and "the server is
 * not there" must read differently, because the remedy differs. The backend URL is never shown.
 */
export function describeLoginFailure(err: { kind: 'http' | 'network' | 'aborted'; status: number | null; message: string }): LoginFailure {
  if (err.kind === 'network') return { kind: 'unreachable', message: 'Cannot reach the server right now. Check that the API is running, then try again.' }
  switch (err.status) {
    case 401: return { kind: 'rejected', message: 'Incorrect username or password.' }
    case 429: return { kind: 'locked', message: err.message }
    case 503: return { kind: 'unconfigured', message: err.message }
    default: return { kind: 'error', message: `Sign-in failed${err.status ? ` (${err.status})` : ''}. Try again in a moment.` }
  }
}
