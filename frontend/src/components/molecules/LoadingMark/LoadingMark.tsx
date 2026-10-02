import { useEffect, useRef } from 'react'
import { startOrbitAnimation } from '@/lib/orbitAnimation'
import './LoadingMark.css'

type Props = {
  /** Rendered edge length in px. */
  size?: number
}

/**
 * The ORCA loading mark: a globe, its orbit ring and a cloud of debris, with two objects that fly together, collide and
 * scatter fragments into the cloud, on a loop (geometry in lib/orbitScene.ts, drawing in lib/orbitAnimation.ts).
 * A host component: it owns one canvas and starts/stops the animation in its effect, nothing else. The motion is
 * decoration only; with prefers-reduced-motion it is a single still frame.
 */
export function LoadingMark({ size = 96 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    return startOrbitAnimation(canvas, { size })
  }, [size])

  return (
    <span className="loading-mark" style={{ width: size, height: size }} aria-hidden="true">
      <canvas ref={ref} className="loading-mark__canvas" />
    </span>
  )
}
