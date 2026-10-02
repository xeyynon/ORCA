// Where the sign-in token lives. Only api/ and hooks/ may touch this (rules.md §1: components never touch storage).
//
// sessionStorage, not localStorage: the token dies with the tab, which is right for a shared machine.
// It is readable by any script on this origin (XSS); an httpOnly cookie would fix that but needs HTTPS.
// Every storage access is in try/catch because it can throw (private windows, blocked site data).

const KEY = 'orca:token'
let memory: string | null = null
const endListeners = new Set<() => void>()

export function getToken(): string | null {
  if (memory) return memory
  try { memory = sessionStorage.getItem(KEY) } catch { /* storage unavailable: memory only */ }
  return memory
}

export function setToken(token: string): void {
  memory = token
  try { sessionStorage.setItem(KEY, token) } catch { /* the token still works for this page load */ }
}

/**
 * Forget the token. `notify` tells subscribers the session ended against the user's will (the server
 * rejected the token), as opposed to a deliberate sign-out, which passes false.
 */
export function clearToken(notify = true): void {
  memory = null
  try { sessionStorage.removeItem(KEY) } catch { /* nothing to remove */ }
  if (notify) endListeners.forEach((l) => l())
}

/** Subscribe to "the server rejected our token". Returns an unsubscribe function. */
export function onSessionEnd(listener: () => void): () => void {
  endListeners.add(listener)
  return () => { endListeners.delete(listener) }
}
