import { REGIME_COLOR } from '@/lib/chartColors'
import { integer } from '@/lib/format'
import { REGIME_NAME, regimeShares, sharePercent } from '@/lib/homeStory'
import type { Regime } from '@/lib/orbit'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import { BentoTile } from '../BentoTile/BentoTile'
import './RegimeTile.css'

type Props = {
  counts: Record<Regime, number> | null
  /** Every object counted, classified or not: the denominator of each share. */
  total: number | null
  /** Objects whose orbit could not be classified (bad mean motion). Stated, never dropped. */
  unclassified: number
  /** Which objects the counts cover. */
  scope: string | null
  loading: boolean
  unavailable: string | null
}

/**
 * Where the objects are: one stacked bar of the four regimes, each named with its count and share in text, so the
 * colour (--cat-*, from the legend palette) is never the only carrier. The whole tile links to the Analytics charts.
 */
export function RegimeTile({ counts, total, unclassified, scope, loading, unavailable }: Props) {
  const shares = counts && total ? regimeShares(counts, total) : null
  const said = shares?.map((s) => `${s.regime} ${integer(s.count)} (${sharePercent(s.count, total)})`).join(', ')
  return (
    <BentoTile title="Orbit regimes" span={5} busy={loading && !shares} link={{ label: 'Charts on Analytics', href: '#/analytics' }}>
      {shares ? (
        <>
          <div className="regime-tile__bar" role="img" aria-label={`Objects by orbit regime: ${said}`}>
            {shares.filter((s) => s.count > 0).map((s) => (
              <span key={s.regime} className="regime-tile__seg" style={{ flexGrow: s.fraction, background: REGIME_COLOR[s.regime] }} />
            ))}
          </div>
          <div className="regime-tile__legend">
            {shares.map((s) => (
              <LegendItem key={s.regime} color={REGIME_COLOR[s.regime]} label={`${s.regime}, ${REGIME_NAME[s.regime]}`} value={`${integer(s.count)} · ${sharePercent(s.count, total)}`} />
            ))}
          </div>
          {unclassified > 0 ? <p className="regime-tile__note">{integer(unclassified)} could not be classified (no valid mean motion).</p> : null}
        </>
      ) : loading ? (
        <><Skeleton width="100%" height="12px" /><Skeleton width="80%" /><Skeleton width="70%" /></>
      ) : <p className="regime-tile__note">{unavailable ?? 'No objects to classify.'}</p>}
      {scope && shares ? <p className="regime-tile__note">{scope}</p> : null}
    </BentoTile>
  )
}
