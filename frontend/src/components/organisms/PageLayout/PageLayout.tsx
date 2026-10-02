import type { ReactNode } from 'react'
import './PageLayout.css'

type Props = { children: ReactNode }

/** Scrolling, padded column for a content view. Layout only. */
export function PageLayout({ children }: Props) {
  return <main className="page-layout"><div className="page-layout__inner">{children}</div></main>
}
