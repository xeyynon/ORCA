import { cx } from '@/lib/cx'
import { Spinner } from '../../atoms/Spinner/Spinner'
import './ChatMessage.css'

type Props = {
  role: 'user' | 'orca'
  text: string
  /** A reply still on its way: shown with a small spinner. */
  pending?: boolean
  /** An AI answer: labelled with its model, a note that it may be wrong, and the facts it was given. */
  ai?: { model: string; label: string; facts: readonly string[] }
}

/**
 * One line of the Ask ORCA conversation. The user's words sit right on an accent-tinted surface; ORCA's sit left on the
 * card surface. Who said it is also in text (hidden visually), so the log reads the same without the layout.
 */
export function ChatMessage({ role, text, pending, ai }: Props) {
  return (
    <div className={cx('chat-msg', `chat-msg--${role}`)}>
      <div className="chat-msg__bubble">
        <span className="chat-msg__who">{role === 'user' ? 'You:' : 'ORCA:'}</span>
        {ai ? <span className="chat-msg__ai" title={ai.label}>Answered by AI · Using {ai.model}</span> : null}
        <p className="chat-msg__text">
          {text}
          {pending ? <span className="chat-msg__wait"><Spinner size={11} label="Working" /></span> : null}
        </p>
        {ai ? (
          <>
            <p className="chat-msg__note">An AI answer: it may be wrong. Check it against the pages.</p>
            <details className="chat-msg__facts">
              <summary>What it was given ({ai.facts.length} facts)</summary>
              <ul>{ai.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            </details>
          </>
        ) : null}
      </div>
    </div>
  )
}
