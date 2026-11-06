import type { ViewId } from '@/lib/views'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import './HowItWorks.css'

type Props = { onGo: (view: ViewId) => void }

/**
 * Three steps that tell what ORCA does, in the order it does it (storytelling): track, screen, understand. Each step is
 * one sentence and one way in. Technical words carry their plain meaning on hover or focus.
 */
export function HowItWorks({ onGo }: Props) {
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title" className="how__title">How it works</h2>
      <ol className="how__steps">
        <li className="how__step">
          <div className="how__head"><span className="how__num" aria-hidden="true">1</span>
          <h3 className="how__name">Track</h3></div>
          <p className="how__text">Every catalogued object is placed from its public orbit data (<GlossaryTerm term="TLE" />) and drawn on a 3D Earth you can turn and play forward.</p>
          <button type="button" className="how__link" onClick={() => onGo('globe')}>Open the globe</button>
        </li>
        <li className="how__step">
          <div className="how__head"><span className="how__num" aria-hidden="true">2</span>
          <h3 className="how__name">Screen</h3></div>
          <p className="how__text">ORCA checks every pair over the coming days and finds each time two objects pass close to each other.</p>
          <button type="button" className="how__link" onClick={() => onGo('conjunctions')}>Find close approaches</button>
        </li>
        <li className="how__step">
          <div className="how__head"><span className="how__num" aria-hidden="true">3</span>
          <h3 className="how__name">Understand</h3></div>
          <p className="how__text">Each approach gets a probability of collision (<GlossaryTerm term="Pc" />), ranked by risk and explained in plain words, limits included.</p>
          <button type="button" className="how__link" onClick={() => onGo('overview')}>Browse the catalog</button>
        </li>
      </ol>
    </section>
  )
}
