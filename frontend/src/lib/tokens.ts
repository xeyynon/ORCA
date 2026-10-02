/**
 * JavaScript consumers that cannot use var() (three.js) read the same CSS tokens at
 * runtime, so the theme stays the single source of truth (rules.md §4).
 */
export function readToken(name: string, fallback = '#888888'): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Resolve a token reference like "var(--cat-1)" to its current value; any other string is returned unchanged. */
export function readColorRef(ref: string, fallback = '#888888'): string {
  const m = /^var\((--[a-z0-9-]+)\)$/i.exec(ref.trim())
  return m ? readToken(m[1], fallback) : ref
}
