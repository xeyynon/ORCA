import type { ConjunctionEvent } from '@/api/types'
import { downloadText, toCsv } from './csv'

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

export function downloadConjunctionsJson(events: readonly ConjunctionEvent[]): void {
  downloadText(`orca-conjunctions-${stamp()}.json`, 'application/json', JSON.stringify(events, null, 2))
}

export function downloadConjunctionsCsv(events: readonly ConjunctionEvent[]): void {
  const header = ['sat1_id', 'sat1_name', 'sat2_id', 'sat2_name', 'tca_utc', 'min_distance_km', 'probability_of_collision', 'risk_level', 'relative_velocity_kms']
  const rows = events.map((e) => [e.sat1_id, e.sat1_name, e.sat2_id, e.sat2_name, e.tca, e.min_distance_km, e.probability_of_collision, e.risk_level, e.relative_velocity_kms])
  downloadText(`orca-conjunctions-${stamp()}.csv`, 'text/csv', toCsv(header, rows))
}
