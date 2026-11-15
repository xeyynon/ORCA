import type { RiskLevel } from '@/api/types'
import { powerOfTen } from './format'

/** Severity order, worst first. The single source of ordering for tables, bars and legends. */
export const RISK_ORDER: readonly RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NEGLIGIBLE']

export type RiskTone = 'critical' | 'high' | 'medium' | 'low' | 'negligible'

export function riskTone(level: RiskLevel): RiskTone {
  return level.toLowerCase() as RiskTone
}

/** Severity rank: 0 = worst. Unknown strings sort last rather than throwing. */
export function riskRank(level: string): number {
  const i = RISK_ORDER.indexOf(level as RiskLevel)
  return i === -1 ? RISK_ORDER.length : i
}

/** Pc thresholds from README.md / conjunction_detection.py (NASA CARA / ESA calibrated). */
export const RISK_THRESHOLDS: ReadonlyArray<{ level: RiskLevel; minPc: number | null }> = [
  { level: 'CRITICAL', minPc: 1e-4 },
  { level: 'HIGH', minPc: 1e-5 },
  { level: 'MEDIUM', minPc: 1e-6 },
  { level: 'LOW', minPc: 1e-7 },
  { level: 'NEGLIGIBLE', minPc: null },
]

export function countByRisk(events: ReadonlyArray<{ risk_level: string }>): Record<RiskLevel, number> {
  const out: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NEGLIGIBLE: 0 }
  for (const e of events) if (e.risk_level in out) out[e.risk_level as RiskLevel] += 1
  return out
}

/**
 * The tier rule in words, from RISK_THRESHOLDS (the backend's classification, conjunction_detection.py: "Pc above"),
 * one line per tier: "CRITICAL: Pc above 10⁻⁴". Shown by the Conjunctions method and the report, so the thresholds are
 * written once and the same way as every Pc (audit 2026-11-15 #5).
 */
export function riskTierLines(): Array<{ level: RiskLevel; rule: string }> {
  return RISK_THRESHOLDS.map(({ level, minPc }) => ({
    level,
    rule: minPc != null ? `Pc above ${powerOfTen(Math.round(Math.log10(minPc)))}` : 'Pc at or below every threshold',
  }))
}

/** NASA's guidance that the tiers are set against (conjunction_detection.py header). */
export const RISK_TIER_SOURCE = `NASA's CA Handbook (2020) recommends mitigation above ${powerOfTen(-4)}.`
