import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyResult = { key: string; ok: boolean }

/**
 * Copy text and remember, for a moment, what was copied and whether it worked, so the button that asked can confirm
 * it. The Clipboard API only exists in a secure context (https or localhost); elsewhere the copy fails and says so.
 */
export function useClipboard(resetMs = 1500) {
  const [last, setLast] = useState<CopyResult | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(async (key: string, text: string) => {
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      ok = false
    }
    setLast({ key, ok })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setLast(null), ok ? resetMs : resetMs * 3)
  }, [resetMs])

  return { last, copy }
}
