import { apiFetch } from './client'

type Opt = { signal?: AbortSignal }

export interface LoginResponse { token: string; username: string; expires_at: number }

/** Public. Whether the server has an operator credential at all. */
export const fetchAuthStatus = (o: Opt = {}) =>
  apiFetch<{ configured: boolean }>('/api/auth/status', { ...o, skipAuth: true })

/** Exchanges the credential for a token. Not authenticated itself, and a 401 here means "wrong password", not "session ended". */
export const loginRequest = (username: string, password: string, o: Opt = {}) =>
  apiFetch<LoginResponse>('/api/auth/login', {
    ...o,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  })

/** Guarded: succeeds only if the stored token is valid and unexpired. */
export const fetchMe = (o: Opt = {}) => apiFetch<{ username: string }>('/api/auth/me', o)
