import type { HomeKpi, KpiId } from '@/lib/homeBoard'
import { Icon } from '../../atoms/Icon/Icon'
import type { IconName } from '../../atoms/Icon/Icon'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import './HomeKpis.css'

type Props = {
  kpis: readonly HomeKpi[]
  /** Where each figure leads; the whole card is the button. */
  onOpen: (id: KpiId) => void
  /** Said in each card's tooltip and accessible name. */
  goLabel: Record<KpiId, string>
}

const ICON: Record<KpiId, IconName> = { objects: 'globe', pairs: 'orbit', high: 'alert', critical: 'target' }

/**
 * "Orbital intelligence": the four headline figures as aligned cards, each a big tabular number, a label, and the run it
 * comes from (MD/ORCA_Homepage_Redesign_Context.md §5, Section 02). A figure still on its way is a skeleton, never 0.
 */
export function HomeKpis({ kpis, onOpen, goLabel }: Props) {
  return (
    <section className="home-kpis" aria-labelledby="home-kpis-title">
      <h2 id="home-kpis-title" className="home-kpis__title">Orbital intelligence</h2>
      <ul className="home-kpis__list">
        {kpis.map((k) => (
          <li key={k.id} className="home-kpis__item">
            <button type="button" className="home-kpis__card" onClick={() => onOpen(k.id)} title={goLabel[k.id]}
              aria-label={`${k.label}: ${k.value ?? 'loading'}. ${k.context}. ${goLabel[k.id]}`}>
              <span className="home-kpis__go" aria-hidden="true"><Icon name="arrow-right" size={14} /></span>
              <span className="home-kpis__head">
                <span className="home-kpis__icon" aria-hidden="true"><Icon name={ICON[k.id]} size={14} /></span>
                <span className="home-kpis__label">{k.label}</span>
              </span>
              <span className={k.tone ? `home-kpis__value home-kpis__value--${k.tone}` : 'home-kpis__value'}>{k.value ?? <Skeleton width="5ch" height="0.9em" />}</span>
              <span className="home-kpis__context">{k.context}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
