import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'

export type AsyncState<T> =
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ok'; data: T; error: null }
  | { status: 'error'; data: T | null; error: ApiError }

export type AsyncResult<T> = AsyncState<T> & { reload: () => void }

/**
 * Run `load` on mount and whenever `deps` change; abort the in-flight request on change/unmount.
 * Previous data is kept while reloading so the screen does not blank between refreshes.
 * `enabled = false` defers the request (used for expensive calls only needed on one view).
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[], enabled = true): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (!enabled) return
    const ctl = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data, error: null }))
    loadRef.current(ctl.signal).then(
      (data) => { if (!ctl.signal.aborted) setState({ status: 'ok', data, error: null }) },
      (err: unknown) => {
        if (ctl.signal.aborted) return
        const e = err instanceof ApiError ? err : new ApiError('network', String(err))
        if (e.kind === 'aborted') return
        setState((s) => ({ status: 'error', data: s.data, error: e }))
      },
    )
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
