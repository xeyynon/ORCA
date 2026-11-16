import type { TleRecord } from '@/api/types'
import { fixed, integer } from '@/lib/format'
import { deriveOrbit } from '@/lib/orbit'
import { percentileRank, rankWords } from '@/lib/percentile'
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
  const among = 'loaded objects'
  const pAlt = alt === undefined ? null : percentileRank(ranks.altKm, alt)
  const pIncl = percentileRank(ranks.inclDeg, tle.inclination)
  const pEcc = percentileRank(ranks.ecc, tle.eccentricity)
  const pAge = age >= 0 ? percentileRank(ranks.ageDays, age) : null
  return (
    <Panel title="How it compares with the rest of the catalog">
      <RangeMarker label="Altitude" value={alt === undefined ? '—' : `${integer(alt)} km`} percent={pAlt} words={rankWords(pAlt, among)} />
      <RangeMarker label="Inclination" value={`${fixed(tle.inclination, 1)}°`} percent={pIncl} words={rankWords(pIncl, among)} />
      <RangeMarker label="Eccentricity" value={fixed(tle.eccentricity, 5)} percent={pEcc} words={rankWords(pEcc, among)} />
      <RangeMarker label="TLE age" value={`${fixed(age, 1)} d`} percent={pAge} words={pAge === null ? null : rankWords(pAge, among)?.replace(/^Higher/, 'Older').replace(/^Lower/, 'Newer') ?? null} />
    </Panel>
  )
}
