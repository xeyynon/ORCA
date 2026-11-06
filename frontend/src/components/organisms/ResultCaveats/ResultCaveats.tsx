import { Callout } from '../../molecules/Callout/Callout'
import './ResultCaveats.css'

type Props = { items: readonly string[] }

/**
 * Every caveat that applies to this result, in ONE callout instead of a stack of them pushing the answer off screen.
 * Nothing is dropped: each caveat the page used to show as its own box is still here, in order of importance.
 */
export function ResultCaveats({ items }: Props) {
  if (items.length === 0) return null
  return (
    <Callout tone="warn" title={items.length === 1 ? 'Read this before using the result' : `${items.length} things to know before using the result`}>
      <ul className="result-caveats">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </Callout>
  )
}
