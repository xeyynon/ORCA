import type { HookLines } from '@/lib/homeHook'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { LoadingMark } from '../../molecules/LoadingMark/LoadingMark'
import './HomeHero.css'

type Props = {
  lines: HookLines
  /** When the catalogue was last refreshed ("2026-10-08 05:26 UTC"), for the data-snapshot line; null hides the line
      (not known yet). */
  snapshot: string | null
  onExploreGlobe: () => void
  onViewConjunctions: () => void
  conjunctionsBusy: boolean
  onStartTour?: () => void
  /** The Earth's drawn edge in px (CSS scales it down on small screens). */
  earthSize?: number
}

/**
 * Mission overview (Section 01 of MD/ORCA_Homepage_Redesign_Context.md): about 60% text, 40% ORCA's own orbit animation
 * at a medium size. The headline keeps the real object count (owner, 2026-11-07: the number is the hook); the
 * supporting line says what ORCA does. It sits on the page itself, not in a card.
 */
export function HomeHero({ lines, snapshot, onExploreGlobe, onViewConjunctions, conjunctionsBusy, onStartTour, earthSize = 340 }: Props) {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__text">
        <p className="home-hero__eyebrow">Space situational awareness</p>
        <h1 id="home-hero-title" className="home-hero__title">{lines.headline}</h1>
        <p className="home-hero__sub">{lines.sub}</p>
        <div className="home-hero__actions">
          <Button variant="primary" size="lg" onClick={onExploreGlobe}>Explore Globe <Icon name="arrow-right" /></Button>
          <Button size="lg" onClick={onViewConjunctions} disabled={conjunctionsBusy}>{conjunctionsBusy ? 'Opening…' : 'View Conjunctions'}</Button>
        </div>
        <div className="home-hero__meta">
          {onStartTour ? (
            <button type="button" className="home-hero__tour" onClick={onStartTour}>
              <span className="home-hero__tour-icon" aria-hidden="true"><Icon name="play" size={10} /></span>
              New here? Take the one-minute tour
            </button>
          ) : null}
          {snapshot ? <p className="home-hero__snapshot">Data snapshot · {snapshot}</p> : null}
        </div>
      </div>
      <div className="home-hero__visual" aria-hidden="true">
        <LoadingMark size={earthSize} />
      </div>
    </section>
  )
}
