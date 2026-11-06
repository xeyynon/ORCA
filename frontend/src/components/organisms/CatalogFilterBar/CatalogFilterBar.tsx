import { integer } from '@/lib/format'
import { REGIMES } from '@/lib/orbit'
import type { Regime } from '@/lib/orbit'
import { Button } from '../../atoms/Button/Button'
import { SearchField } from '../../molecules/SearchField/SearchField'
import { ToggleChip } from '../../molecules/ToggleChip/ToggleChip'
import './CatalogFilterBar.css'

type Props = {
  query: string
  regimes: readonly Regime[]
  /** Objects per regime among rows matching the text. */
  counts: Record<Regime, number>
  active: boolean
  /** Rows matching the filter, and rows loaded. */
  matchCount: number
  loadedCount: number
  /** Objects stored by the API; the filter cannot see the ones that were not loaded. */
  totalCount: number | null
  onQueryChange: (q: string) => void
  onToggleRegime: (r: Regime) => void
  onClear: () => void
}

/** Filters the loaded catalog rows. Says how many match, and that unloaded objects are out of reach. */
export function CatalogFilterBar({ query, regimes, counts, active, matchCount, loadedCount, totalCount, onQueryChange, onToggleRegime, onClear }: Props) {
  const partial = totalCount !== null && totalCount > loadedCount
  return (
    <div className="filter-bar" role="search" aria-label="Filter the catalog table">
      <div className="filter-bar__controls">
        <div className="filter-bar__field">
          <SearchField
            value={query}
            placeholder="Filter by name or NORAD id"
            ariaLabel="Filter catalog by name or NORAD id"
            onChange={onQueryChange}
            onKeyDown={(key) => { if (key === 'Escape' && query) onQueryChange('') }}
          />
        </div>
        <div className="filter-bar__chips" role="group" aria-label="Orbit regime">
          {REGIMES.map((r) => (
            <ToggleChip key={r} label={r} count={integer(counts[r])} pressed={regimes.includes(r)} onToggle={() => onToggleRegime(r)} />
          ))}
        </div>
        {active ? <Button onClick={onClear}>Clear</Button> : null}
      </div>
      <div className="filter-bar__status" role="status">
        {active ? `${integer(matchCount)} of ${integer(loadedCount)} loaded objects match.` : `${integer(loadedCount)} loaded objects.`}
        {partial ? ` The filter covers the loaded objects only; ${integer(totalCount)} are stored. Use the search box at the top for the rest.` : ''}
      </div>
    </div>
  )
}
