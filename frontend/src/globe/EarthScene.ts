import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { readColorRef, readToken } from '@/lib/tokens'
import { ALTITUDE_BAND_COLOR } from '@/lib/chartColors'
import { ALTITUDE_BANDS, altitudeBand } from '@/lib/orbit'
import type { AltitudeBand } from '@/lib/orbit'
import {
  EARTH_RADIUS_KM, EARTH_ROTATION_RAD_S, SCENE_UNIT_KM,
  eciToScene, extrapolate, nearestScreenPoint, occludedBySphere,
} from '@/lib/coords'
import type { ScreenPoint, Vec3 } from '@/lib/coords'
import { buildEarthCanvas } from './earthTexture'

export interface SceneObject { id: string; name: string; r: Vec3; v: Vec3 }

export interface Snapshot {
  objects: readonly SceneObject[]
  /** Wall-clock ms that `r`/`v`/`gmstRad` correspond to. */
  epochMs: number
  gmstRad: number
  /** true: keep advancing positions and Earth rotation in real time; false: frozen at the snapshot (time scrub). */
  live: boolean
}

export interface SceneCallbacks {
  onHover: (hit: { id: string; x: number; y: number } | null) => void
  onPick: (id: string | null) => void
}

const R_SCENE = EARTH_RADIUS_KM / SCENE_UNIT_KM
const PICK_PX = 10
/** Never extrapolate further than this; past it the snapshot is stale and we hold position. */
const MAX_EXTRAPOLATE_S = 120

/**
 * The only place three.js is touched (rules.md §5.6). React talks to it through these methods and
 * nothing else: construct = mount, set* = update, dispose = unmount. ECI is the inertial frame; the
 * Earth mesh rotates inside it by GMST, orbit lines and satellites do not.
 */
export class EarthScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly earth: THREE.Mesh
  private readonly graticule: THREE.LineSegments
  private readonly points: THREE.Points
  private readonly selectedPoints: THREE.Points
  private readonly orbitGroup = new THREE.Group()
  private readonly resizeObs: ResizeObserver
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  private snapshot: Snapshot | null = null
  private selectedIds: string[] = []
  private orbitPaths = new Map<string, Vec3[]>()
  private hoveredId: string | null = null
  private autoRotate = true
  private focusTarget: THREE.Vector3 | null = null
  private raf = 0
  private disposed = false
  private screenPts: ScreenPoint[] = []
  private textureToken = 0
  private downAt: { x: number; y: number } | null = null
  private readonly bandColors = new Map<AltitudeBand, THREE.Color>()
  private colors: Float32Array | null = null
  private colorsDirty = false

  constructor(private readonly container: HTMLElement, private readonly cb: SceneCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400)
    this.camera.position.set(14, 7, 16)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = R_SCENE * 1.25
    this.controls.maxDistance = 90
    this.controls.autoRotateSpeed = 0.4
    this.controls.enablePan = false

    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(R_SCENE, 96, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0e14 }),
    )
    this.scene.add(this.earth)

    this.graticule = this.buildGraticule()
    this.earth.add(this.graticule)

    this.points = new THREE.Points(
      new THREE.BufferGeometry(),
      // vertexColors: each object is coloured by its altitude band (see rebuildColors)
      new THREE.PointsMaterial({ size: 3.5, sizeAttenuation: false, vertexColors: true }),
    )
    this.points.frustumCulled = false
    this.scene.add(this.points)

    this.selectedPoints = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, color: 0x7aa2f7 }),
    )
    this.selectedPoints.frustumCulled = false
    this.scene.add(this.selectedPoints)
    this.scene.add(this.orbitGroup)

    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(container)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave)
    this.renderer.domElement.addEventListener('click', this.onClick)

    this.setTheme()
    this.resize()
    this.loop()
  }

  // ---- public interface -------------------------------------------------------------------

  setSnapshot(s: Snapshot): void { this.snapshot = s; this.rebuildColors() }

  setSelection(ids: readonly string[]): void { this.selectedIds = [...ids] }

  setOrbitPaths(paths: ReadonlyMap<string, Vec3[]>): void {
    this.orbitPaths = new Map(paths)
    this.rebuildOrbitLines()
  }

  setAutoRotate(on: boolean): void { this.autoRotate = on }

  /** Re-read every colour token. Called on theme change; rebuilds the Earth texture for the new ocean/land colours. */
  setTheme(): void {
    // Selection is the theme's primary text colour (white on dark): an accent blue would blend into the LEO band colour.
    const accent = readToken('--text-primary', '#ffffff')
    for (const band of ALTITUDE_BANDS) this.bandColors.set(band, new THREE.Color(readColorRef(ALTITUDE_BAND_COLOR[band], '#cbd5e1')))
    this.rebuildColors()
    ;(this.selectedPoints.material as THREE.PointsMaterial).color.set(accent)
    ;(this.graticule.material as THREE.LineBasicMaterial).color.set(readToken('--globe-grid', '#2a3442'))
    this.rebuildOrbitLines()

    const token = ++this.textureToken
    buildEarthCanvas(readToken('--globe-ocean', '#0a0e14'), readToken('--globe-land', '#3a4350')).then(
      (canvas) => {
        if (this.disposed || token !== this.textureToken) return // a newer theme change superseded this one
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        const mat = this.earth.material as THREE.MeshBasicMaterial
        mat.map?.dispose()
        mat.map = tex
        mat.color.set(0xffffff)
        mat.needsUpdate = true
      },
      () => {
        // Texture missing: fall back to a plain ocean-coloured sphere with the graticule. Still correct, just unlabelled land.
        ;(this.earth.material as THREE.MeshBasicMaterial).color.set(readToken('--globe-ocean', '#0a0e14'))
      },
    )
  }

  /** Smoothly turn the camera toward an object's current position. */
  focus(id: string): void {
    const p = this.positionOf(id)
    if (!p) return
    const dir = new THREE.Vector3(...eciToScene(p)).normalize()
    const dist = Math.max(this.camera.position.length(), R_SCENE * 2.4)
    this.focusTarget = dir.multiplyScalar(dist)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.resizeObs.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerleave', this.onPointerLeave)
    el.removeEventListener('click', this.onClick)
    this.controls.dispose()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose?.()
    })
    ;(this.earth.material as THREE.MeshBasicMaterial).map?.dispose()
    this.renderer.dispose()
    el.remove()
  }

  // ---- internals --------------------------------------------------------------------------

  private buildGraticule(): THREE.LineSegments {
    const pts: number[] = []
    const r = R_SCENE * 1.001
    const at = (latDeg: number, lonDeg: number): [number, number, number] => {
      const la = (latDeg * Math.PI) / 180, lo = (lonDeg * Math.PI) / 180
      // Same convention as the texture: lon 0 on +x, lon +90 on -z, north on +y.
      return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)]
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = 0; lon < 360; lon += 5) pts.push(...at(lat, lon), ...at(lat, lon + 5))
    }
    for (let lon = 0; lon < 360; lon += 30) {
      for (let lat = -90; lat < 90; lat += 5) pts.push(...at(lat, lon), ...at(lat + 5, lon))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a3442, transparent: true, opacity: 0.55 }))
  }

  private rebuildOrbitLines(): void {
    for (const child of [...this.orbitGroup.children]) {
      this.orbitGroup.remove(child)
      ;(child as THREE.Line).geometry.dispose()
      ;((child as THREE.Line).material as THREE.Material).dispose()
    }
    const color = readToken('--globe-orbit', '#7aa2f7')
    for (const path of this.orbitPaths.values()) {
      const flat = path.flatMap((r) => eciToScene(r))
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3))
      this.orbitGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })))
    }
  }

  /** Per-object colour by altitude band at the snapshot time. Altitude is all a position snapshot carries, so eccentricity is ignored. */
  private rebuildColors(): void {
    const s = this.snapshot
    if (!s) return
    const out = new Float32Array(s.objects.length * 3)
    s.objects.forEach((o, i) => {
      const c = this.bandColors.get(altitudeBand(Math.hypot(o.r[0], o.r[1], o.r[2]) - EARTH_RADIUS_KM))
      out[i * 3] = c?.r ?? 0.8
      out[i * 3 + 1] = c?.g ?? 0.8
      out[i * 3 + 2] = c?.b ?? 0.8
    })
    this.colors = out
    this.colorsDirty = true
  }

  private dt(): number {
    const s = this.snapshot
    if (!s || !s.live) return 0
    return Math.min(MAX_EXTRAPOLATE_S, Math.max(0, (Date.now() - s.epochMs) / 1000))
  }

  private currentPos(o: SceneObject, dt: number): Vec3 { return dt === 0 ? o.r : extrapolate(o.r, o.v, dt) }

  private positionOf(id: string): Vec3 | null {
    const o = this.snapshot?.objects.find((x) => x.id === id)
    return o ? this.currentPos(o, this.dt()) : null
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = `${w}px`
    this.renderer.domElement.style.height = `${h}px`
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const s = this.snapshot
    const dt = this.dt()

    if (s) {
      // Earth turns inside the inertial frame; frozen when scrubbing so the picture matches the requested time.
      this.earth.rotation.y = s.gmstRad + (s.live ? EARTH_ROTATION_RAD_S * ((Date.now() - s.epochMs) / 1000) : 0)
      this.updatePoints(s, dt)
    }

    // CSS cannot reach a WebGL camera, so prefers-reduced-motion is honoured here too (rules.md §7).
    this.controls.autoRotate = this.autoRotate && !this.reducedMotion && this.hoveredId === null && this.selectedIds.length === 0
    if (this.focusTarget) {
      this.camera.position.lerp(this.focusTarget, this.reducedMotion ? 1 : 0.08)
      if (this.camera.position.distanceTo(this.focusTarget) < 0.05) this.focusTarget = null
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updatePoints(s: Snapshot, dt: number): void {
    const n = s.objects.length
    const all = new Float32Array(n * 3)
    const sel: number[] = []
    const cam = this.camera.position
    const camV: Vec3 = [cam.x, cam.y, cam.z]
    const rect = this.renderer.domElement.getBoundingClientRect()
    const screen: ScreenPoint[] = new Array(n)
    const v = new THREE.Vector3()

    for (let i = 0; i < n; i++) {
      const o = s.objects[i]
      const [x, y, z] = eciToScene(this.currentPos(o, dt))
      all[i * 3] = x; all[i * 3 + 1] = y; all[i * 3 + 2] = z
      if (this.selectedIds.includes(o.id)) sel.push(x, y, z)
      v.set(x, y, z).project(this.camera)
      screen[i] = {
        id: o.id,
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (-v.y * 0.5 + 0.5) * rect.height,
        hidden: v.z > 1 || occludedBySphere(camV, [x, y, z], R_SCENE),
      }
    }
    this.screenPts = screen

    const g = this.points.geometry
    g.setAttribute('position', new THREE.BufferAttribute(all, 3))
    g.attributes.position.needsUpdate = true
    if (this.colorsDirty && this.colors && this.colors.length === n * 3) {
      g.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
      this.colorsDirty = false
    }
    const sg = this.selectedPoints.geometry
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sel, 3))
    sg.attributes.position.needsUpdate = true
  }

  private pickAt(ev: PointerEvent | MouseEvent): { id: string; x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    const id = nearestScreenPoint(this.screenPts, x, y, PICK_PX)
    return id ? { id, x: ev.clientX, y: ev.clientY } : null
  }

  private onPointerMove = (ev: PointerEvent): void => {
    if (ev.buttons !== 0) return // dragging the camera, not hovering
    const hit = this.pickAt(ev)
    const id = hit?.id ?? null
    if (id !== this.hoveredId) this.hoveredId = id
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab'
    this.cb.onHover(hit)
  }

  private onPointerLeave = (): void => { this.hoveredId = null; this.cb.onHover(null) }

  private onPointerDown = (ev: PointerEvent): void => { this.downAt = { x: ev.clientX, y: ev.clientY } }

  private onClick = (ev: MouseEvent): void => {
    // A click that ends a camera drag is not a pick: it would clear the selection every time the user rotates the globe.
    const d = this.downAt
    if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4) return
    this.cb.onPick(this.pickAt(ev)?.id ?? null)
  }
}
