import { Dot } from '../../atoms/Dot/Dot'
import type { BadgeTone } from '../../atoms/Badge/Badge'
import { Label } from '../../atoms/Label/Label'
import { Mono } from '../../atoms/Mono/Mono'
import { NO_DATA } from '@/lib/time'
import './StatusField.css'

type Props = { label: string; value: string | null; tone?: BadgeTone; title?: string }

/** One labelled reading in the status bar. The label is always visible; a missing value is an em dash. */
export function StatusField({ label, value, tone, title }: Props) {
  return (
    <span className="status-field" title={title}>
      <Label inline>{label}</Label>
      {tone ? <Dot tone={tone} /> : null}
      <span className={value ? 'status-field__value' : 'status-field__value status-field__value--missing'}>
        <Mono>{value ?? NO_DATA}</Mono>
      </span>
    </span>
  )
}
