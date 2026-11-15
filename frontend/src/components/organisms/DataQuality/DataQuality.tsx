import type { FetchOutcome } from '@/api/types'
import { days, integer } from '@/lib/format'
import { fetchSummary, freshness } from '@/lib/homeBoard'
import { formatUtc } from '@/lib/time'
import { Dot } from '../../atoms/Dot/Dot'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { ArrowLink } from '../../molecules/ArrowLink/ArrowLink'
import { BlockHeader } from '../../molecules/BlockHeader/BlockHeader'
import './DataQuality.css'

type Props = {
  medianAgeDays: number | null
  newestAgeDays: number | null
  /** How many objects the ages are measured over (the loaded subset), and the stored total. */
  measuredOver: number | null
  storedTotal: number | null
  lastFetch: FetchOutcome | null
  /** The API is not answering: the fetch outcome is unknown, not "none". */
  offline: boolean
  catalogFailed: boolean
  onOpen: () => void
}

/**
 * "Data quality": how old the orbital data is and how the last fetch from the source went. The age of the data and the
 * time of a refresh are different things, and this panel is about the first (the refresh time is in System status).
 */
export function DataQuality({ medianAgeDays, newestAgeDays, measuredOver, storedTotal, lastFetch, offline, catalogFailed, onOpen }: Props) {
  const fresh = medianAgeDays !== null ? freshness(medianAgeDays) : null
  const fetch = fetchSummary(lastFetch)
  const subset = measuredOver !== null && storedTotal !== null && measuredOver < storedTotal
  return (
    <section className="home-panel data-quality" aria-labelledby="data-quality-title">
      <BlockHeader id="data-quality-title" title="Data quality" sub="How old the orbit data is, and where it comes from."
        action={<ArrowLink label="Data and refresh" onClick={onOpen} />} />
      <dl className="data-quality__list">
        <div className="data-quality__row data-quality__row--lead">
          <dt>Median TLE age</dt>
          <dd>
            {medianAgeDays !== null ? (
              <>
                <span className="data-quality__figure">{days(medianAgeDays)}</span>
                {fresh ? <span className="data-quality__word"><Dot tone={fresh.tone} /> {fresh.word}</span> : null}
              </>
            ) : catalogFailed ? <span className="data-quality__missing">Not available: the catalogue did not load</span> : <Skeleton width="8ch" />}
          </dd>
        </div>
        {fresh ? <p className="home-panel__note data-quality__explain">{fresh.explain}{subset ? ` Measured over the ${integer(measuredOver)} loaded objects.` : ''}</p> : null}
        <div className="data-quality__row">
          <dt>Newest element set</dt>
          <dd>{newestAgeDays !== null ? days(newestAgeDays) : catalogFailed ? '—' : <Skeleton width="6ch" />}</dd>
        </div>
        <div className="data-quality__row">
          <dt>Source</dt>
          <dd>Celestrak, public TLEs</dd>
        </div>
        <div className="data-quality__row">
          <dt>Last fetch from the source</dt>
          <dd>
            {offline ? <span className="data-quality__missing">Unknown: the API is not answering</span> : (
              <span className="data-quality__word"><Dot tone={fetch.tone} /> {fetch.text}{lastFetch?.at ? <span className="data-quality__when"> · {formatUtc(lastFetch.at)}</span> : null}</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}
