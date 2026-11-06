import type { ReactNode } from 'react'
import type { HookLines } from '@/lib/homeHook'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { LoadingMark } from '../../molecules/LoadingMark/LoadingMark'
import './HomeHero.css'

type Props = {
  lines: HookLines
  onWatch: () => void
  onApproaches: () => void
  approachesBusy: boolean
  onStartTour?: () => void
  /** The stat row under the actions (the "right now" figures). */
  stats?: ReactNode
  /** The Earth's drawn edge in px (larger on big screens; CSS scales it down on small ones). */
  earthSize?: number
}

/**
 * The first thing a newcomer sees, with nothing competing: one striking, true sentence (the page's h1), why it matters,
 * two clear next steps, the live figures, and ORCA's own orbit animation large on a soft glow (two objects meet and
 * scatter debris; a still frame under reduced motion). It sits on the page itself, not in a card: it is the page's front.
 */
export function HomeHero({ lines, onWatch, onApproaches, approachesBusy, onStartTour, stats, earthSize = 400 }: Props) {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__text">
        <p className="home-hero__eyebrow">Space situational awareness, from public data</p>
        <h1 id="home-hero-title" className="home-hero__title">{lines.headline}</h1>
        <p className="home-hero__sub">{lines.sub}</p>
        <div className="home-hero__actions">
          <Button variant="primary" size="lg" onClick={onWatch}>Watch them move <Icon name="arrow-right" /></Button>
          <Button size="lg" onClick={onApproaches} disabled={approachesBusy}>{approachesBusy ? 'Opening…' : 'See the close approaches'}</Button>
        </div>
        {onStartTour ? (
          <button type="button" className="home-hero__tour" onClick={onStartTour}>
            <span className="home-hero__tour-icon" aria-hidden="true"><Icon name="play" size={10} /></span>
            New here? Take the one-minute tour
          </button>
        ) : null}
        {stats}
      </div>
      <div className="home-hero__visual" aria-hidden="true">
        <LoadingMark size={earthSize} />
      </div>
    </section>
  )
}
