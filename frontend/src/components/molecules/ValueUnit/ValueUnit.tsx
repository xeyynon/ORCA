import { Mono } from '../../atoms/Mono/Mono'
import { Unit } from '../../atoms/Unit/Unit'
import { NO_DATA } from '@/lib/time'

type Props = { value: string; unit?: string }

/** A formatted number with its unit. A missing value shows the dash with no unit hanging off it. */
export function ValueUnit({ value, unit }: Props) {
  return (
    <span>
      <Mono>{value}</Mono>
      {unit && value !== NO_DATA ? <Unit>{unit}</Unit> : null}
    </span>
  )
}
