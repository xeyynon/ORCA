import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { PASSWORD_MASK } from '@/lib/evaluator'
import './CredentialRow.css'

type Props = {
  /** What the value is, e.g. "Username". Names the group and the copy button. */
  label: string
  value: string
  /** Masked until revealed. */
  secret?: boolean
  revealed?: boolean
  onToggleReveal?: () => void
  /** Set briefly after a copy of this row succeeded. */
  copied?: boolean
  onCopy: () => void
}

/** One line of a shared login: the value in mono, selectable as a fallback to the copy button. */
export function CredentialRow({ label, value, secret = false, revealed = false, onToggleReveal, copied = false, onCopy }: Props) {
  const hidden = secret && !revealed
  return (
    <div className="cred-row" role="group" aria-label={label}>
      <span className="cred-row__value">
        {hidden ? (
          <>
            <span aria-hidden="true"><Mono>{PASSWORD_MASK}</Mono></span>
            <span className="cred-row__sr">{label} hidden</span>
          </>
        ) : (
          <Mono>{value}</Mono>
        )}
      </span>
      {secret && onToggleReveal ? (
        <IconButton label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} pressed={revealed} onClick={onToggleReveal}>
          <Icon name={revealed ? 'eye-off' : 'eye'} />
        </IconButton>
      ) : null}
      <IconButton label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`} onClick={onCopy}>
        <Icon name={copied ? 'check' : 'copy'} />
      </IconButton>
    </div>
  )
}
