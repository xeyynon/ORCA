import { useEffect, useRef, useState } from 'react'
import { EarthScene } from '@/globe/EarthScene'
import type { ColorMode, ConjunctionOverlay, LabelSpec, Snapshot } from '@/globe/EarthScene'
import type { CameraGeo, Vec3 } from '@/lib/coords'
import type { Theme } from '@/lib/theme'
import { GlobeTooltip } from '../../molecules/GlobeTooltip/GlobeTooltip'
import './GlobeCanvas.css'

export interface FocusRequest { id: string; nonce: number }

type Props = {
  snapshot: Snapshot | null
  selectedIds: readonly string[]
  orbitPaths: ReadonlyMap<string, Vec3[]>
  autoRotate: boolean
  theme: Theme
  focus: FocusRequest | null
  colorMode: ColorMode
  conjunction: ConjunctionOverlay | null
  labels: readonly LabelSpec[]
  /** Increment to send the camera back to its default view. */
  resetNonce: number
  nameOf: (id: string) => string
  onPick: (id: string | null) => void
  onCamera: (geo: CameraGeo) => void
}

/** Hosts the three.js scene. Props flow in through EarthScene's methods; nothing else touches three (rules.md §5.6). */
export function GlobeCanvas({ snapshot, selectedIds, orbitPaths, autoRotate, theme, focus, colorMode, conjunction, labels, resetNonce, nameOf, onPick, onCamera }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<EarthScene | null>(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const cameraRef = useRef(onCamera)
  cameraRef.current = onCamera
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [webglError, setWebglError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let scene: EarthScene
    try {
      scene = new EarthScene(host, { onHover: setHover, onPick: (id) => pickRef.current(id), onCamera: (g) => cameraRef.current(g) })
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL could not start')
      return
    }
    sceneRef.current = scene
    return () => { scene.dispose(); sceneRef.current = null }
  }, [])

  useEffect(() => { if (snapshot) sceneRef.current?.setSnapshot(snapshot) }, [snapshot])
  useEffect(() => { sceneRef.current?.setSelection(selectedIds) }, [selectedIds])
  useEffect(() => { sceneRef.current?.setOrbitPaths(orbitPaths) }, [orbitPaths])
  useEffect(() => { sceneRef.current?.setAutoRotate(autoRotate) }, [autoRotate])
  useEffect(() => { sceneRef.current?.setTheme() }, [theme])
  useEffect(() => { sceneRef.current?.setColorMode(colorMode) }, [colorMode])
  useEffect(() => { sceneRef.current?.setConjunction(conjunction) }, [conjunction])
  useEffect(() => { sceneRef.current?.setLabels(labels) }, [labels])
  useEffect(() => { if (resetNonce > 0) sceneRef.current?.resetView() }, [resetNonce])
  useEffect(() => { if (focus) sceneRef.current?.focus(focus.id) }, [focus])

  return (
    <div className="globe-canvas" ref={hostRef}>
      {webglError ? <div className="globe-canvas__error" role="alert">The 3D globe needs WebGL, which is unavailable here ({webglError}). The other views still work.</div> : null}
      {hover ? <GlobeTooltip name={nameOf(hover.id)} id={hover.id} x={hover.x} y={hover.y} /> : null}
    </div>
  )
}
