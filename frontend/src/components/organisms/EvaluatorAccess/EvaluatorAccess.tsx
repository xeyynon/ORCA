import { useId, useState } from 'react'
import type { Credential } from '@/lib/evaluator'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { CredentialRow } from '../../molecules/CredentialRow/CredentialRow'
import './EvaluatorAccess.css'

type Props = {
  credential: Credential
  /** The last copy attempt, by row key ("username" | "password"); null once its confirmation has faded. */
  lastCopy: { key: string; ok: boolean } | null
  onCopy: (key: 'username' | 'password', text: string) => void
  /** Put both values into the sign-in form. */
  onUse: () => void
}

/**
 * The shared demo login for evaluators, under the sign-in form. The password starts masked; reveal is local and
 * transient, so it never outlives the page. The middle button fills the form, which is quicker than two copies.
 */
export function EvaluatorAccess({ credential, lastCopy, onCopy, onUse }: Props) {
  const [revealed, setRevealed] = useState(false)
  const titleId = useId()
  const status = lastCopy == null ? '' : lastCopy.ok
    ? `${lastCopy.key === 'username' ? 'Username' : 'Password'} copied.`
    : 'Copying is blocked here. Select the text and copy it instead.'

  return (
    <section className="evaluator" aria-labelledby={titleId}>
      <h2 id={titleId} className="evaluator__title">Evaluator access</h2>
      <p className="evaluator__note">A shared login for reviewers of this project.</p>
      <div className="evaluator__box">
        <CredentialRow label="Username" value={credential.username}
          copied={lastCopy?.key === 'username' && lastCopy.ok} onCopy={() => onCopy('username', credential.username)} />
        <div className="evaluator__join">
          <span className="evaluator__use">
            <IconButton label="Fill the sign-in form" onClick={onUse}><Icon name="login" size={14} /></IconButton>
          </span>
        </div>
        <CredentialRow label="Password" value={credential.password} secret revealed={revealed}
          onToggleReveal={() => setRevealed((r) => !r)}
          copied={lastCopy?.key === 'password' && lastCopy.ok} onCopy={() => onCopy('password', credential.password)} />
      </div>
      <p className="evaluator__status" role="status">{status}</p>
    </section>
  )
}
