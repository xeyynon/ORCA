import { Badge } from '../../atoms/Badge/Badge'
import { days } from '@/lib/format'
import { tleAgeTone } from '@/lib/tleAge'

type Props = { ageDays: number }

export function TleAgeChip({ ageDays }: Props) {
  return (
    <Badge tone={tleAgeTone(ageDays)} title="Age of the TLE epoch relative to the propagation time. Older elements propagate less accurately.">
      TLE {days(ageDays)} old
    </Badge>
  )
}
