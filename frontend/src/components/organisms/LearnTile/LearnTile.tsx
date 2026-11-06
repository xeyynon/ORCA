import { GLOSSARY } from '@/lib/glossary'
import type { GlossaryTermKey } from '@/lib/glossary'
import { shortMeaning } from '@/lib/homeStory'
import { Button } from '../../atoms/Button/Button'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import { BentoTile } from '../BentoTile/BentoTile'
import './LearnTile.css'

type Props = {
  /** Starts the first-run tour. The button is shown only when a tour exists to start. */
  onStartTour?: () => void
}

/** The three words a newcomer meets first, in the order they meet them. Meanings come from lib/glossary. */
const TERMS: readonly GlossaryTermKey[] = ['TLE', 'TCA', 'Pc']

/** For a first visit: what ORCA is, a way into the tour, and the three terms that unlock the rest. */
export function LearnTile({ onStartTour }: Props) {
  return (
    <BentoTile title="New here?" span={3}>
      <p className="learn-tile__text">ORCA maps what is in orbit from public data and screens it for close approaches. Educational use, not operations.</p>
      {onStartTour ? <div><Button onClick={onStartTour}>Take the tour</Button></div> : null}
      <dl className="learn-tile__terms">
        {TERMS.map((t) => (
          <div key={t} className="learn-tile__term">
            <dt><GlossaryTerm term={t} /></dt>
            <dd>{shortMeaning(GLOSSARY[t])}</dd>
          </div>
        ))}
      </dl>
      <p className="learn-tile__hint">Hover or focus a term for its meaning.</p>
    </BentoTile>
  )
}
