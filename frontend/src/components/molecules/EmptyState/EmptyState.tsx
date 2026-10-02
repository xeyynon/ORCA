import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Spinner } from '../../atoms/Spinner/Spinner'
import './EmptyState.css'

/**
 * The kinds of "nothing to show" (rules.md §2.4-2.5). They look different on purpose:
 *  idle     - nothing requested yet; waiting for the user to act (no spinner: nothing is in flight)
 *  awaiting - a request is in flight or the catalog has not loaded
 *  na       - does not apply, with the reason
 *  none     - the run completed and found nothing: a RESULT, shown neutral
 *  error    - the request failed: never presented as an empty result
 */
export type EmptyKind = 'idle' | 'awaiting' | 'na' | 'none' | 'error'

type Props = { kind: EmptyKind; title: string; children?: ReactNode; action?: ReactNode }

export function EmptyState({ kind, title, children, action }: Props) {
  return (
    <div className={cx('empty', `empty--${kind}`)} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'awaiting' ? <Spinner size={16} /> : null}
      <div className="empty__title">{title}</div>
      {children ? <div className="empty__body">{children}</div> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  )
}
