import { cx } from '@/lib/cx'
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

/**
 * Names every colour on the globe. Altitude means CURRENT altitude (a position snapshot carries no eccentricity).
 * On wide screens the side panels already key the colours (Filters: altitude bands; Catalog: object types), so the
 * colour list shows only on narrow screens, where those panels are below the fold (one home per fact, audit
 * 2026-11-15). The selection, orbit and closest-approach marks are keyed only here, so they always show.
 */
export function GlobeLegend({ colorBy, shown, total, showOrbit, hasConjunction, hasSelection }: Props) {
  const capped = total !== null && total > shown
  const marks = hasSelection || showOrbit || hasConjunction
  return (
    <div className={cx('globe-legend', !marks && !capped && 'globe-legend--key-only')}>
      <div className="globe-legend__key">
        <Label>{colorBy === 'altitude' ? 'Objects by current altitude' : 'Objects by type'}</Label>
        <div className="globe-legend__items">
          {colorBy === 'altitude'
            ? ALTITUDE_BANDS.map((b) => <LegendItem key={b} shape="circle" color={ALTITUDE_BAND_COLOR[b]} label={ALTITUDE_BAND_LABEL[b]} />)
            : OBJECT_TYPES.map((t) => <LegendItem key={t} shape="circle" color={OBJECT_TYPE_COLOR[t]} label={OBJECT_TYPE_LABEL[t]} />)}
        </div>
      </div>
      {hasSelection ? <LegendItem shape="circle" color="var(--text-primary)" label="Selected" /> : null}
      {showOrbit ? <LegendItem color="var(--globe-orbit)" label="Orbit of selected, one period" /> : null}
      {hasConjunction ? <LegendItem color="var(--risk-high)" label="Closest approach (dashed line)" /> : null}
      {capped ? <div className="globe-legend__cap">Drawing {integer(shown)} of {integer(total)} objects (filters and the request cap apply).</div> : null}
    </div>
  )
}
