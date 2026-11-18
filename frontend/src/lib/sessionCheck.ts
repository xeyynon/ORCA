/**
 * What to do when the start-up session check fails. Only the server can say a sign-in has ended, and it says so
 * with HTTP 401. Anything else (nothing answered, or the server answered with its own error) says nothing about
 * the sign-in, so the saved token is kept and the person is offered Try again instead of being signed out.
 */
export type SessionCheckOutcome =
  | { action: 'signOut'; notice: string }
  | { action: 'keep'; message: string }

export const SESSION_ENDED = 'Your session ended. Please sign in again.'

export function sessionCheckOutcome(err: unknown): SessionCheckOutcome {
  const e = err && typeof err === 'object' ? (err as { kind?: unknown; status?: unknown }) : {}
  if (e.kind === 'http' && e.status === 401) return { action: 'signOut', notice: SESSION_ENDED }
  if (e.kind === 'http' && typeof e.status === 'number') {
    return { action: 'keep', message: `ORCA's server had a problem (error ${e.status}) and couldn't check your sign-in. Try again in a minute.` }
  }
  return { action: 'keep', message: "ORCA's server isn't answering right now. Try again in a minute." }
}
