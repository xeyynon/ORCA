import { NO_DATA } from '@/lib/time'
import { pcParts } from '@/lib/format'
import { Mono } from '../../atoms/Mono/Mono'
import './PcValue.css'

type Props = { value: number | null | undefined }

/** A probability of collision as 1.96 × 10⁻⁷ with a real superscript. Zero prints as 0, a missing value as the dash. */
export function PcValue({ value }: Props) {
  const parts = pcParts(value)
  if (parts === null) return <Mono muted={value === null || value === undefined}>{value === 0 ? '0' : NO_DATA}</Mono>
  return (
    <Mono>
      {parts.mantissa} × 10<sup className="pc-value__exp">{parts.exponent}</sup>
    </Mono>
  )
}
