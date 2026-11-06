import { useId } from 'react'
import type { ReactNode } from 'react'
import { GLOSSARY } from '@/lib/glossary'
import type { GlossaryTermKey } from '@/lib/glossary'
import './GlossaryTerm.css'

type Props = { term: GlossaryTermKey; children?: ReactNode }

/**
 * A technical term with its plain-language meaning, reachable by hover AND keyboard focus (a title attribute is neither
 * visible on touch nor reachable by Tab). The definition comes from lib/glossary.ts so a term reads the same everywhere.
 * Do not place it inside a button or link: it is focusable itself.
 */
export function GlossaryTerm({ term, children }: Props) {
  const id = useId()
  return (
    <span className="term" tabIndex={0} aria-describedby={id}>
      {children ?? term}
      <span className="term__tip" role="tooltip" id={id}>{GLOSSARY[term]}</span>
    </span>
  )
}
