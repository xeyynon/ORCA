// The ONE point of contact with the backend (rules.md §8). Components never call fetch.

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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new ApiError('aborted', 'Cancelled')
    throw new ApiError('network', 'Cannot reach the ORCA API. Is uvicorn running on port 8000?')
  }
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* non-JSON error body */ }
    throw new ApiError('http', detailOf(body, `Request failed (${res.status})`), res.status)
  }
  return (await res.json()) as T
}
