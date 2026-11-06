import type { HookLines } from '@/lib/homeHook'
import { Button } from '../../atoms/Button/Button'
import { LoadingMark } from '../../molecules/LoadingMark/LoadingMark'
import './HomeHero.css'

type Props = {
  lines: HookLines
  onWatch: () => void
  onApproaches: () => void
  approachesBusy: boolean
  onStartTour?: () => void
}

/**
 * The first thing a newcomer sees: one striking, true sentence (the page's h1), why it matters, two clear next steps, and
 * ORCA's own orbit animation (two objects meet and scatter debris; a still frame under reduced motion). Nothing else
 * competes with it: details live further down the page and on the other views.
 */
export function HomeHero({ lines, onWatch, onApproaches, approachesBusy, onStartTour }: Props) {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__text">
        <p className="home-hero__eyebrow">Space situational awareness, from public data</p>
        <h1 id="home-hero-title" className="home-hero__title">{lines.headline}</h1>
        <p className="home-hero__sub">{lines.sub}</p>
        <div className="home-hero__actions">
          <Button variant="primary" onClick={onWatch}>Watch them move</Button>
          <Button onClick={onApproaches} disabled={approachesBusy}>{approachesBusy ? 'Opening…' : 'See the close approaches'}</Button>
        </div>
        {onStartTour ? (
          <button type="button" className="home-hero__tour" onClick={onStartTour}>New here? Take the one-minute tour</button>
        ) : null}
        {lines.source ? <p className="home-hero__source">{lines.source} Educational tool, not for operational decisions.</p> : (
          <p className="home-hero__source">Educational tool, not for operational decisions.</p>
        )}
      </div>
      <div className="home-hero__visual" aria-hidden="true">
        <LoadingMark size={300} />
      </div>
    </section>
  )
}
