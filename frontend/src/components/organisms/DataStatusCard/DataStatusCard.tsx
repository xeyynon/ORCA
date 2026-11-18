import type { FetchOutcome } from '@/api/types'
import { formatUtc } from '@/lib/time'
import { integer, days } from '@/lib/format'
import { Label } from '../../atoms/Label/Label'
import { fetchSummary } from '@/lib/homeBoard'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { Mono } from '../../atoms/Mono/Mono'
import { TleAgeChip } from '../../molecules/TleAgeChip/TleAgeChip'
import './DataStatusCard.css'

type Props = {
  count: number | null
  /** When the stored catalog was last updated from CelesTrak (the API's last_update); null = never through ORCA. */
  lastUpdate: string | null
  /** The most recent download attempt; shown only when it failed (a success is the update time above). */
  lastFetch: FetchOutcome | null
  newestAgeDays: number | null
  oldestAgeDays: number | null
}

export function DataStatusCard({ count, lastUpdate, lastFetch, newestAgeDays, oldestAgeDays }: Props) {
  const failedFetch = lastFetch && lastFetch.status !== 'ok' ? fetchSummary(lastFetch) : null
  return (
    <section className="data-status">
      <Label>Catalog status</Label>
      <div className="data-status__grid">
        <FactRow label="Number of objects in catalog"><Mono>{integer(count)}</Mono></FactRow>
        {/* One time and one wording for a refresh, as on Home (audit 2026-11-18 #18). */}
        <FactRow label="Last updated from CelesTrak">
          {lastUpdate ? <Mono>{formatUtc(lastUpdate)}</Mono> : <Mono muted>not recorded (the catalog was loaded another way)</Mono>}
        </FactRow>
        {failedFetch && lastFetch ? (
          <FactRow label="Last download attempt">
            <StatusIndicator tone={failedFetch.tone} label={failedFetch.text} /> <Mono>{formatUtc(lastFetch.at)}</Mono>
          </FactRow>
        ) : null}
        <FactRow label="Newest orbit data">
          {newestAgeDays !== null ? <TleAgeChip ageDays={newestAgeDays} /> : <Mono muted>—</Mono>}
        </FactRow>
        <FactRow label="Oldest orbit data">
          {oldestAgeDays !== null ? <Mono>{days(oldestAgeDays)}</Mono> : <Mono muted>—</Mono>}
        </FactRow>
      </div>
      <FieldNote>“Last updated from CelesTrak” is when ORCA last downloaded the catalog. It is not how old the orbit data is: each object’s data was measured earlier, and the newest and oldest ages above show how long ago.</FieldNote>
    </section>
  )
}
