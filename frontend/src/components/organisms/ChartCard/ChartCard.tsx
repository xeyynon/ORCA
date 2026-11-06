import type { ReactNode } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import { Label } from '../../atoms/Label/Label'
import './ChartCard.css'

type Props = {
  title: string
  note?: string
  /** What the chart covers ("All 15,970 objects", "First 5,000 of 15,970 objects"). Visible, because a hover note is not read. */
  scope?: string
  children: ReactNode
}

/**
 * Frame for one chart: a caption, the chart, and (behind an info icon, so it does not crowd the chart) the note stating
 * the basis: units, derivation, caps. Cards in a row stretch to the same height; the chart centres in the space left.
 */
export function ChartCard({ title, note, scope, children }: Props) {
  return (
    <section className="chart-card">
      <div className="chart-card__head">
        <div className="chart-card__title">
          <Label>{title}</Label>
          {scope ? <span className="chart-card__scope">{scope}</span> : null}
        </div>
        {note ? <span className="chart-card__info" title={note} role="img" aria-label={note}><Icon name="info" size={14} /></span> : null}
      </div>
      <div className="chart-card__body">{children}</div>
    </section>
  )
}
