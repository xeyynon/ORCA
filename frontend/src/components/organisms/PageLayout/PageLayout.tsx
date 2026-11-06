import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './PageLayout.css'

type Props = {
  /** The content is at least as tall as the visible page (a landing page that should fill the screen). */
  fill?: boolean
  children: ReactNode
}

/** Scrolling, padded column for a content view. Layout only. */
export function PageLayout({ fill = false, children }: Props) {
  return <main className="page-layout" id="main-content" tabIndex={-1}><div className={cx('page-layout__inner', fill && 'page-layout__inner--fill')}>{children}</div></main>
}
