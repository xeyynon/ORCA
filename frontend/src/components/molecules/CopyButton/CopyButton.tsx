import type { CopyState } from '@/lib/copyState'
import { copyMessage } from '@/lib/copyState'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import './CopyButton.css'

type Props = {
  /** What is copied, in lower case: "username". Names the button ("Copy username") and the announcement. */
  what: string
  /** From copyState(last, key) over hooks/useClipboard, which the view owns: this component never touches the clipboard. */
  state: CopyState
  onCopy: () => void
}

/**
 * A copy button that confirms. Its face turns from "Copy" to a tick and "Copied" while the hook remembers the copy
 * (about 1.5 s); the same fact is announced in a status region. If the clipboard is blocked (no secure context), the
 * fallback is said in words beside the button, because the value itself is selectable.
 */
export function CopyButton({ what, state, onCopy }: Props) {
  return (
    <span className="copy-btn" data-state={state}>
      <Button size="sm" variant="ghost" ariaLabel={`Copy ${what}`} title={`Copy ${what}`} onClick={onCopy}>
        <span className="copy-btn__faces">
          <span className="copy-btn__face copy-btn__face--idle"><Icon name="copy" size={14} />Copy</span>
          <span className="copy-btn__face copy-btn__face--done"><Icon name="check" size={14} />Copied</span>
        </span>
      </Button>
      <span className={state === 'failed' ? 'copy-btn__status' : 'copy-btn__status copy-btn__status--hidden'} role="status">
        {copyMessage(state, what)}
      </span>
    </span>
  )
}
