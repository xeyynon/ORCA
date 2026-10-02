import { FieldNote } from '../../molecules/FieldNote/FieldNote'

type Props = { propagator: string | null; oldestTleAgeDays: number | null }

/**
 * States the method and its limits next to the numbers (rules.md §2.6). The propagator name is read
 * from the API response, never hard-coded, so it cannot go stale when the backend changes.
 */
export function MethodNote({ propagator, oldestTleAgeDays }: Props) {
  return (
    <FieldNote>
      Positions use {propagator ?? '—'}, propagated from public TLEs
      {oldestTleAgeDays !== null ? ` (oldest element set in the catalog is ${oldestTleAgeDays.toFixed(0)} days old)` : ''}.
      Accuracy falls with TLE age. Educational demonstration only, not for operational decisions.
    </FieldNote>
  )
}
