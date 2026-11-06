import { Dot } from '../../atoms/Dot/Dot'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import './HomeFacts.css'

export interface HomeFact {
  /** What the figure is about, for the button's accessible name ("Close approaches"). */
  topic: string
  /** The one big figure ("29"). Null while it loads (a skeleton), or when it does not exist (`missing` says why). */
  figure: string | null
  /** The words under the figure ("high-risk approaches, none critical"). */
  caption: string | null
  missing?: string
  /** A quieter second line ("none critical"). */
  note?: string | null
  /** A small status word with a dot, e.g. "Indicative only". Never colour alone. */
  status?: { tone: 'warn' | 'ok'; word: string }
  /** Where the figure leads, said in the tooltip and the accessible name. */
  goLabel: string
  onSelect: () => void
}

type Props = { facts: readonly HomeFact[] }

/**
 * "Right now": three live figures in the hero, each a big number, a few words, and a way in (the whole figure is the
 * button). The detail lives on its own view. Every figure is real; a missing one is a skeleton while loading and a
 * plain reason after.
 */
export function HomeFacts({ facts }: Props) {
  return (
    <section className="facts" aria-label="Right now">
      <ul className="facts__list">
        {facts.map((f) => (
          <li key={f.topic} className="facts__item">
            <button type="button" className="facts__btn" onClick={f.onSelect} title={f.goLabel}
              aria-label={f.figure !== null
                ? `${f.topic}: ${f.figure} ${f.caption ?? ''}${f.note ? `, ${f.note}` : ''}${f.status ? ` (${f.status.word})` : ''}. ${f.goLabel}`
                : `${f.topic}${f.missing ? `: ${f.missing}` : ''}. ${f.goLabel}`}>
              <span className="facts__figure">
                {f.figure !== null ? f.figure : f.missing ? <span className="facts__missing">{f.missing}</span> : <Skeleton width="4ch" />}
              </span>
              <span className="facts__caption">{f.figure !== null ? f.caption : f.topic}</span>
              {f.note || f.status ? (
                <span className="facts__meta">
                  {f.status ? <><Dot tone={f.status.tone} /> {f.status.word}</> : f.note}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
