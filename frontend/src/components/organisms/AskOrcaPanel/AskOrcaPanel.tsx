import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import type { QuickReply } from '@/lib/askOrca'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { ChatComposer } from '../../molecules/ChatComposer/ChatComposer'
import { ChatMessage } from '../../molecules/ChatMessage/ChatMessage'
import { QuickReplyChips } from '../../molecules/QuickReplyChips/QuickReplyChips'
import './AskOrcaPanel.css'

export interface AskOrcaLine {
  id: number
  role: 'user' | 'orca'
  text: string
  chips?: readonly QuickReply[]
  ai?: { model: string; label: string; facts: readonly string[] }
  pending?: boolean
}

type Props = {
  messages: readonly AskOrcaLine[]
  onSend: (text: string) => void
  onPick: (chip: QuickReply) => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement | null>
  /** One line under the composer: where answers come from, and whether the AI is on. */
  footnote: string
}

/**
 * "Ask ORCA": a docked panel on the right (a bottom sheet on a phone). Not a modal: the page beside it stays usable.
 * Focus goes to the composer on open. Esc inside the panel closes it and is swallowed, so the app-wide Esc does not also
 * clear the selection on the same press; the caller returns focus to the button that opened it.
 * Suggested replies belong to the latest ORCA message and sit under the log, outside the live region, so a screen
 * reader hears the answer once and not a list of buttons with it.
 */
export function AskOrcaPanel({ messages, onSend, onPick, onClose, inputRef, footnote }: Props) {
  const [draft, setDraft] = useState('')
  const titleId = useId()
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [inputRef])

  // Keep the newest line in view, including a pending reply that fills in later.
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    // Again after layout settles: the suggestions row under the log can change height in the same update.
    const id = window.requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => window.cancelAnimationFrame(id)
  }, [messages])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
  }

  const submit = () => {
    if (!draft.trim()) return
    onSend(draft)
    setDraft('')
  }

  const last = messages[messages.length - 1]
  const chips = last && last.role === 'orca' && !last.pending ? last.chips ?? [] : []

  return (
    <aside className="ask-orca" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="ask-orca__head">
        <h2 className="ask-orca__title" id={titleId}>Ask ORCA</h2>
        <IconButton label="Close (Esc)" onClick={onClose}><Icon name="close" /></IconButton>
      </div>
      <div className="ask-orca__log" role="log" aria-live="polite" aria-label="Conversation" ref={logRef}>
        {messages.map((m) => <ChatMessage key={m.id} role={m.role} text={m.text} pending={m.pending} ai={m.ai} />)}
      </div>
      <div className="ask-orca__foot">
        <QuickReplyChips chips={chips} onPick={onPick} />
        <ChatComposer value={draft} onChange={setDraft} onSubmit={submit} inputRef={inputRef} />
        <p className="ask-orca__note">{footnote}</p>
      </div>
    </aside>
  )
}
