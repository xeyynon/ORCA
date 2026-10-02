import { useId } from 'react'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Label } from '../../atoms/Label/Label'
import { Mono } from '../../atoms/Mono/Mono'
import { Badge } from '../../atoms/Badge/Badge'
import './TimeScrubber.css'

type Props = {
  offsetHours: number
  /** The server's own timestamp for the snapshot on screen, or null while loading. */
  atIso: string | null
  onChange: (hours: number) => void
}

/** Slide up to 7 days ahead. The label shows the time the SERVER propagated to, not the slider value. */
export function TimeScrubber({ offsetHours, atIso, onChange }: Props) {
  const id = useId()
  const live = offsetHours === 0
  return (
    <div className="time-scrubber">
      <div className="time-scrubber__head">
        <Label htmlFor={id}>Time</Label>
        {live ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">+{offsetHours} h · frozen</Badge>}
      </div>
      <input id={id} className="time-scrubber__range" type="range" min={0} max={168} step={1} value={offsetHours} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="time-scrubber__foot">
        <Mono muted>{atIso ? formatUtc(atIso) : '—'}</Mono>
        <Button size="sm" variant="ghost" disabled={live} onClick={() => onChange(0)}>Back to live</Button>
      </div>
    </div>
  )
}
