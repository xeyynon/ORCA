import { useState } from 'react'
import type { Ref } from 'react'
import type { TleRecord } from '@/api/types'
import { SearchField } from '../../molecules/SearchField/SearchField'
import { SearchResultItem } from '../../molecules/SearchResultItem/SearchResultItem'
import './ObjectSearch.css'

type Props = {
  inputRef: Ref<HTMLInputElement>
  query: string
  onQueryChange: (q: string) => void
  results: readonly TleRecord[]
  loading: boolean
  /** The server search failed; `results` come from the loaded subset only. */
  degraded: boolean
  onPick: (id: string) => void
}

/** Find any stored object by name or NORAD id. Enter picks the highlighted result; Esc clears. Data comes in as props. */
export function ObjectSearch({ inputRef, query, onQueryChange, results, loading, degraded, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const q = query.trim()

  const pick = (r: TleRecord) => { onPick(r.norad_cat_id); onQueryChange(''); setOpen(false) }

  const onKey = (key: string) => {
    if (key === 'ArrowDown') setActive((i) => Math.min(results.length - 1, i + 1))
    else if (key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (key === 'Enter' && results[active]) pick(results[active])
    else if (key === 'Escape') { onQueryChange(''); setOpen(false) }
  }

  return (
    <div className="object-search" onBlur={() => setOpen(false)}>
      <SearchField
        inputRef={inputRef}
        value={query}
        placeholder="Search name or NORAD id"
        ariaLabel="Search objects"
        hint="/"
        onChange={(v) => { onQueryChange(v); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && q ? (
        <ul className="object-search__list" role="listbox" aria-label="Matching objects">
          {results.map((r, i) => (
            <SearchResultItem key={r.norad_cat_id} name={r.object_name} id={r.norad_cat_id} active={i === active} onPick={() => pick(r)} onHover={() => setActive(i)} />
          ))}
          {results.length === 0 ? (
            <li className="object-search__note">{loading ? 'Searching…' : `No object matches “${q}”${degraded ? ' in the loaded subset' : ''}`}</li>
          ) : null}
          {degraded ? <li className="object-search__note">Server search is unavailable: showing matches from the loaded subset only.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
