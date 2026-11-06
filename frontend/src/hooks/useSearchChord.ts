import { useEffect, useRef } from 'react'

/**
 * Ctrl+K (Cmd+K on a Mac) opens search. It is a modifier chord, so the plain-key shortcut hook deliberately ignores it;
 * it is handled here instead. It works even while typing elsewhere (that is what the chord is for), ignores held keys,
 * and prevents the browser's own Ctrl+K (focus the address bar's search) only when it acts.
 */
export function useSearchChord(onOpen: () => void, enabled = true): void {
  const ref = useRef(onOpen)
  ref.current = onOpen
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.shiftKey) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
