import { useMemo, useState } from 'react'
import type { Ref } from 'react'
import type { TleRecord } from '@/api/types'
import { searchObjects } from '@/lib/search'
import { SearchField } from '../../molecules/SearchField/SearchField'
import { SearchResultItem } from '../../molecules/SearchResultItem/SearchResultItem'
import './ObjectSearch.css'

type Props = { inputRef: Ref<HTMLInputElement>; catalog: readonly TleRecord[]; onPick: (id: string) => void }

/** Find any object by name or NORAD id. Enter picks the highlighted result; Esc clears. */
export function ObjectSearch({ inputRef, catalog, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useMemo(() => searchObjects(catalog, query), [catalog, query])

  const pick = (r: TleRecord) => { onPick(r.norad_cat_id); setQuery(''); setOpen(false) }

  const onKey = (key: string) => {
    if (key === 'ArrowDown') setActive((i) => Math.min(results.length - 1, i + 1))
    else if (key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (key === 'Enter' && results[active]) pick(results[active])
    else if (key === 'Escape') { setQuery(''); setOpen(false) }
  }

  return (
    <div className="object-search" onBlur={() => setOpen(false)}>
      <SearchField
        inputRef={inputRef}
        value={query}
        placeholder="Search objects by name or NORAD id"
        ariaLabel="Search objects"
        hint="/"
        onChange={(v) => { setQuery(v); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && query.trim() ? (
        <ul className="object-search__list" role="listbox" aria-label="Matching objects">
          {results.length === 0 ? (
            <li className="object-search__none">No object matches “{query.trim()}” in the loaded catalog</li>
          ) : (
            results.map((r, i) => (
              <SearchResultItem key={r.norad_cat_id} name={r.object_name} id={r.norad_cat_id} active={i === active} onPick={() => pick(r)} onHover={() => setActive(i)} />
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
