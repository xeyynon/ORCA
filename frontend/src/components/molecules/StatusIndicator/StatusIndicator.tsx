import { Dot } from '../../atoms/Dot/Dot'
import type { BadgeTone } from '../../atoms/Badge/Badge'
import './StatusIndicator.css'

type Props = { tone: BadgeTone; label: string }

/** Dot + plain text. Used where a pill would be too loud (rules.md: status is a dot and a word). */
export function StatusIndicator({ tone, label }: Props) {
  return (
    <span className="status-indicator">
      <Dot tone={tone} />
      <span>{label}</span>
    </span>
  )
}
