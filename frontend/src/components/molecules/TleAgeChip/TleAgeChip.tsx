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
        ? "This TLE is dated later than this computer's clock. Check the computer's time, or the source published a future date."
        : 'How old this TLE is at the time shown. Older TLEs give less accurate positions.'}
    >
      {ahead ? `TLE epoch ${days(-ageDays)} ahead` : `TLE ${days(ageDays)} old`}
    </Badge>
  )
}
