import { useId } from 'react'
import type { Ref } from 'react'
import { Button } from '../../atoms/Button/Button'
import './ChatComposer.css'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Enter, or the Send button. */
  onSubmit: () => void
  inputRef?: Ref<HTMLInputElement>
}

/** One line to type a question into. Its label ("Ask ORCA") is a real label, hidden visually because the panel heading says it. */
export function ChatComposer({ value, onChange, onSubmit, inputRef }: Props) {
  const id = useId()
  return (
    <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      <label className="chat-composer__label" htmlFor={id}>Ask ORCA</label>
      <input
        id={id}
        ref={inputRef}
        className="chat-composer__input"
        type="text"
        value={value}
        placeholder="Find ISS, how old is the data, what is Pc…"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={!value.trim()}>Send</Button>
    </form>
  )
}
