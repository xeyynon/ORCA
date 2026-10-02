import { Badge } from '../../atoms/Badge/Badge'
import { days } from '@/lib/format'
import { tleAgeTone } from '@/lib/tleAge'

type Props = { ageDays: number }

export function TleAgeChip({ ageDays }: Props) {
  const ahead = ageDays < 0
  return (
    <Badge
      tone={tleAgeTone(ageDays)}
      title={ahead
        ? "This element set's epoch is later than this computer's clock. Check the system time, or the source published a forward epoch."
        : 'Age of the TLE epoch relative to the propagation time. Older elements propagate less accurately.'}
    >
      {ahead ? `TLE epoch ${days(-ageDays)} ahead` : `TLE ${days(ageDays)} old`}
    </Badge>
  )
}
