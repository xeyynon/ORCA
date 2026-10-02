import type { ReactNode } from 'react'
import './Kbd.css'

type Props = { children: ReactNode }

export function Kbd({ children }: Props) {
  return <kbd className="kbd">{children}</kbd>
}
