import { useId } from 'react'
import { MAX_OFFSET_H, SPEEDS } from '@/lib/playback'
import type { Speed } from '@/lib/playback'
import { formatSimTime } from '@/lib/time'
import { Badge } from '../../atoms/Badge/Badge'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Mono } from '../../atoms/Mono/Mono'
import { SelectField } from '../../molecules/SelectField/SelectField'
import './PlaybackBar.css'

type Props = {
  offsetH: number
  playing: boolean
  speed: Speed
  /** The simulated time on screen, ms since 1970. */
  simMs: number
  /** Where the active conjunction's closest approach falls on the slider, hours from now; null if there is none or it is out of range. */
  tcaOffsetH: number | null
  onToggle: () => void
  onStep: (direction: -1 | 1) => void
  onSpeed: (speed: Speed) => void
  onScrub: (hours: number) => void
  onLive: () => void
  onResetView: () => void
  onFullscreen: () => void
}

const TICKS = Array.from({ length: 8 }, (_, d) => (d === 0 ? 'Now' : `+${d} day${d > 1 ? 's' : ''}`))

/** Play, pause and scrub the simulated clock up to 7 days ahead. The slider shows where a conjunction's closest approach is. */
export function PlaybackBar({ offsetH, playing, speed, simMs, tcaOffsetH, onToggle, onStep, onSpeed, onScrub, onLive, onResetView, onFullscreen }: Props) {
  const sliderId = useId()
  const live = offsetH === 0 && !playing
  return (
    <div className="playback">
      <div className="playback__buttons">
        <IconButton label={playing ? 'Pause' : 'Play'} pressed={playing} onClick={onToggle}><Icon name={playing ? 'pause' : 'play'} /></IconButton>
        <IconButton label="Back 1 hour" onClick={() => onStep(-1)}><Icon name="skip-back" /></IconButton>
        <IconButton label="Forward 1 hour" onClick={() => onStep(1)}><Icon name="skip-forward" /></IconButton>
        <SelectField<string> compact ariaLabel="Playback speed" value={String(speed)} options={SPEEDS.map((s) => ({ value: String(s), label: `${s}×` }))} onChange={(v) => onSpeed(Number(v) as Speed)} />
      </div>

      <div className="playback__track">
        <div className="playback__time">
          <label htmlFor={sliderId}><Mono>{formatSimTime(simMs)}</Mono></label>
          {live ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">{playing ? `Playing ${speed}×` : 'Paused'}</Badge>}
        </div>
        <div className="playback__slider">
          <input id={sliderId} className="playback__range" type="range" min={0} max={MAX_OFFSET_H} step={0.25} value={offsetH} onChange={(e) => onScrub(Number(e.target.value))} aria-label="Simulated time, hours from now" />
          {tcaOffsetH !== null ? <span className="playback__tca" style={{ left: `${(tcaOffsetH / MAX_OFFSET_H) * 100}%` }} title="Closest approach of the active conjunction" /> : null}
        </div>
        <div className="playback__ticks" aria-hidden="true">{TICKS.map((t) => <span key={t}>{t}</span>)}</div>
      </div>

      <div className="playback__tools">
        <Button size="sm" variant="ghost" disabled={live} onClick={onLive}>Back to live</Button>
        <IconButton label="Reset the camera" onClick={onResetView}><Icon name="locate" /></IconButton>
        <IconButton label="Fullscreen" onClick={onFullscreen}><Icon name="expand" /></IconButton>
      </div>
    </div>
  )
}
