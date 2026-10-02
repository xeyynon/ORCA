import type { ReactNode } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import { Label } from '../../atoms/Label/Label'
import './ChartCard.css'

type Props = { title: string; note?: string; children: ReactNode }

/**
 * Frame for one chart: a caption, the chart, and (behind an info icon, so it does not crowd the chart) the note stating
 * the basis: units, derivation, caps. Cards in a row stretch to the same height; the chart centres in the space left.
 */
export function ChartCard({ title, note, children }: Props) {
  return (
    <section className="chart-card">
      <div className="chart-card__head">
        <Label>{title}</Label>
        {note ? <span className="chart-card__info" title={note} role="img" aria-label={note}><Icon name="info" size={14} /></span> : null}
      </div>
      <div className="chart-card__body">{children}</div>
    </section>
  )
}
