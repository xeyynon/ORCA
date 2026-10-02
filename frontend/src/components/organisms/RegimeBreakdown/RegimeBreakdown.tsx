import { REGIMES } from '@/lib/orbit'
import type { Regime } from '@/lib/orbit'
import { BarList } from '../BarList/BarList'

type Props = { counts: Record<Regime, number> }

const COLORS: Record<Regime, string> = {
  LEO: 'var(--chart-1)',
  MEO: 'var(--chart-2)',
  GEO: 'var(--chart-3)',
  HEO: 'var(--text-tertiary)',
}

/** Orbit regime composition. Colours are neutral chart tokens, not status hues. */
export function RegimeBreakdown({ counts }: Props) {
  return <BarList ariaLabel="Objects by orbit regime" items={REGIMES.map((r) => ({ label: r, value: counts[r], color: COLORS[r] }))} />
}
