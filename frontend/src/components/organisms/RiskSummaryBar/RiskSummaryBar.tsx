import type { RiskLevel } from '@/api/types'
import { RISK_ORDER, riskTone } from '@/lib/risk'
import { integer } from '@/lib/format'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import './RiskSummaryBar.css'

type Props = { counts: Record<RiskLevel, number> }

/** Composition of the result set by risk tier: a stacked bar with a labelled legend (colour is never the only carrier). */
export function RiskSummaryBar({ counts }: Props) {
  return (
    <div className="risk-summary">
      <div className="risk-summary__bar" role="img" aria-label={RISK_ORDER.map((l) => `${counts[l]} ${l}`).join(', ')}>
        {RISK_ORDER.map((l) => counts[l] > 0 ? (
          <span key={l} className={`risk-summary__seg risk-summary__seg--${riskTone(l)}`} style={{ flexGrow: counts[l] }} />
        ) : null)}
      </div>
      <div className="risk-summary__legend">
        {RISK_ORDER.map((l) => (
          <LegendItem key={l} color={`var(--risk-${riskTone(l)})`} label={l} value={integer(counts[l])} />
        ))}
      </div>
    </div>
  )
}
