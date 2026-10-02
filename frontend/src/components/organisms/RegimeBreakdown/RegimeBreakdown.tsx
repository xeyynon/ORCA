import { REGIME_COLOR } from '@/lib/chartColors'
import { REGIMES } from '@/lib/orbit'
import type { Regime } from '@/lib/orbit'
import { DonutChart } from '../DonutChart/DonutChart'

type Props = { counts: Record<Regime, number> }

/** Orbit regime share: four parts of one whole, so a donut. */
export function RegimeBreakdown({ counts }: Props) {
  return <DonutChart ariaLabel="Objects by orbit regime" centerLabel="objects" slices={REGIMES.map((r) => ({ label: r, value: counts[r], color: REGIME_COLOR[r] }))} />
}
