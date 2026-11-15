import type { ReactNode } from 'react'
import './PageLayout.css'

type Props = {
  children: ReactNode
  /** One centred reading column (960 px) for a page with no wide table or chart, such as Data. */
  narrow?: boolean
}

/** Scrolling, padded column for a content view. Layout only. */
export function PageLayout({ children, narrow = false }: Props) {
  return <main className="page-layout" id="main-content" tabIndex={-1}><div className={narrow ? 'page-layout__inner page-layout__inner--narrow' : 'page-layout__inner'}>{children}</div></main>
}
