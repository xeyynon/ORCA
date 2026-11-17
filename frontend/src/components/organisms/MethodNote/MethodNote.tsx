import { FieldNote } from '../../molecules/FieldNote/FieldNote'

type Props = { propagator: string | null; oldestTleAgeDays: number | null }

/**
 * States the method and its limits next to the numbers (rules.md §2.6). The propagator name is read
 * from the API response, never hard-coded, so it cannot go stale when the backend changes.
 */
export function MethodNote({ propagator, oldestTleAgeDays }: Props) {
  return (
    <FieldNote>
      Positions are calculated with {propagator ?? '—'} from public TLEs
      {oldestTleAgeDays !== null ? ` (the oldest orbit data in the catalog is ${oldestTleAgeDays.toFixed(0)} days old)` : ''}.
      Accuracy drops as TLEs get older. This is an educational demonstration and is not meant for operational decisions.
    </FieldNote>
  )
}
