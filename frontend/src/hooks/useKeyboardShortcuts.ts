import { useEffect, useRef } from 'react'

export type Bindings = Record<string, () => void>

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return TYPING.has(el.tagName) || el.isContentEditable
}

/**
 * One window keydown listener (rules.md §6). Guards, each from a real problem:
 *  - skip events another widget already handled (defaultPrevented)
 *  - skip Ctrl/Meta/Alt chords so browser and OS shortcuts keep working
 *  - ignore auto-repeat (a held key is one press)
 *  - never fire while typing; Esc inside a text box only blurs it
 * Bindings live in a ref so handlers can change without rebinding the listener.
 */
export function useKeyboardShortcuts(bindings: Bindings, enabled = true) {
  const ref = useRef(bindings)
  ref.current = bindings

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      // Holding a key repeats keydown: a held T would flash the theme back and forth, a held 3 would re-navigate.
      if (e.repeat) return
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }
      const fn = ref.current[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
