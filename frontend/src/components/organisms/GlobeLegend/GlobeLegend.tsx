import { ALTITUDE_BAND_COLOR, OBJECT_TYPE_COLOR } from '@/lib/chartColors'
import { integer } from '@/lib/format'
import type { ColorBy } from '@/lib/globePrefs'
import { OBJECT_TYPES, OBJECT_TYPE_LABEL } from '@/lib/objectTypes'
import { ALTITUDE_BANDS, ALTITUDE_BAND_LABEL } from '@/lib/orbit'
import { Label } from '../../atoms/Label/Label'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import './GlobeLegend.css'

type Props = {
  colorBy: ColorBy
  shown: number
  total: number | null
  showOrbit: boolean
  hasConjunction: boolean
  hasSelection: boolean
}

/** Names every colour on the globe. Altitude means CURRENT altitude (a position snapshot carries no eccentricity). */
export function GlobeLegend({ colorBy, shown, total, showOrbit, hasConjunction, hasSelection }: Props) {
  return (
    <div className="globe-legend">
      <Label>{colorBy === 'altitude' ? 'Objects by current altitude' : 'Objects by type'}</Label>
      {colorBy === 'altitude'
        ? ALTITUDE_BANDS.map((b) => <LegendItem key={b} shape="circle" color={ALTITUDE_BAND_COLOR[b]} label={ALTITUDE_BAND_LABEL[b]} />)
        : OBJECT_TYPES.map((t) => <LegendItem key={t} shape="circle" color={OBJECT_TYPE_COLOR[t]} label={OBJECT_TYPE_LABEL[t]} />)}
      {hasSelection ? <LegendItem shape="circle" color="var(--text-primary)" label="Selected" /> : null}
      {showOrbit ? <LegendItem color="var(--globe-orbit)" label="Orbit of selected, one period" /> : null}
      {hasConjunction ? <LegendItem color="var(--risk-high)" label="Closest approach (dashed line)" /> : null}
      {total !== null && total > shown ? <div className="globe-legend__cap">Showing {integer(shown)} of {integer(total)} objects. Your filters and the server's limit apply.</div> : null}
    </div>
  )
}
