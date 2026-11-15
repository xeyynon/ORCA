import type { FetchOutcome } from '@/api/types'
import { formatUtc } from '@/lib/time'
import { integer, days } from '@/lib/format'
import { Label } from '../../atoms/Label/Label'
import { fetchSummary } from '@/lib/homeBoard'
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
        <FactRow label="Last refresh via API">
          {lastUpdate ? <Mono>{formatUtc(lastUpdate)}</Mono> : <Mono muted>never (seeded outside the API)</Mono>}
        </FactRow>
        <FactRow label="Last Celestrak fetch">
          {lastFetch ? <span>{fetchSummary(lastFetch).text}, <Mono>{formatUtc(lastFetch.at)}</Mono></span> : <Mono muted>none recorded</Mono>}
        </FactRow>
        <FactRow label="Newest element set">
          {newestAgeDays !== null ? <TleAgeChip ageDays={newestAgeDays} /> : <Mono muted>—</Mono>}
        </FactRow>
        <FactRow label="Oldest element set">
          {oldestAgeDays !== null ? <Mono>{days(oldestAgeDays)}</Mono> : <Mono muted>—</Mono>}
        </FactRow>
      </div>
      <FieldNote>“Last refresh” is when this API last stored a Celestrak fetch. It is not the age of the orbital data, which is the TLE epoch shown beside it.</FieldNote>
    </section>
  )
}
