import type { ApiStatus } from '@/hooks/useHealth'
import { integer } from '@/lib/format'
import { formatUtc } from '@/lib/time'
import { Mono } from '../../atoms/Mono/Mono'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { BentoTile } from '../BentoTile/BentoTile'
import './SystemTile.css'

type Props = {
  apiStatus: ApiStatus
  /** Objects stored by the API; null until /health has answered. */
  storedCount: number | null
  /** When the API last stored a Celestrak fetch (naive UTC from the API). */
  lastRefresh: string | null
  /** The commit this bundle was built from. */
  build: string
}

const TONE = { online: 'ok', offline: 'bad', checking: 'warn' } as const
const WORD = { online: 'Online', offline: 'Unreachable', checking: 'Checking…' } as const

/** The machinery behind the numbers: is the API answering, how much it holds, when it last refreshed, which build this is. */
export function SystemTile({ apiStatus, storedCount, lastRefresh, build }: Props) {
  const waiting = apiStatus === 'checking' && storedCount === null
  const missing = (v: string) => (waiting ? <Skeleton width="10ch" /> : <Mono>{v}</Mono>)
  return (
    <BentoTile title="System" span={6} busy={waiting}>
      <div className="system-tile__facts">
        <FactRow label="API"><StatusIndicator tone={TONE[apiStatus]} label={WORD[apiStatus]} /></FactRow>
        <FactRow label="Objects stored">{missing(integer(storedCount))}</FactRow>
        <FactRow label="Last refresh">{missing(formatUtc(lastRefresh))}</FactRow>
        <FactRow label="App build"><Mono>{build}</Mono></FactRow>
      </div>
      {apiStatus === 'offline' && storedCount === null ? <p className="system-tile__note">The API did not answer, so these figures are unknown. It keeps being checked in the background.</p> : null}
    </BentoTile>
  )
}
