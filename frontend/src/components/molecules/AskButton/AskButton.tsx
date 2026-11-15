import { Icon } from '../../atoms/Icon/Icon'
import './AskButton.css'

type Props = {
  open: boolean
  onToggle: () => void
}

/**
 * Ask ORCA, one click from every page (owner, 2026-11-15: it was hidden in the menu). A labelled button in the top bar's
 * right capsule beside search; icon only on phones (the label stays for screen readers and the tooltip). Pressed while
 * the panel is open. The "." key does the same.
 */
export function AskButton({ open, onToggle }: Props) {
  return (
    <button type="button" className="ask-btn" aria-pressed={open} title="Ask ORCA (.)" onClick={onToggle} data-tour="ask">
      <Icon name="chat" size={15} />
      <span className="ask-btn__label">Ask ORCA</span>
    </button>
  )
}
