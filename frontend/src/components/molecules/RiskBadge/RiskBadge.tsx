import type { RiskLevel } from '@/api/types'
import { riskTone } from '@/lib/risk'
import { Badge } from '../../atoms/Badge/Badge'

type Props = { level: RiskLevel }

/** Risk is a dot AND a word (the dot comes from Badge): status is never colour alone. */
export function RiskBadge({ level }: Props) {
  return <Badge tone={riskTone(level)}>{level}</Badge>
}
