import { Dot } from '../../atoms/Dot/Dot'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import './HomeFacts.css'

export interface HomeFact {
  label: string
  /** The one figure or phrase. Null while it loads (a skeleton), or when it does not exist (`missing` says why). */
  value: string | null
  missing?: string
  /** A small status word with a dot, e.g. "Stale". Never colour alone. */
  status?: { tone: 'warn' | 'ok'; word: string }
  note?: string
  action: { label: string; onSelect: () => void }
}

type Props = { facts: readonly HomeFact[] }

/**
 * "Right now": three short facts for the curious, after the hook and the steps. Each is a label, one figure, and a way in;
 * the detail lives on its own view. Kept to one row so the page stays calm.
 */
export function HomeFacts({ facts }: Props) {
  return (
    <section className="facts" aria-labelledby="facts-title">
      <h2 id="facts-title" className="facts__title">Right now</h2>
      <dl className="facts__list">
        {facts.map((f) => (
          <div key={f.label} className="facts__item">
            <dt className="facts__label">{f.label}</dt>
            <dd className="facts__value">
              {f.value !== null ? f.value : f.missing ? <span className="facts__missing">{f.missing}</span> : <Skeleton width="12ch" />}
              {f.status ? <span className="facts__status"><Dot tone={f.status.tone} /> {f.status.word}</span> : null}
            </dd>
            {f.note ? <dd className="facts__note">{f.note}</dd> : null}
            <dd className="facts__action"><button type="button" className="facts__link" onClick={f.action.onSelect}>{f.action.label}</button></dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
