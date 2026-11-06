import { useCallback, useLayoutEffect, useState } from 'react'
import { applyThemeColor } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

const KEY = 'orca:theme'

function initial(): Theme {
  const fromDom = document.documentElement.dataset.theme
  return fromDom === 'light' ? 'light' : 'dark'
}

/**
 * Theme is `data-theme` on <html>, persisted with try/catch (Safari private mode throws).
 * A LAYOUT effect on purpose: children's passive effects (the globe re-reading CSS tokens) run after
 * every layout effect, so they see the new theme instead of the previous one.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    applyThemeColor(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* storage unavailable: theme still applies for this session */ }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
