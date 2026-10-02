import { ALTITUDE_BAND_COLOR } from '@/lib/chartColors'
import { integer } from '@/lib/format'
import { ALTITUDE_BANDS } from '@/lib/orbit'
import type { AltitudeBand } from '@/lib/orbit'
import { Label } from '../../atoms/Label/Label'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import './GlobeLegend.css'

const BAND_LABEL: Record<AltitudeBand, string> = { LEO: 'LEO (<2,000 km)', MEO: 'MEO', GEO: 'GEO (≈35,786 km)', BEYOND: 'Beyond GEO' }

type Props = { shown: number; total: number | null; bandCounts: Record<AltitudeBand, number> }

/** Objects are coloured by their CURRENT altitude (a position snapshot carries no eccentricity), same palette as the Analytics charts. */
export function GlobeLegend({ shown, total, bandCounts }: Props) {
  return (
    <div className="globe-legend">
      <Label>Objects by current altitude</Label>
      {ALTITUDE_BANDS.map((b) => (
        <LegendItem key={b} shape="circle" color={ALTITUDE_BAND_COLOR[b]} label={BAND_LABEL[b]} value={integer(bandCounts[b])} />
      ))}
      <LegendItem shape="circle" color="var(--text-primary)" label="Selected" />
      <LegendItem color="var(--globe-orbit)" label="Orbit, one period" />
      {total !== null && total > shown ? (
        <div className="globe-legend__cap">Showing {integer(shown)} of {integer(total)} objects (position request is capped).</div>
      ) : null}
    </div>
  )
}
