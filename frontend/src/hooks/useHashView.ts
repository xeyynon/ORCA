import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_VIEW, VIEWS } from '@/lib/views'
import type { ViewId } from '@/lib/views'

function fromHash(): ViewId {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (VIEWS as readonly string[]).includes(h) ? (h as ViewId) : DEFAULT_VIEW
}

/** The current view lives in the URL hash, so reload and Back/Forward work (no router needed). */
export function useHashView() {
  const [view, setView] = useState<ViewId>(fromHash)

  useEffect(() => {
    const onHash = () => setView(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((v: ViewId) => {
    if (window.location.hash !== `#/${v}`) window.location.hash = `/${v}`
    else setView(v)
  }, [])

  return { view, go }
}
