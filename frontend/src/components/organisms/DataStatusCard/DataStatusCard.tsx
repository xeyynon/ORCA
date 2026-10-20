import type { FetchOutcome } from '@/api/types'
import { formatUtc } from '@/lib/time'
import { integer, days } from '@/lib/format'
import { Label } from '../../atoms/Label/Label'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { Mono } from '../../atoms/Mono/Mono'
import { TleAgeChip } from '../../molecules/TleAgeChip/TleAgeChip'
import './DataStatusCard.css'

type Props = {
  count: number | null
  /** From the API's own cache table; null = the catalog was never refreshed through the API. */
  lastUpdate: string | null
  /** The API's most recent Celestrak fetch outcome; null if none is recorded yet. */
  lastFetch: FetchOutcome | null
  newestAgeDays: number | null
  oldestAgeDays: number | null
}

export function DataStatusCard({ count, lastUpdate, lastFetch, newestAgeDays, oldestAgeDays }: Props) {
  return (
    <section className="data-status">
      <Label>Catalog status</Label>
      <div className="data-status__grid">
        <FactRow label="Objects stored"><Mono>{integer(count)}</Mono></FactRow>
        <FactRow label="Last refresh">
          {lastUpdate ? <Mono>{formatUtc(lastUpdate)}</Mono> : <Mono muted>{count ? 'Not refreshed from this app' : 'Never'}</Mono>}
        </FactRow>
        <FactRow label="Last Celestrak fetch">
          {lastFetch ? <Mono>{lastFetch.status === 'ok' ? 'ok' : lastFetch.detail} ({formatUtc(lastFetch.at)})</Mono> : <Mono muted>None since the server started</Mono>}
        </FactRow>
        <FactRow label="Newest TLE">
          {newestAgeDays !== null ? <TleAgeChip ageDays={newestAgeDays} /> : <Mono muted>—</Mono>}
        </FactRow>
        <FactRow label="Oldest TLE">
          {oldestAgeDays !== null ? <Mono>{days(oldestAgeDays)}</Mono> : <Mono muted>—</Mono>}
        </FactRow>
      </div>
      <FieldNote>“Last refresh” is when ORCA last saved a download from Celestrak. It says nothing about how old the orbital data is: each TLE has its own date, shown under Newest and Oldest TLE.</FieldNote>
    </section>
  )
}
