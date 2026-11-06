import type { Notice } from '@/lib/notices'
import { Dot } from '../../atoms/Dot/Dot'
import './NoticeRow.css'

type Props = { notice: Notice; onSelect: () => void }

/** One notification as a menu row: a status dot AND words (never colour alone), the title, and one line of detail. */
export function NoticeRow({ notice, onSelect }: Props) {
  return (
    <button type="button" role="menuitem" tabIndex={-1} className="notice-row" onClick={onSelect}>
      <span className="notice-row__dot"><Dot tone={notice.tone} /></span>
      <span className="notice-row__text">
        <span className="notice-row__title">{notice.title}</span>
        <span className="notice-row__detail">{notice.detail}</span>
      </span>
    </button>
  )
}
