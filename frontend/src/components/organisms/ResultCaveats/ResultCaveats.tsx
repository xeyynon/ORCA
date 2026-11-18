import type { ReactNode } from 'react'
import { Callout } from '../../molecules/Callout/Callout'
import './ResultCaveats.css'

type Props = {
  items: readonly string[]
  /** One action that answers the first caveat (a saved run: "Run a fresh search"). */
  action?: ReactNode
}

/**
 * Every caveat that applies to this result, in ONE callout instead of a stack of them pushing the answer off screen.
 * Nothing is dropped: each caveat the page used to show as its own box is still here, in order of importance.
 */
export function ResultCaveats({ items, action }: Props) {
  if (items.length === 0) return null
  return (
    <Callout tone="warn" title={`${items.length} ${items.length === 1 ? 'thing' : 'things'} to know before you use this result`}>
      <ul className="result-caveats">{items.map((t) => <li key={t}>{t}</li>)}</ul>
      {action ? <div className="result-caveats__action">{action}</div> : null}
    </Callout>
  )
}
