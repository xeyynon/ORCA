import type { TleRecord } from '@/api/types'
import { fixed } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { percentileRank } from '@/lib/percentile'
import { ageDays } from '@/lib/time'
import { RangeMarker } from '../../molecules/RangeMarker/RangeMarker'
import { Panel } from '../../molecules/Panel/Panel'

/** The loaded catalog's values, each sorted ascending once per catalog change. */
export interface CatalogRanks { altKm: readonly number[]; inclDeg: readonly number[]; ecc: readonly number[]; ageDays: readonly number[] }

type Props = { tle: TleRecord; ranks: CatalogRanks; now: Date }

/** Where the selected object sits among the loaded catalog on four measures. Unlike the catalog-wide charts, this changes with every object. */
export function ObjectStanding({ tle, ranks, now }: Props) {
  const alt = deriveOrbit(tle)?.meanAltKm
  const age = ageDays(tle.epoch, now)
  return (
    <Panel title="Compared with the catalog">
      <RangeMarker label="Altitude" value={alt === undefined ? '—' : `${fixed(alt, 0)} km`} percent={alt === undefined ? null : percentileRank(ranks.altKm, alt)} />
      <RangeMarker label="Inclination" value={`${fixed(tle.inclination, 1)}°`} percent={percentileRank(ranks.inclDeg, tle.inclination)} />
      <RangeMarker label="Eccentricity" value={fixed(tle.eccentricity, 5)} percent={percentileRank(ranks.ecc, tle.eccentricity)} />
      <RangeMarker label="TLE age" value={`${fixed(age, 1)} d`} percent={age >= 0 ? percentileRank(ranks.ageDays, age) : null} />
    </Panel>
  )
}
