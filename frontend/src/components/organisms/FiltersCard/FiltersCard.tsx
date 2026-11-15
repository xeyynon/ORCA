import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import type { CatalogSummaryResponse } from '@/api/types'
import { ALTITUDE_BAND_COLOR } from '@/lib/chartColors'
import { integer } from '@/lib/format'
import type { GlobePrefs, TypeFilter } from '@/lib/globePrefs'
import { OBJECT_TYPES, OBJECT_TYPE_LABEL } from '@/lib/objectTypes'
import { ALTITUDE_BANDS, ALTITUDE_BAND_LABEL } from '@/lib/orbit'
import type { AltitudeBand } from '@/lib/orbit'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { Label } from '../../atoms/Label/Label'
import { CheckboxRow } from '../../molecules/CheckboxRow/CheckboxRow'
import { Panel } from '../../molecules/Panel/Panel'
import { SelectField } from '../../molecules/SelectField/SelectField'
import './FiltersCard.css'

type Props = {
  prefs: GlobePrefs
  onChange: (patch: Partial<GlobePrefs>) => void
  summary: CatalogSummaryResponse | null
  /** Objects per altitude band among those the globe has loaded (before filtering). */
  bandCounts: Record<AltitudeBand, number>
  /** False until positions have loaded: a count of 0 before then would read as "nothing is in orbit". */
  countsReady: boolean
  conjunctionActive: boolean
}

/** Filters only change what is DRAWN; a selected object is always shown, whatever the filters say. */
export function FiltersCard({ prefs, onChange, summary, bandCounts, countsReady, conjunctionActive }: Props) {
  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: summary ? `All objects (${integer(summary.total)})` : 'All objects' },
    ...OBJECT_TYPES.map((t) => ({ value: t as TypeFilter, label: summary ? `${OBJECT_TYPE_LABEL[t]} (${integer(summary.by_type[t])})` : OBJECT_TYPE_LABEL[t] })),
  ]
  return (
    <Panel title="Filters">
      <SelectField<TypeFilter> label="Object type" value={prefs.typeFilter} options={typeOptions} onChange={(typeFilter) => onChange({ typeFilter })} />
      <div className="filters__group">
        <div className="filters__title"><Label>Altitude band (current altitude)</Label></div>
        {ALTITUDE_BANDS.map((b) => (
          <CheckboxRow
            key={b}
            label={ALTITUDE_BAND_LABEL[b]}
            swatch={ALTITUDE_BAND_COLOR[b]}
            count={countsReady ? integer(bandCounts[b]) : <Skeleton width="4ch" />}
            checked={prefs.bands[b]}
            onChange={(v) => onChange({ bands: { ...prefs.bands, [b]: v } })}
          />
        ))}
      </div>
      <CheckboxRow
        label="Show only conjunction objects"
        checked={prefs.onlyConjunction}
        onChange={(v) => onChange({ onlyConjunction: v })}
        disabled={!conjunctionActive}
        title={conjunctionActive ? undefined : 'No conjunction is active.'}
      />
      {conjunctionActive ? null : <FieldNote>Available once a conjunction is shown on the globe.</FieldNote>}
    </Panel>
  )
}
