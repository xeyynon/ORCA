import type { RiskLevel } from '@/api/types'
import { riskTone } from '@/lib/risk'
import { Badge } from '../../atoms/Badge/Badge'
import { Dot } from '../../atoms/Dot/Dot'

type Props = { level: RiskLevel }

/** Risk is a dot AND a word: status is never colour alone. */
export function RiskBadge({ level }: Props) {
  const tone = riskTone(level)
  return (
    <Badge tone={tone}>
      <Dot tone={tone} size={6} />
      {level}
    </Badge>
  )
}
