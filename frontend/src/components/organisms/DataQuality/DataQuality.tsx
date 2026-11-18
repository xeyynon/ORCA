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
  /** When the stored catalog was last updated from CelesTrak (the API's last_update); null = never through ORCA. */
  lastUpdate: string | null
  /** The most recent download attempt. Shown only when it failed: a success is the update time above. */
  lastFetch: FetchOutcome | null
  /** Whether ORCA's server has answered at least once, so lastUpdate and lastFetch are known. */
  known: boolean
  /** The server is not answering now: the values above are the last known ones, from the last contact. */
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
export function DataQuality({ medianAgeDays, newestAgeDays, measuredOver, storedTotal, lastUpdate, lastFetch, known, offline, catalogFailed, apiStatus, onOpen }: Props) {
  const fresh = medianAgeDays !== null ? freshness(medianAgeDays) : null
  const failedFetch = lastFetch && lastFetch.status !== 'ok' ? fetchSummary(lastFetch) : null
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
            ) : catalogFailed ? <span className="data-quality__missing">Not available because the catalog didn’t load</span> : <Skeleton width="8ch" />}
          </dd>
        </div>
        {fresh ? <p className="home-panel__note data-quality__explain">{fresh.explain}{subset ? ` This is based on the ${integer(measuredOver)} objects that are loaded.` : ''}</p> : null}
        <div className="data-quality__row">
          <dt>Newest orbit data</dt>
          <dd>{newestAgeDays !== null ? days(newestAgeDays) : catalogFailed ? '—' : <Skeleton width="6ch" />}</dd>
        </div>
        <div className="data-quality__row">
          <dt>Source</dt>
          <dd>CelesTrak (public TLEs)</dd>
        </div>
        {/* One time and one wording for a refresh, here, on the Data page and in the hero (audit 2026-11-18 #18). */}
        <div className="data-quality__row">
          <dt>Last updated from CelesTrak</dt>
          <dd>
            {!known ? (offline ? <span className="data-quality__missing">Not known yet</span> : <Skeleton width="12ch" />) : (
              <span className="data-quality__word">
                {lastUpdate ? <span className="data-quality__when">{formatUtc(lastUpdate)}</span> : 'Not recorded (the catalog was loaded another way)'}
                {offline ? <span className="data-quality__missing"> · as of last contact</span> : null}
              </span>
            )}
          </dd>
        </div>
        {known && failedFetch && lastFetch ? (
          <div className="data-quality__row">
            <dt>Last download attempt</dt>
            <dd><span className="data-quality__word"><Dot tone={failedFetch.tone} /> {failedFetch.text}<span className="data-quality__when"> · {formatUtc(lastFetch.at)}</span></span></dd>
          </div>
        ) : null}
        <div className="data-quality__row">
          <dt>ORCA API</dt>
          <dd><span className="data-quality__word"><Dot tone={apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'bad' : 'warn'} /> {apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Not responding' : 'Checking'}</span></dd>
        </div>
      </dl>
    </section>
  )
}
