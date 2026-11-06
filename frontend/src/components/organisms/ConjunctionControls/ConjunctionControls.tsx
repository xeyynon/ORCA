import type { ConjunctionQuery } from '@/api/endpoints'
import { expectedRuntimeMinutes } from '@/lib/conjunctionSummary'
import { integer } from '@/lib/format'
import { Button } from '../../atoms/Button/Button'
import { NumberField } from '../../molecules/NumberField/NumberField'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import './ConjunctionControls.css'

type Props = {
  query: ConjunctionQuery
  catalogSize: number | null
  /** Screening step and report distance from the API's method description; null until it loads. */
  stepS: number | null
  reportKm: number | null
  running: boolean
  onChange: (q: ConjunctionQuery) => void
  onRun: () => void
}

/**
 * Ranges mirror the API's own validation (api_server.search_conjunctions) so a 422 is never the first line of defence.
 * There is no step control: the server fixes the step so that no approach closer than the report distance can fall
 * between two steps. A user-chosen coarse step was how the old search missed ~99 % of close approaches.
 */
export function ConjunctionControls({ query, catalogSize, stepS, reportKm, running, onChange, onRun }: Props) {
  const tooSmall = catalogSize !== null && catalogSize < 2
  const minutes = catalogSize !== null ? expectedRuntimeMinutes(catalogSize, query.horizonDays) : null
  return (
    <div className="conj-controls">
      <div className="conj-controls__fields">
        <NumberField label="Horizon" value={query.horizonDays} min={1} max={7} step={1} unit="days" onChange={(v) => onChange({ ...query, horizonDays: v })} />
        <NumberField label="Rows to show" value={query.limit} min={1} max={1000} step={10} onChange={(v) => onChange({ ...query, limit: v })} />
        <div className="conj-controls__run">
          <Button variant="primary" disabled={running || tooSmall || catalogSize === null} onClick={onRun}>
            {running ? 'Searching…' : 'Run search'}
          </Button>
        </div>
      </div>
      {tooSmall ? (
        <FieldNote>A search needs at least 2 objects and the catalog has {integer(catalogSize)}. Load TLEs from the Data view first.</FieldNote>
      ) : stepS === null || reportKm === null ? (
        // The step and distance come from the API. Until they arrive, say so instead of printing a sentence with holes in it.
        <FieldNote>Loading how the search works…</FieldNote>
      ) : (
        <FieldNote>
          Every object is propagated with <GlossaryTerm term="SGP4" /> every {stepS} s and every approach closer than {reportKm} km is found:
          the screening distance is wide enough that none can pass between two steps. Counts cover everything found; the table shows
          the most probable rows.{minutes !== null ? ` Expect about ${minutes < 1 ? 'a minute or less' : `${Math.round(minutes)} min`} for ${integer(catalogSize)} objects over ${query.horizonDays} day${query.horizonDays === 1 ? '' : 's'}, depending on the machine running the API.` : ''}
        </FieldNote>
      )}
    </div>
  )
}
