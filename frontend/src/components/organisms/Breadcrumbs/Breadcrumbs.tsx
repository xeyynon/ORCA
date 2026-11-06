import type { Crumb } from '@/lib/breadcrumbs'
import type { ViewId } from '@/lib/views'
import './Breadcrumbs.css'

type Props = { trail: readonly Crumb[]; onNavigate: (view: ViewId, clearSelection: boolean) => void }

/**
 * Where you are and the way back up: Mission control / Overview / 2021-091D. Renders nothing for an empty trail
 * (Mission control itself). The last crumb is the current page: plain text with aria-current, never a link to itself.
 * Crumbs are real links to the view's hash, so middle-click and the browser history work too.
 */
export function Breadcrumbs({ trail, onNavigate }: Props) {
  if (trail.length === 0) return null
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        {trail.map((c, i) => {
          const to = c.to
          return (
            <li key={`${i}-${c.label}`} className="crumbs__item">
              {to ? (
                <a className="crumbs__link" href={`#/${to.view}`} onClick={(e) => { e.preventDefault(); onNavigate(to.view, to.clearSelection) }}>{c.label}</a>
              ) : (
                <span className="crumbs__here" aria-current="page">{c.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
