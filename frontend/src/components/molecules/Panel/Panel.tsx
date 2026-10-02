import type { ReactNode } from 'react'
import { Label } from '../../atoms/Label/Label'
import './Panel.css'

type Props = { title?: string; children: ReactNode }

/** The one card used for every side-panel section, so the cards cannot drift apart. */
export function Panel({ title, children }: Props) {
  return (
    <section className="panel">
      {title ? <div className="panel__title"><Label>{title}</Label></div> : null}
      <div className="panel__body">{children}</div>
    </section>
  )
}
