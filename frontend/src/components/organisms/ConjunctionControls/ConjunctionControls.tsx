import type { ConjunctionQuery } from '@/api/endpoints'
import { integer } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { NumberField } from '../../molecules/NumberField/NumberField'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import './ConjunctionControls.css'

type Props = {
  query: ConjunctionQuery
  catalogSize: number | null
  running: boolean
  onChange: (q: ConjunctionQuery) => void
  onRun: () => void
}

/** Ranges mirror the API's own validation (api_server.search_conjunctions) so a 422 is never the first line of defence. */
export function ConjunctionControls({ query, catalogSize, running, onChange, onRun }: Props) {
  const tooSmall = catalogSize !== null && catalogSize < 2
  return (
    <div className="conj-controls">
      <div className="conj-controls__fields">
        <NumberField label="Horizon" value={query.horizonDays} min={1} max={30} step={1} unit="days" onChange={(v) => onChange({ ...query, horizonDays: v })} />
        <NumberField label="Search step" value={query.stepHours} min={0.5} max={12} step={0.5} unit="h" onChange={(v) => onChange({ ...query, stepHours: v })} />
        <NumberField label="Max results" value={query.limit} min={1} max={1000} step={10} onChange={(v) => onChange({ ...query, limit: v })} />
        <div className="conj-controls__run">
          <Button variant="primary" disabled={running || tooSmall || catalogSize === null} onClick={onRun}>
            {running ? 'Searching…' : 'Run search'}
          </Button>
        </div>
      </div>
      {tooSmall ? (
        <FieldNote>A search needs at least 2 objects and the catalog has {integer(catalogSize)}. Load TLEs from the Data view first.</FieldNote>
      ) : (
        <FieldNote>
          Coarse-then-fine screening: the whole catalog is propagated every {query.stepHours} h, pairs within the screening distance are
          kept, then each pair's time of closest approach is refined. A pass that closes entirely between two steps can be missed;
          a smaller step is slower but misses less.
        </FieldNote>
      )}
    </div>
  )
}
