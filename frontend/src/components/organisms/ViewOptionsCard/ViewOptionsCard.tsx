import type { ColorBy, GlobePrefs } from '@/lib/globePrefs'
import { Label } from '../../atoms/Label/Label'
import { Switch } from '../../atoms/Switch/Switch'
import { Panel } from '../../molecules/Panel/Panel'
import { SegmentedControl } from '../../molecules/SegmentedControl/SegmentedControl'
import './ViewOptionsCard.css'

type Props = {
  prefs: GlobePrefs
  onChange: (patch: Partial<GlobePrefs>) => void
  /** Whether a conjunction is currently shown on the globe. */
  conjunctionActive: boolean
}

const NO_CONJUNCTION = 'No conjunction is active. Use “Show both objects on the globe” in the Conjunctions view.'

export function ViewOptionsCard({ prefs, onChange, conjunctionActive }: Props) {
  return (
    <Panel title="View options">
      <Switch label="Show satellites" checked={prefs.showSatellites} onChange={(v) => onChange({ showSatellites: v })} title="Draw the catalog objects. Selected objects are always drawn." />
      <Switch label="Show orbital paths" checked={prefs.showOrbits} onChange={(v) => onChange({ showOrbits: v })} title="One full orbit for each selected object" />
      <Switch label="Show conjunction" checked={prefs.showConjunction} onChange={(v) => onChange({ showConjunction: v })} disabled={!conjunctionActive} title={conjunctionActive ? undefined : NO_CONJUNCTION} />
      <Switch label="Label selected objects" checked={prefs.labelSelected} onChange={(v) => onChange({ labelSelected: v })} />
      <div className="view-options__color">
        <Label>Colour objects by</Label>
        <SegmentedControl<ColorBy>
          ariaLabel="Colour objects by"
          value={prefs.colorBy}
          options={[{ value: 'altitude', label: 'Altitude' }, { value: 'type', label: 'Object type' }]}
          onChange={(colorBy) => onChange({ colorBy })}
        />
      </div>
    </Panel>
  )
}
