import type { ReactNode } from 'react'
import './FieldNote.css'

type Props = { children: ReactNode }

/**
 * A limitation stated next to the figure it qualifies (rules.md §2.6). Quiet on purpose: it informs, it does not alarm.
 * No icon: its place under the figure and its quieter ink say what it is (a circled "i" is a listed generic tell,
 * playbook UI-17; audit 2026-11-15 #4).
 */
export function FieldNote({ children }: Props) {
  return <p className="field-note">{children}</p>
}
