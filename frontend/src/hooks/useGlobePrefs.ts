import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PREFS, parsePrefs } from '@/lib/globePrefs'
import type { GlobePrefs } from '@/lib/globePrefs'

const KEY = 'orca:globe-prefs'

/**
 * The globe's toggles and filters. They are preferences the person set on purpose, so they live above the globe (in the
 * workspace) and survive switching views, and they are remembered across reloads. Storage can throw (private windows,
 * blocked site data): then they simply last for the session.
 */
export function useGlobePrefs(): [GlobePrefs, (patch: Partial<GlobePrefs>) => void] {
  const [prefs, setPrefs] = useState<GlobePrefs>(() => {
    try { return parsePrefs(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return DEFAULT_PREFS }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* not remembered, still applied */ }
  }, [prefs])

  const update = useCallback((patch: Partial<GlobePrefs>) => setPrefs((p) => ({ ...p, ...patch })), [])
  return [prefs, update]
}
