import type { ReactNode } from 'react'
import './SectionHeader.css'

type Props = { title: string; subtitle?: string; actions?: ReactNode }

export function SectionHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-header__title">{title}</h2>
        {subtitle ? <p className="section-header__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="section-header__actions">{actions}</div> : null}
    </div>
  )
}
