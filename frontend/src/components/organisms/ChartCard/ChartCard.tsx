import type { ReactNode } from 'react'
import { Label } from '../../atoms/Label/Label'
import './ChartCard.css'

type Props = { title: string; note?: string; children: ReactNode }

/** Frame for one chart: a caption, the chart, and a one-line note stating the basis (units, derivation, caps). */
export function ChartCard({ title, note, children }: Props) {
  return (
    <section className="chart-card">
      <Label>{title}</Label>
      <div className="chart-card__body">{children}</div>
      {note ? <div className="chart-card__note">{note}</div> : null}
    </section>
  )
}
