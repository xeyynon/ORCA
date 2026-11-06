import type { BadgeTone } from '../../atoms/Badge/Badge'
import { Dot } from '../../atoms/Dot/Dot'
import { Mono } from '../../atoms/Mono/Mono'
import './SystemStatus.css'

export interface SystemField {
  label: string
  /** Null: not known yet (an em dash). */
  value: string | null
  tone?: BadgeTone
  title?: string
}

type Props = { fields: readonly SystemField[]; note?: string }

/**
 * "ORCA system status": the readings the bottom strip shows on other pages, readable on the home page (Section 05 of the
 * spec). Visually secondary: no card, a hairline above, small labels. The API being connected says nothing about how
 * fresh the data is, and the note says so.
 */
export function SystemStatus({ fields, note }: Props) {
  return (
    <section className="sys-status" aria-labelledby="sys-status-title">
      <h2 id="sys-status-title" className="sys-status__title">ORCA system status</h2>
      <dl className="sys-status__grid">
        {fields.map((f) => (
          <div key={f.label} className="sys-status__item" title={f.title}>
            <dt className="sys-status__label">{f.label}</dt>
            <dd className="sys-status__value">
              {f.tone ? <Dot tone={f.tone} /> : null}
              <Mono muted={f.value === null}>{f.value ?? '—'}</Mono>
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className="sys-status__note">{note}</p> : null}
    </section>
  )
}
