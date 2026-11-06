import type { QuickReply } from '@/lib/askOrca'
import './QuickReplyChips.css'

type Props = { chips: readonly QuickReply[]; onPick: (chip: QuickReply) => void }

/** Suggested replies under the conversation. Real buttons: each sends its words as if typed. */
export function QuickReplyChips({ chips, onPick }: Props) {
  if (chips.length === 0) return null
  return (
    <div className="quick-replies" role="group" aria-label="Suggested questions">
      {chips.map((c) => (
        <button key={`${c.label}|${c.say ?? ''}`} type="button" className="quick-replies__chip" onClick={() => onPick(c)}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
