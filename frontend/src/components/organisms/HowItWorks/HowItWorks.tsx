import type { IconName } from '../../atoms/Icon/Icon'
import { Icon } from '../../atoms/Icon/Icon'
import './HowItWorks.css'

type Props = {
  onGlobe: () => void
  onSearch: () => void
  onApproaches: () => void
}

type Step = { n: number; icon: IconName; name: string; text: string; go: string; onSelect: () => void }

/**
 * What ORCA does, in the order it does it (storytelling): track, screen, understand. A light strip under the hero, not
 * three more cards: each step is a number, a name, one plain line (no jargon on the landing page), and is itself the
 * way in to the view where that step happens.
 */
export function HowItWorks({ onGlobe, onSearch, onApproaches }: Props) {
  const steps: Step[] = [
    { n: 1, icon: 'globe', name: 'Track', text: 'Every catalogued object, placed from public orbit data on a 3D Earth.', go: 'Open the globe', onSelect: onGlobe },
    { n: 2, icon: 'orbit', name: 'Screen', text: 'Every pair checked for close passes over the coming days.', go: 'Run a search', onSelect: onSearch },
    { n: 3, icon: 'chart', name: 'Understand', text: 'Each approach ranked by its chance of collision, in plain words.', go: 'See the ranked approaches', onSelect: onApproaches },
  ]
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title" className="how__title">How ORCA works</h2>
      <ol className="how__steps">
        {steps.map((s) => (
          <li key={s.n} className="how__step">
            <button type="button" className="how__btn" onClick={s.onSelect} title={s.go}>
              <span className="how__icon" aria-hidden="true"><Icon name={s.icon} /></span>
              <span className="how__body">
                <span className="how__name">{s.name}</span>
                <span className="how__text">{s.text}</span>
                <span className="how__go">{s.go}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
