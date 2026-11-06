import type { ReactNode } from 'react'
import './BlockHeader.css'

type Props = {
  id: string
  title: string
  sub?: ReactNode
  /** A link-like action at the right ("View all conjunctions"). */
  action?: ReactNode
}

/** The heading of one block of a page below its h1: an h2 (labelling the block via `id`), a line under it, an action. */
export function BlockHeader({ id, title, sub, action }: Props) {
  return (
    <div className="block-header">
      <div className="block-header__text">
        <h2 id={id} className="block-header__title">{title}</h2>
        {sub ? <p className="block-header__sub">{sub}</p> : null}
      </div>
      {action ? <div className="block-header__action">{action}</div> : null}
    </div>
  )
}
