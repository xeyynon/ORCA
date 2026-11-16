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
        ? "This orbit data is dated later than your computer's clock. Either check your system time, or the source has published a future epoch."
        : 'How old the TLE epoch is compared with the propagation time. Older orbit data gives less accurate positions.'}
    >
      {ahead ? `TLE epoch ${days(-ageDays)} ahead` : `TLE ${days(ageDays)} old`}
    </Badge>
  )
}
