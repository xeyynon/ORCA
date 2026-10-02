/**
 * JavaScript consumers that cannot use var() (three.js) read the same CSS tokens at
 * runtime, so the theme stays the single source of truth (rules.md §4).
 */
export function readToken(name: string, fallback = '#888888'): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
