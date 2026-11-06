import { fixed } from '@/lib/format'
import { STALE_MEDIAN_DAYS } from '@/lib/staleness'
import { Mono } from '../../atoms/Mono/Mono'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { ValueUnit } from '../../molecules/ValueUnit/ValueUnit'
import { BentoTile } from '../BentoTile/BentoTile'
import './FreshnessTile.css'

type Props = {
  medianAgeDays: number | null
  oldestAgeDays: number | null
  newestAgeDays: number | null
  /** Element sets dated later than the clock: counted apart, never shown as a negative age. */
  futureEpochs: number
  loading: boolean
  /** Which objects the ages cover, when that is not the whole catalog. */
  scope: string | null
  unavailable: string | null
}

/**
 * How old the element sets are. Neutral by default; the status is a dot and a word, and it only says "stale" past the
 * same threshold as the page notice (lib/staleness), so the two never disagree. The whole tile links to the Data page.
 */
export function FreshnessTile({ medianAgeDays, oldestAgeDays, newestAgeDays, futureEpochs, loading, scope, unavailable }: Props) {
  const known = medianAgeDays !== null
  const stale = known && medianAgeDays > STALE_MEDIAN_DAYS
  const waiting = loading && !known
  return (
    <BentoTile title="Data freshness" span={4} busy={waiting} link={{ label: 'Data page', href: '#/data' }}>
      <p className="fresh-tile__figure">
        <span className="fresh-tile__number">{known ? <ValueUnit value={fixed(medianAgeDays, 1)} unit="days" /> : waiting ? <Skeleton width="5ch" height="var(--text-2xl)" /> : <Mono>—</Mono>}</span>
        <span className="fresh-tile__caption">median element-set age</span>
      </p>
      {known ? (
        <div className="fresh-tile__status">
          <StatusIndicator tone={stale ? 'warn' : 'ok'} label={stale ? 'Stale' : 'Fresh'} />
          <span className="fresh-tile__why">
            {stale ? 'Accuracy falls quickly with age: treat positions and risks as indicative.' : `The median is within ${STALE_MEDIAN_DAYS} days.`}
          </span>
        </div>
      ) : unavailable && !waiting ? <p className="fresh-tile__note">{unavailable}</p> : null}
      <div className="fresh-tile__facts">
        <FactRow label="Oldest">{waiting ? <Skeleton width="6ch" /> : <ValueUnit value={fixed(oldestAgeDays, 1)} unit="days" />}</FactRow>
        <FactRow label="Newest">{waiting ? <Skeleton width="6ch" /> : <ValueUnit value={fixed(newestAgeDays, 1)} unit="days" />}</FactRow>
      </div>
      {futureEpochs > 0 ? <p className="fresh-tile__note">{futureEpochs} element {futureEpochs === 1 ? 'set is' : 'sets are'} dated after the clock and left out of the ages.</p> : null}
      {scope ? <p className="fresh-tile__note">{scope}</p> : null}
    </BentoTile>
  )
}
