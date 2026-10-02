import { Dot } from '../../atoms/Dot/Dot'
import type { BadgeTone } from '../../atoms/Badge/Badge'
import { Label } from '../../atoms/Label/Label'
import { Mono } from '../../atoms/Mono/Mono'
import { NO_DATA } from '@/lib/time'
import './StatusField.css'

type Props = {
  label: string
  value: string | null
  tone?: BadgeTone
  title?: string
  /** Show only the dot. The value stays available to screen readers and as a tooltip, so the state is never colour alone for them. */
  dotOnly?: boolean
}

/** One labelled reading in the status bar. The label is always visible; a missing value is an em dash. */
export function StatusField({ label, value, tone, title, dotOnly = false }: Props) {
  const hidden = dotOnly && value !== null
  return (
    <span className="status-field" title={title ?? (hidden ? `${label}: ${value}` : undefined)}>
      <Label inline>{label}</Label>
      {tone ? <Dot tone={tone} /> : null}
      {hidden ? (
        <span className="status-field__sr">{value}</span>
      ) : (
        <span className={value ? 'status-field__value' : 'status-field__value status-field__value--missing'}>
          <Mono>{value ?? NO_DATA}</Mono>
        </span>
      )}
    </span>
  )
}
