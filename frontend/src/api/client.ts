// The ONE point of contact with the backend (rules.md §8). Components never call fetch.
import { clearToken, getToken } from './session'

/** Empty string = same origin (the Vite dev proxy). Set VITE_API_BASE to target a remote API. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

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
    // The developer hint (the port) is for a local run only; a visitor to the hosted site gets a plain sentence.
    throw new ApiError('network', import.meta.env.DEV
      ? 'Cannot reach the ORCA API. Is uvicorn running on port 8000?'
      : 'Cannot reach the ORCA service right now. Check your connection and try again in a moment.')
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
