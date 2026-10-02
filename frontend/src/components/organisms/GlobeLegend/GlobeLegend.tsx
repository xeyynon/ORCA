import { integer } from '@/lib/format'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import './GlobeLegend.css'

type Props = { shown: number; total: number | null }

export function GlobeLegend({ shown, total }: Props) {
  return (
    <div className="globe-legend">
      <LegendItem shape="circle" color="var(--globe-object)" label="Catalog object" value={integer(shown)} />
      <LegendItem shape="circle" color="var(--accent)" label="Selected" />
      <LegendItem color="var(--globe-orbit)" label="Orbit, one period" />
      {total !== null && total > shown ? (
        <div className="globe-legend__cap">Showing {integer(shown)} of {integer(total)} objects (position request is capped).</div>
      ) : null}
    </div>
  )
}
