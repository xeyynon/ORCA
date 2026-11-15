import type { ReactNode } from 'react'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import './ChartCard.css'

type Props = {
  title: string
  note?: string
  /** What the chart covers ("All 15,970 objects", "First 5,000 of 15,970 objects"). Visible, because a hover note is not read. */
  scope?: string
  children: ReactNode
}

/**
 * Frame for one chart: a title (a real heading, sentence case), what it covers, the chart, and the note stating its
 * basis (units, derivation, caps) as a visible line under it. The note used to hide behind an info icon's tooltip,
 * which a phone cannot open (audit 2026-11-15 #4). Cards in a row stretch to the same height; the chart centres.
 */
export function ChartCard({ title, note, scope, children }: Props) {
  return (
    <section className="chart-card">
      <div className="chart-card__head">
        <h2 className="chart-card__title">{title}</h2>
        {scope ? <span className="chart-card__scope">{scope}</span> : null}
      </div>
      <div className="chart-card__body">{children}</div>
      {note ? <FieldNote>{note}</FieldNote> : null}
    </section>
  )
}
