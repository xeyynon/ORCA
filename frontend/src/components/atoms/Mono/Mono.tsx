import type { ReactNode } from 'react'
import './Mono.css'

type Props = { children: ReactNode; muted?: boolean }

/** Every number, id and timestamp is mono with tabular figures (rules.md §4.7). */
export function Mono({ children, muted = false }: Props) {
  return <span className={muted ? 'mono mono--muted' : 'mono'}>{children}</span>
}
