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
  /** The API's state, folded in from the old System status section (declutter plan 2026-11-15). */
  apiStatus: 'checking' | 'online' | 'offline'
  onOpen: () => void
}

/**
 * "Data quality": how old the orbital data is and how the last fetch from the source went. The age of the data and the
 * time of a refresh are different things, and this panel is about the first. The API's state is its last row: a
 * connected API means ORCA can answer, not that the data is fresh, which is why it sits under the age.
 */
export function DataQuality({ medianAgeDays, newestAgeDays, measuredOver, storedTotal, lastFetch, offline, catalogFailed, apiStatus, onOpen }: Props) {
  const fresh = medianAgeDays !== null ? freshness(medianAgeDays) : null
  const fetch = fetchSummary(lastFetch)
  const subset = measuredOver !== null && storedTotal !== null && measuredOver < storedTotal
  return (
    <section className="home-panel data-quality" aria-labelledby="data-quality-title">
      <BlockHeader id="data-quality-title" title="Quality of data" sub="How long has it been since the data relating to an orbital object's elements were measured? Where did it come from?"
        action={<ArrowLink label="Go to the Data page" onClick={onOpen} />} />
      <dl className="data-quality__list">
        <div className="data-quality__row data-quality__row--lead">
          <dt>Median TLE age</dt>
          <dd>
            {medianAgeDays !== null ? (
              <>
                <span className="data-quality__figure">{days(medianAgeDays)}</span>
                {fresh ? <span className="data-quality__word"><Dot tone={fresh.tone} /> {fresh.word}</span> : null}
              </>
            ) : catalogFailed ? <span className="data-quality__missing">Not available because the catalogue didn’t load</span> : <Skeleton width="8ch" />}
          </dd>
        </div>
        {fresh ? <p className="home-panel__note data-quality__explain">{fresh.explain}{subset ? ` This is based on the ${integer(measuredOver)} objects that are loaded.` : ''}</p> : null}
        <div className="data-quality__row">
          <dt>Newest orbit data</dt>
          <dd>{newestAgeDays !== null ? days(newestAgeDays) : catalogFailed ? '—' : <Skeleton width="6ch" />}</dd>
        </div>
        <div className="data-quality__row">
          <dt>Source</dt>
          <dd>Celestrak (public TLEs)</dd>
        </div>
        <div className="data-quality__row">
          <dt>Last download from Celestrak</dt>
          <dd>
            {offline ? <span className="data-quality__missing">Unknown, because the API isn’t responding</span> : (
              <span className="data-quality__word"><Dot tone={fetch.tone} /> {fetch.text}{lastFetch?.at ? <span className="data-quality__when"> · Recorded on {formatUtc(lastFetch.at)}</span> : null}</span>
            )}
          </dd>
        </div>
        <div className="data-quality__row">
          <dt>ORCA API</dt>
          <dd><span className="data-quality__word"><Dot tone={apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'bad' : 'warn'} /> {apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Not responding' : 'Checking'}</span></dd>
        </div>
      </dl>
    </section>
  )
}
