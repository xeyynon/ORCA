import { useEffect, useRef } from 'react'
import { pressesFocusedControl } from '@/lib/shortcuts'

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
 *  - never fire while typing; Esc inside a text box only blurs it
 *  - leave Space and Enter to a focused button or link (a Space shortcut must not stop Play being pressed)
 * Bindings live in a ref so handlers can change without rebinding the listener.
 */
export function useKeyboardShortcuts(bindings: Bindings, enabled = true) {
  const ref = useRef(bindings)
  ref.current = bindings

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }
      if (e.target instanceof HTMLElement && pressesFocusedControl(e.key, e.target.tagName, e.target.getAttribute('role'))) return
      const fn = ref.current[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
