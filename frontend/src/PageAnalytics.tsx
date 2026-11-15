import { Analytics } from '@vercel/analytics/react'
import { useHashView } from '@/hooks/useHashView'

/**
 * Vercel Web Analytics (owner, 2026-11-16). ORCA routes by hash (#/overview), so the browser path never changes and
 * Vercel would count one page; passing the view as `path` sends a page view for each view instead. Cookie-free, and
 * it only sends from a Vercel deployment with Analytics enabled for the project; in development it sends nothing.
 */
export function PageAnalytics() {
  const { view } = useHashView()
  return <Analytics path={`/${view}`} route={`/${view}`} />
}
