// The ONE point of contact with the backend (rules.md §8). Components never call fetch.
import { clearToken, getToken } from './session'

/** Empty string = same origin (the Vite dev proxy). Set VITE_API_BASE to target a remote API. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** Where requests go, for people to read: the configured base, or this page's own origin (the dev proxy). */
export const API_ORIGIN = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '')

/**
 * How requests reach the API, in words, to sit beside API_ORIGIN. With no VITE_API_BASE the address shown is this
 * site's own: in development the Vite server passes each request on to the API; in a built bundle the same server
 * serves the API too. Without this note the address reads as the API's own, which it is not in development.
 */
export const API_ROUTE_NOTE: string | null = API_BASE
  ? null
  : import.meta.env.DEV
    ? "This is the app's own address. The development server passes each request on to the API."
    : 'Same address as this site.'

/** What a visitor reads when nothing answers. The technical cause goes to the console, not the screen. */
export const UNREACHABLE_MESSAGE = "ORCA's server isn't answering right now. Try again in a minute."

export class ApiError extends Error {
  readonly status: number | null
  /** 'http' = server answered with an error; 'network' = nothing answered; 'aborted' = we cancelled */
  readonly kind: 'http' | 'network' | 'aborted'
  constructor(kind: ApiError['kind'], message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

/** FastAPI errors arrive as {detail: string | [{msg}]}; keep the actionable part. */
function detailOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) {
      const msgs = d
        .map((x) => (x && typeof x === 'object' && 'msg' in x ? String((x as { msg: unknown }).msg) : ''))
        .filter(Boolean)
      return msgs.join('; ') || fallback
    }
  }
  return fallback
}

type Init = RequestInit & {
  /** Do not attach the token and do not treat a 401 as an ended session (the sign-in call itself). */
  skipAuth?: boolean
}

export async function apiFetch<T>(path: string, init: Init = {}): Promise<T> {
  const { skipAuth = false, ...rest } = init
  const headers = new Headers(rest.headers)
  const token = skipAuth ? null : getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...rest, headers })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new ApiError('aborted', 'Cancelled')
    console.warn(`ORCA API request failed: ${API_ORIGIN}${path}`, err)
    throw new ApiError('network', UNREACHABLE_MESSAGE)
  }
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* non-JSON error body */ }
    // A 401 on a call that carried a token means the session ended (expired, or the password was rotated):
    // forget it and tell the app, so it returns to the login screen instead of showing panels that quietly stop updating.
    if (res.status === 401 && token) clearToken()
    throw new ApiError('http', detailOf(body, `Request failed (${res.status})`), res.status)
  }
  return (await res.json()) as T
}
