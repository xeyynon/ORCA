// The optional AI behind "Ask ORCA". Off unless the server is configured for it; the panel works fully without it.
import { ApiError, apiFetch } from './client'

type Opt = { signal?: AbortSignal }

/** GET /api/assistant/status */
export interface AssistantStatus { enabled: boolean; model: string | null; reason: string | null }

/** POST /api/assistant/ask body. `facts` are aggregate public numbers the panel already shows; nothing else is sent. */
export interface AssistantQuestion { question: string; context: { view: string; facts: string[] } }

export interface AssistantAnswer { answer: string; model: string; label: string }

/**
 * Whether the AI is available. Never throws: a server without the route (404), one that has it turned off (503) or one
 * that cannot be reached all mean "AI off", with the reason kept for the panel's footnote.
 */
export async function getAssistantStatus(o: Opt = {}): Promise<AssistantStatus> {
  try {
    const s = await apiFetch<Partial<AssistantStatus>>('/api/assistant/status', o)
    return { enabled: s.enabled === true, model: typeof s.model === 'string' ? s.model : null, reason: typeof s.reason === 'string' ? s.reason : null }
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'aborted') throw err
    const status = err instanceof ApiError ? err.status : null
    return { enabled: false, model: null, reason: status === 404 ? 'not available on this server' : status === null ? 'the server could not be reached' : `status check failed (${status})` }
  }
}

/** Ask the AI. Throws ApiError: 503 disabled, 429 rate-limited, 400 bad input. */
export async function askAssistant(body: AssistantQuestion, o: Opt = {}): Promise<AssistantAnswer> {
  const res = await apiFetch<Partial<AssistantAnswer>>('/api/assistant/ask', {
    ...o,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (typeof res.answer !== 'string' || !res.answer.trim()) throw new ApiError('http', 'The AI returned no answer', 502)
  return { answer: res.answer, model: typeof res.model === 'string' ? res.model : 'unknown model', label: typeof res.label === 'string' ? res.label : 'AI' }
}
