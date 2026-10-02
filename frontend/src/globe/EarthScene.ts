import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { ObjectType } from '@/api/types'
import { ALTITUDE_BAND_COLOR, OBJECT_TYPE_COLOR } from '@/lib/chartColors'
import {
  EARTH_RADIUS_KM, EARTH_ROTATION_RAD_S, SCENE_UNIT_KM,
  cameraGeo, eciToScene, nearestIndex, occludedXYZ,
} from '@/lib/coords'
import type { CameraGeo, Vec3 } from '@/lib/coords'
import { OBJECT_TYPES } from '@/lib/objectTypes'
import { ALTITUDE_BANDS, altitudeBand } from '@/lib/orbit'
import type { AltitudeBand } from '@/lib/orbit'
import { sunDirectionEci } from '@/lib/sun'
import { readColorRef, readToken } from '@/lib/tokens'
import { buildEarthCanvas } from './earthTexture'

export interface SceneObject { id: string; name: string; type: ObjectType; r: Vec3; v: Vec3 }

export interface Snapshot {
  objects: readonly SceneObject[]
  /** The simulated time (ms since 1970) that `r`, `v` and `gmstRad` are for. */
  epochMs: number
  gmstRad: number
  /** Wall-clock ms from which simulated time advances. Live: the snapshot's own time. Otherwise: when it arrived. */
  wallMs: number
  /** Simulated seconds per real second: 1 live, 0 frozen (scrubbed), the playback speed while playing. */
  rate: number
}

export type ColorMode = 'altitude' | 'type'
export interface ConjunctionOverlay { a: string; b: string; /** a colour token reference such as "var(--risk-high)" */ color: string }
export interface LabelSpec { id: string; text: string }

export interface SceneCallbacks {
  onHover: (hit: { id: string; x: number; y: number } | null) => void
  onPick: (id: string | null) => void
  onCamera: (geo: CameraGeo) => void
}

const BASE = import.meta.env.BASE_URL
const R_SCENE = EARTH_RADIUS_KM / SCENE_UNIT_KM
const PICK_PX = 10
/** Never extrapolate further than this many simulated seconds; past it the snapshot is stale and we hold position. */
const MAX_EXTRAPOLATE_S = 150
const DEFAULT_CAMERA = new THREE.Vector3(14, 7, 16)
const CAMERA_REPORT_MS = 200
const MAX_SELECTED = 16

const EARTH_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

// Day side: the true-colour map lit by the sun. Night side: dark, with city lights. A thin atmosphere at the limb.
// terminator = 1 gives the real day/night split; 0 (the light theme) lights the whole globe so it stays readable.
const EARTH_FRAG = /* glsl */ `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDir; uniform float terminator;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW;
void main() {
  vec3 n = normalize(vNormalW);
  float ndl = dot(n, normalize(sunDir));
  float dayF = mix(1.0, smoothstep(-0.1, 0.22, ndl), terminator);
  float lit = mix(0.55, 0.06 + 0.5 * pow(max(ndl, 0.0), 0.8), terminator);
  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb;
  float grey = dot(day, vec3(0.299, 0.587, 0.114));
  day = mix(vec3(grey), day, 0.7); // slightly desaturated so the dots, not the planet, carry the colour
  vec3 col = day * lit * dayF + night * 0.9 * (1.0 - dayF) * terminator + vec3(0.008, 0.014, 0.03) * (1.0 - dayF);
  vec3 viewDir = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += vec3(0.2, 0.4, 0.8) * fres * (0.2 + 0.8 * dayF) * 0.22 * terminator + vec3(0.3, 0.5, 0.9) * fres * 0.1 * (1.0 - terminator);
  gl_FragColor = vec4(col, 1.0);
}`

const ATMO_VERT = /* glsl */ `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const ATMO_FRAG = /* glsl */ `varying vec3 vN; void main() { float i = pow(max(0.62 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 3.2); gl_FragColor = vec4(0.30, 0.60, 1.0, 1.0) * i * 0.5; }`

/**
 * The only place three.js is touched (rules.md §5.6). React talks to it through these methods and nothing else:
 * construct = mount, set* = update, dispose = unmount. ECI is the inertial frame; the Earth mesh rotates inside it by GMST,
 * orbit lines and satellites do not. Hot loops reuse typed arrays: the catalog can be ~16,000 objects, redrawn every frame.
 */
export class EarthScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly labelRenderer = new CSS2DRenderer()
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly earth: THREE.Mesh
  private readonly atmosphere: THREE.Mesh
  private readonly graticule: THREE.LineSegments
  private readonly points: THREE.Points
  private readonly selectedPoints: THREE.Points
  private readonly selectedBuf = new Float32Array(MAX_SELECTED * 3)
  private readonly orbitGroup = new THREE.Group()
  private readonly conjLine: THREE.Line
  private readonly conjMarker: THREE.Points
  private readonly conjZone: THREE.Points
  private readonly conjLineBuf = new Float32Array(6)
  private readonly resizeObs: ResizeObserver
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private readonly tmp = new THREE.Vector3()
  private readonly sunDir = new THREE.Vector3(1, 0, 0)

  private earthShader: THREE.ShaderMaterial | null = null
  private snapshot: Snapshot | null = null
  private ids: string[] = []
  private indexById = new Map<string, number>()
  private posBuf: Float32Array | null = null
  private colorBuf: Float32Array | null = null
  private sx = new Float32Array(0)
  private sy = new Float32Array(0)
  private hid = new Uint8Array(0)
  private selectedIds: string[] = []
  private conj: ConjunctionOverlay | null = null
  private labelSpecs: LabelSpec[] = []
  private labels = new Map<string, { obj: CSS2DObject; el: HTMLDivElement }>()
  private orbitPaths = new Map<string, Vec3[]>()
  private colorMode: ColorMode = 'altitude'
  private readonly bandColors = new Map<AltitudeBand, THREE.Color>()
  private readonly typeColors = new Map<ObjectType, THREE.Color>()
  private hoveredId: string | null = null
  private autoRotate = true
  private focusTarget: THREE.Vector3 | null = null
  private raf = 0
  private disposed = false
  private textureToken = 0
  private lastCameraReport = 0
  private lastGeo: CameraGeo | null = null
  private downAt: { x: number; y: number } | null = null

  constructor(private readonly container: HTMLElement, private readonly cb: SceneCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'

    const ld = this.labelRenderer.domElement
    ld.style.position = 'absolute'
    ld.style.inset = '0'
    ld.style.pointerEvents = 'none'
    ld.style.overflow = 'hidden'
    container.appendChild(ld)

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400)
    this.camera.position.copy(DEFAULT_CAMERA)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = R_SCENE * 1.25
    this.controls.maxDistance = 90
    this.controls.autoRotateSpeed = 0.4
    this.controls.enablePan = false

    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R_SCENE, 128, 96), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }))
    this.scene.add(this.earth)

    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(R_SCENE * 1.07, 64, 48),
      new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    )
    this.scene.add(this.atmosphere)

    this.graticule = this.buildGraticule()
    this.earth.add(this.graticule)

    this.points = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false }))
    this.points.frustumCulled = false
    this.scene.add(this.points)

    const selGeo = new THREE.BufferGeometry()
    selGeo.setAttribute('position', new THREE.BufferAttribute(this.selectedBuf, 3).setUsage(THREE.DynamicDrawUsage))
    selGeo.setDrawRange(0, 0)
    this.selectedPoints = new THREE.Points(selGeo, new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, color: 0xffffff }))
    this.selectedPoints.frustumCulled = false
    this.scene.add(this.selectedPoints)
    this.scene.add(this.orbitGroup)

    // the closest-approach overlay: a dashed line between the two objects and a ring where they meet
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.conjLineBuf, 3).setUsage(THREE.DynamicDrawUsage))
    this.conjLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xf97316, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.95 }))
    this.conjLine.frustumCulled = false
    this.conjLine.visible = false
    this.scene.add(this.conjLine)
    const markGeo = new THREE.BufferGeometry()
    markGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(THREE.DynamicDrawUsage))
    this.conjMarker = new THREE.Points(markGeo, new THREE.PointsMaterial({ size: 26, sizeAttenuation: false, map: this.starTexture(), transparent: true, depthTest: false, color: 0xf97316 }))
    this.conjMarker.frustumCulled = false
    this.conjMarker.renderOrder = 10
    this.conjMarker.visible = false
    this.scene.add(this.conjMarker)
    const zoneGeo = new THREE.BufferGeometry()
    zoneGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(THREE.DynamicDrawUsage))
    this.conjZone = new THREE.Points(zoneGeo, new THREE.PointsMaterial({ size: 150, sizeAttenuation: false, map: this.zoneTexture(), transparent: true, depthTest: false, depthWrite: false, color: 0xf97316 }))
    this.conjZone.frustumCulled = false
    this.conjZone.renderOrder = 9
    this.conjZone.visible = false
    this.scene.add(this.conjZone)

    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(container)
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerleave', this.onPointerLeave)
    el.addEventListener('click', this.onClick)

    this.setTheme()
    this.loadEarthMaps()
    this.resize()
    this.loop()
  }

  // ---- public interface -------------------------------------------------------------------

  setSnapshot(s: Snapshot): void {
    this.snapshot = s
    this.ids = s.objects.map((o) => o.id)
    this.indexById = new Map(this.ids.map((id, i) => [id, i]))
    const n = s.objects.length
    if (!this.posBuf || this.posBuf.length !== n * 3) {
      this.posBuf = new Float32Array(n * 3)
      this.sx = new Float32Array(n); this.sy = new Float32Array(n); this.hid = new Uint8Array(n)
      const g = this.points.geometry
      g.setAttribute('position', new THREE.BufferAttribute(this.posBuf, 3).setUsage(THREE.DynamicDrawUsage))
      this.points.geometry.setDrawRange(0, n)
    }
    ;(this.points.material as THREE.PointsMaterial).size = n > 8000 ? 2.2 : n > 3000 ? 2.6 : 3.4
    this.rebuildColors()
  }

  setSelection(ids: readonly string[]): void { this.selectedIds = ids.slice(0, MAX_SELECTED) }

  setColorMode(mode: ColorMode): void { this.colorMode = mode; this.rebuildColors() }

  setConjunction(c: ConjunctionOverlay | null): void {
    this.conj = c
    if (!c) { this.conjLine.visible = false; this.conjMarker.visible = false; this.conjZone.visible = false; return }
    const color = new THREE.Color(readColorRef(c.color, '#f97316'))
    ;(this.conjLine.material as THREE.LineDashedMaterial).color.copy(color)
    ;(this.conjMarker.material as THREE.PointsMaterial).color.copy(color)
    ;(this.conjZone.material as THREE.PointsMaterial).color.copy(color)
  }

  setLabels(labels: readonly LabelSpec[]): void { this.labelSpecs = [...labels]; this.syncLabels() }

  setOrbitPaths(paths: ReadonlyMap<string, Vec3[]>): void {
    this.orbitPaths = new Map(paths)
    this.rebuildOrbitLines()
  }

  setAutoRotate(on: boolean): void { this.autoRotate = on }

  /** Smoothly return the camera to its default view. */
  resetView(): void { this.focusTarget = DEFAULT_CAMERA.clone() }

  /** Re-read every colour token. Called on theme change. */
  setTheme(): void {
    const light = document.documentElement.dataset.theme === 'light'
    for (const band of ALTITUDE_BANDS) this.bandColors.set(band, new THREE.Color(readColorRef(ALTITUDE_BAND_COLOR[band], '#cbd5e1')))
    for (const type of OBJECT_TYPES) this.typeColors.set(type, new THREE.Color(readColorRef(OBJECT_TYPE_COLOR[type], '#cbd5e1')))
    this.rebuildColors()
    // Selection is the theme's primary text colour (white on dark): an accent blue would blend into the LEO band colour.
    ;(this.selectedPoints.material as THREE.PointsMaterial).color.set(readToken('--text-primary', '#ffffff'))
    ;(this.graticule.material as THREE.LineBasicMaterial).color.set(readToken('--globe-grid', '#2a3442'))
    this.atmosphere.visible = !light
    if (this.earthShader) this.earthShader.uniforms.terminator.value = light ? 0 : 1
    this.rebuildOrbitLines()

    if (!this.earthShader) this.buildFallbackEarth()
  }

  /** Smoothly turn the camera toward an object's current position. */
  focus(id: string): void {
    const i = this.indexById.get(id)
    if (i === undefined || !this.posBuf) return
    const dir = new THREE.Vector3(this.posBuf[i * 3], this.posBuf[i * 3 + 1], this.posBuf[i * 3 + 2]).normalize()
    this.focusTarget = dir.multiplyScalar(Math.max(this.camera.position.length(), R_SCENE * 2.4))
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
    for (const { obj, el: labelEl } of this.labels.values()) { this.scene.remove(obj); labelEl.remove() }
    this.labels.clear()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      const mat = m.material as (THREE.Material & { map?: THREE.Texture | null }) | (THREE.Material & { map?: THREE.Texture | null })[] | undefined
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) { x.map?.dispose?.(); x.dispose() }
    })
    this.earthShader?.uniforms.dayMap.value?.dispose?.()
    this.earthShader?.uniforms.nightMap.value?.dispose?.()
    this.renderer.dispose()
    el.remove()
    this.labelRenderer.domElement.remove()
  }

  // ---- internals --------------------------------------------------------------------------

  /** The real Earth: a day map, a night-lights map and the sun's direction. If the maps are missing the tinted fallback stays. */
  private loadEarthMaps(): void {
    const loader = new THREE.TextureLoader()
    const load = (name: string) => new Promise<THREE.Texture>((resolve, reject) => loader.load(`${BASE}textures/${name}`, resolve, undefined, reject))
    Promise.all([load('earth_atmos_2048.jpg'), load('earth_lights_2048.png')]).then(
      ([day, night]) => {
        if (this.disposed) { day.dispose(); night.dispose(); return }
        for (const t of [day, night]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8 } // sampled raw: the shader writes sRGB values directly
        const light = document.documentElement.dataset.theme === 'light'
        this.earthShader = new THREE.ShaderMaterial({
          vertexShader: EARTH_VERT,
          fragmentShader: EARTH_FRAG,
          uniforms: { dayMap: { value: day }, nightMap: { value: night }, sunDir: { value: this.sunDir }, terminator: { value: light ? 0 : 1 } },
        })
        const old = this.earth.material as THREE.MeshBasicMaterial
        this.earth.material = this.earthShader
        old.map?.dispose(); old.dispose()
        ;(this.graticule.material as THREE.LineBasicMaterial).opacity = 0.18
      },
      () => { /* offline or missing: the tinted fallback is already drawn */ },
    )
  }

  /** Plain tinted land/ocean sphere, used until (or instead of) the real maps. */
  private buildFallbackEarth(): void {
    const token = ++this.textureToken
    buildEarthCanvas(readToken('--globe-ocean', '#0a0e14'), readToken('--globe-land', '#3a4350')).then(
      (canvas) => {
        if (this.disposed || this.earthShader || token !== this.textureToken) return
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        const mat = this.earth.material as THREE.MeshBasicMaterial
        mat.map?.dispose(); mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true
      },
      () => { if (!this.earthShader) (this.earth.material as THREE.MeshBasicMaterial).color.set(readToken('--globe-ocean', '#0a0e14')) },
    )
  }

  /** A translucent disc with a crisp rim: the zone around a closest approach. */
  private zoneTexture(): THREE.Texture {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = 'rgba(255,255,255,0.2)'
    g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3
    g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.stroke()
    return new THREE.CanvasTexture(c)
  }

  /** A four-pointed star marking the point of closest approach. */
  private starTexture(): THREE.Texture {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2
      const r = i % 2 === 0 ? 30 : 7
      g.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a))
    }
    g.closePath(); g.fill()
    return new THREE.CanvasTexture(c)
  }

  private buildGraticule(): THREE.LineSegments {
    const pts: number[] = []
    const r = R_SCENE * 1.001
    const at = (latDeg: number, lonDeg: number): [number, number, number] => {
      const la = (latDeg * Math.PI) / 180, lo = (lonDeg * Math.PI) / 180
      // Same convention as the texture: lon 0 on +x, lon +90 on -z, north on +y.
      return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)]
    }
    for (let lat = -60; lat <= 60; lat += 30) for (let lon = 0; lon < 360; lon += 5) pts.push(...at(lat, lon), ...at(lat, lon + 5))
    for (let lon = 0; lon < 360; lon += 30) for (let lat = -90; lat < 90; lat += 5) pts.push(...at(lat, lon), ...at(lat + 5, lon))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a3442, transparent: true, opacity: 0.55 }))
  }

  private rebuildOrbitLines(): void {
    for (const child of [...this.orbitGroup.children]) {
      this.orbitGroup.remove(child)
      ;(child as Line2).geometry.dispose()
      ;((child as Line2).material as THREE.Material).dispose()
    }
    const color = readToken('--globe-orbit', '#ffb020')
    const res = new THREE.Vector2(Math.max(1, this.container.clientWidth), Math.max(1, this.container.clientHeight))
    for (const path of this.orbitPaths.values()) {
      const flat = path.flatMap((r) => eciToScene(r))
      // A wide faint line under a narrow solid one: a glow that reads against the dots at any zoom. Fat lines are
      // needed because a WebGL line is always one pixel wide, which is the width of a satellite.
      for (const [width, opacity] of [[7, 0.22], [2.5, 1]] as const) {
        const g = new LineGeometry()
        g.setPositions(flat)
        const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, transparent: true, opacity, depthWrite: false, resolution: res })
        const line = new Line2(g, m)
        line.renderOrder = 5
        this.orbitGroup.add(line)
      }
    }
    // with an orbit on screen the rest of the catalog steps back, so the path and its object are what the eye lands on
    ;(this.points.material as THREE.PointsMaterial).opacity = this.orbitPaths.size > 0 ? 0.35 : 1
  }

  /** Per-object colour: by altitude band (current altitude; a snapshot carries no eccentricity) or by object type. */
  private rebuildColors(): void {
    const s = this.snapshot
    if (!s) return
    const n = s.objects.length
    if (!this.colorBuf || this.colorBuf.length !== n * 3) {
      this.colorBuf = new Float32Array(n * 3)
      this.points.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuf, 3))
    }
    const buf = this.colorBuf
    for (let i = 0; i < n; i++) {
      const o = s.objects[i]
      const c = this.colorMode === 'type'
        ? this.typeColors.get(o.type)
        : this.bandColors.get(altitudeBand(Math.hypot(o.r[0], o.r[1], o.r[2]) - EARTH_RADIUS_KM))
      buf[i * 3] = c?.r ?? 0.8; buf[i * 3 + 1] = c?.g ?? 0.8; buf[i * 3 + 2] = c?.b ?? 0.8
    }
    ;(this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
  }

  private syncLabels(): void {
    const wanted = new Set(this.labelSpecs.map((l) => l.id))
    for (const [id, l] of this.labels) {
      if (!wanted.has(id)) { this.scene.remove(l.obj); l.el.remove(); this.labels.delete(id) }
    }
    for (const spec of this.labelSpecs) {
      const existing = this.labels.get(spec.id)
      if (existing) { existing.el.textContent = spec.text; continue }
      const el = document.createElement('div')
      el.className = 'globe-label'
      el.textContent = spec.text
      const obj = new CSS2DObject(el)
      obj.center.set(-0.08, 1.2) // the label's lower-left corner sits just above and right of the object
      this.scene.add(obj)
      this.labels.set(spec.id, { obj, el })
    }
  }

  /** Simulated seconds since the snapshot, extrapolated forward (never backward, never beyond the stale limit). */
  private simDt(): number {
    const s = this.snapshot
    if (!s || s.rate === 0) return 0
    return Math.min(MAX_EXTRAPOLATE_S, Math.max(0, ((Date.now() - s.wallMs) / 1000) * s.rate))
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = `${w}px`
    this.renderer.domElement.style.height = `${h}px`
    this.labelRenderer.setSize(w, h)
    for (const child of this.orbitGroup.children) ((child as Line2).material as LineMaterial).resolution.set(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const s = this.snapshot
    const dt = this.simDt()

    if (s) {
      this.earth.rotation.y = s.gmstRad + EARTH_ROTATION_RAD_S * dt
      // the sun at the SIMULATED time, so scrubbing forward really moves the terminator
      const e = sunDirectionEci(new Date(s.epochMs + dt * 1000))
      this.sunDir.set(e[0], e[2], -e[1]).normalize() // ECI (x, y, z) -> scene (x, z, -y)
      this.updatePoints(s, dt)
      this.updateOverlays()
    }

    // CSS cannot reach a WebGL camera, so prefers-reduced-motion is honoured here too (rules.md §7).
    this.controls.autoRotate = this.autoRotate && !this.reducedMotion && this.hoveredId === null && this.selectedIds.length === 0
    if (this.focusTarget) {
      this.camera.position.lerp(this.focusTarget, this.reducedMotion ? 1 : 0.08)
      if (this.camera.position.distanceTo(this.focusTarget) < 0.05) this.focusTarget = null
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
    this.reportCamera()
  }

  private updatePoints(s: Snapshot, dt: number): void {
    const pos = this.posBuf
    if (!pos) return
    const n = s.objects.length
    const cam = this.camera.position
    const rect = this.renderer.domElement.getBoundingClientRect()
    const w = rect.width, h = rect.height
    const v = this.tmp
    const sx = this.sx, sy = this.sy, hid = this.hid
    for (let i = 0; i < n; i++) {
      const o = s.objects[i]
      // linear extrapolation r + v*dt, then ECI -> scene: (x, y, z) -> (x, z, -y) / 1000
      const x = (o.r[0] + o.v[0] * dt) / SCENE_UNIT_KM
      const y = (o.r[2] + o.v[2] * dt) / SCENE_UNIT_KM
      const z = -(o.r[1] + o.v[1] * dt) / SCENE_UNIT_KM
      const k = i * 3
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z
      v.set(x, y, z).project(this.camera)
      sx[i] = (v.x * 0.5 + 0.5) * w
      sy[i] = (-v.y * 0.5 + 0.5) * h
      hid[i] = v.z > 1 || occludedXYZ(cam.x, cam.y, cam.z, x, y, z, R_SCENE) ? 1 : 0
    }
    ;(this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }

  private positionOf(id: string): [number, number, number] | null {
    const i = this.indexById.get(id)
    const pos = this.posBuf
    return i === undefined || !pos ? null : [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]
  }

  private updateOverlays(): void {
    // selected objects
    let count = 0
    for (const id of this.selectedIds) {
      const p = this.positionOf(id)
      if (!p) continue
      this.selectedBuf[count * 3] = p[0]; this.selectedBuf[count * 3 + 1] = p[1]; this.selectedBuf[count * 3 + 2] = p[2]
      count++
    }
    this.selectedPoints.geometry.setDrawRange(0, count)
    ;(this.selectedPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true

    // the conjunction: dashed line between the pair, ring at their midpoint
    const pa = this.conj ? this.positionOf(this.conj.a) : null
    const pb = this.conj ? this.positionOf(this.conj.b) : null
    if (pa && pb) {
      this.conjLineBuf.set([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]])
      this.conjLine.geometry.attributes.position.needsUpdate = true
      this.conjLine.computeLineDistances()
      const m = this.conjMarker.geometry.attributes.position as THREE.BufferAttribute
      m.setXYZ(0, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2)
      m.needsUpdate = true
      const z = this.conjZone.geometry.attributes.position as THREE.BufferAttribute
      z.setXYZ(0, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2)
      z.needsUpdate = true
      this.conjLine.visible = true
      this.conjMarker.visible = true
      this.conjZone.visible = true
    } else {
      this.conjLine.visible = false
      this.conjMarker.visible = false
      this.conjZone.visible = false
    }

    // labels follow their objects and hide behind the planet
    const cam = this.camera.position
    for (const [id, l] of this.labels) {
      const p = this.positionOf(id)
      if (!p) { l.el.style.visibility = 'hidden'; continue }
      l.obj.position.set(p[0], p[1], p[2])
      l.el.style.visibility = occludedXYZ(cam.x, cam.y, cam.z, p[0], p[1], p[2], R_SCENE) ? 'hidden' : 'visible'
    }
  }

  /** The point below the camera and its height, a few times a second and only when it changed. */
  private reportCamera(): void {
    const now = performance.now()
    if (now - this.lastCameraReport < CAMERA_REPORT_MS) return
    this.lastCameraReport = now
    const c = this.camera.position
    const g = cameraGeo([c.x, c.y, c.z], this.earth.rotation.y)
    const l = this.lastGeo
    if (l && Math.abs(l.latDeg - g.latDeg) < 0.05 && Math.abs(l.lonDeg - g.lonDeg) < 0.05 && Math.abs(l.altKm - g.altKm) < 5) return
    this.lastGeo = g
    this.cb.onCamera(g)
  }

  private pickAt(ev: PointerEvent | MouseEvent): { id: string; x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const i = nearestIndex(this.sx, this.sy, this.hid, ev.clientX - rect.left, ev.clientY - rect.top, PICK_PX)
    return i >= 0 ? { id: this.ids[i], x: ev.clientX, y: ev.clientY } : null
  }

  private onPointerMove = (ev: PointerEvent): void => {
    if (ev.buttons !== 0) return // dragging the camera, not hovering
    const hit = this.pickAt(ev)
    this.hoveredId = hit?.id ?? null
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
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
