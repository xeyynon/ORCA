import { loadEarthTextures, renderEarth } from './earthRender'
import type { EarthTextures } from './earthRender'
import {
  GLOBE_R, IMPACT_POINT, T_IMPACT, bodyAlpha, bodyPos, dustAlpha, dustPos, flashAt, fragmentAt, loopTime,
  makeDust, makeFragments, orbitPoint, satelliteAngle, warning,
} from './orbitScene'
import type { BodyId, Vec } from './orbitScene'
import { readToken } from './tokens'

interface Palette { orbit: string; dust: string; body: string; warm: string; flash: string }

// Used when the design tokens are not loaded yet (the splash runs before tokens.css) and as the token fallback.
const FALLBACK: Record<'dark' | 'light', Palette> = {
  dark: { orbit: '#7aa2f7', dust: '#b4bfcd', body: '#f2f5f9', warm: '#fb923c', flash: '#ffffff' },
  light: { orbit: '#3b5bdb', dust: '#334155', body: '#0f172a', warm: '#ea580c', flash: '#7c3aed' },
}

function readPalette(): Palette {
  const light = document.documentElement.dataset.theme === 'light'
  const fb = FALLBACK[light ? 'light' : 'dark']
  return {
    orbit: readToken('--accent', fb.orbit),
    dust: readToken('--text-secondary', fb.dust),
    body: readToken('--text-primary', fb.body),
    warm: readToken('--cat-5', fb.warm),
    flash: light ? readToken('--cat-2', fb.flash) : readToken('--text-primary', fb.flash),
  }
}

const DUST = makeDust(170)
const FRAGMENTS = makeFragments(48)
const BODY_IDS: BodyId[] = ['A', 'B']

/** Sun from the upper left and a little toward the viewer, so a clear terminator crosses the visible disc. */
const SUN: readonly [number, number, number] = (() => {
  const v = [-0.6, 0.38, 0.7]
  const m = Math.hypot(v[0], v[1], v[2])
  return [v[0] / m, v[1] / m, v[2] / m] as const
})()
const TILT = 0.4
const SPIN_RAD_PER_S = 0.24

// the near half of the orbit ring passes in front of the planet, the far half behind it
const isNear = (theta: number) => Math.sin(theta) > 0

function strokeOrbitHalf(ctx: CanvasRenderingContext2D, near: boolean, color: string): void {
  ctx.strokeStyle = color
  ctx.globalAlpha = near ? 0.7 : 0.4
  ctx.lineWidth = 0.004
  ctx.beginPath()
  let pen = false
  for (let i = 0; i <= 96; i++) {
    const theta = (i / 96) * Math.PI * 2
    if (isNear(theta) !== near) { pen = false; continue }
    const p = orbitPoint(theta)
    if (!pen) { ctx.moveTo(p.x, p.y); pen = true } else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
}

function drawSatellites(ctx: CanvasRenderingContext2D, t: number, near: boolean, color: string): void {
  ctx.fillStyle = color
  for (let i = 0; i < 3; i++) {
    const th = satelliteAngle(i, t)
    if (isNear(th) !== near) continue
    const p = orbitPoint(th), q = orbitPoint(th + 0.05)
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x))
    ctx.globalAlpha = near ? 1 : 0.75
    ctx.fillRect(-0.011, -0.0065, 0.022, 0.013)
    ctx.restore()
  }
}

interface Earth { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData }

/** Draws one frame at time `t` seconds into a unit-square space centred on (0, 0). */
function drawFrame(ctx: CanvasRenderingContext2D, earth: Earth, tex: EarthTextures | null, texMix: number, t: number, pal: Palette): void {
  const u = loopTime(t)

  // faint blue atmospheric haze around the planet
  const haze = ctx.createRadialGradient(0, 0, GLOBE_R * 0.95, 0, 0, GLOBE_R * 1.7)
  haze.addColorStop(0, '#4aa3ff'); haze.addColorStop(1, 'transparent')
  ctx.globalAlpha = 0.2; ctx.fillStyle = haze
  ctx.beginPath(); ctx.arc(0, 0, GLOBE_R * 1.7, 0, Math.PI * 2); ctx.fill()

  // behind the planet: the far half of the ring, and the satellites on it
  strokeOrbitHalf(ctx, false, pal.orbit)
  drawSatellites(ctx, t, false, pal.body)

  // the ambient debris cloud
  ctx.fillStyle = pal.dust
  for (const d of DUST) {
    const p = dustPos(d, t)
    ctx.globalAlpha = dustAlpha(d, t) * 0.85
    ctx.beginPath(); ctx.arc(p.x, p.y, d.size, 0, Math.PI * 2); ctx.fill()
  }

  // the planet
  renderEarth(earth.img, tex, { rot: t * SPIN_RAD_PER_S, tilt: TILT, sun: SUN, texMix })
  earth.ctx.putImageData(earth.img, 0, 0)
  ctx.globalAlpha = 1
  ctx.drawImage(earth.canvas, -GLOBE_R, -GLOBE_R, GLOBE_R * 2, GLOBE_R * 2)

  // in front of the planet: the near half of the ring and its satellites
  strokeOrbitHalf(ctx, true, pal.orbit)
  drawSatellites(ctx, t, true, pal.body)

  // warning ring where the two are about to meet
  const w = warning(u)
  if (w > 0) {
    ctx.strokeStyle = pal.warm
    ctx.globalAlpha = 0.65 * w; ctx.lineWidth = 0.004
    ctx.beginPath(); ctx.arc(IMPACT_POINT.x, IMPACT_POINT.y, 0.028 + 0.05 * (1 - w) + 0.006 * Math.sin(t * 14), 0, Math.PI * 2); ctx.stroke()
  }

  // the two objects, with a fading trail behind each
  for (const id of BODY_IDS) {
    const p = bodyPos(id, u)
    if (!p) continue
    const a = bodyAlpha(u)
    const back = bodyPos(id, Math.max(u - 0.45, 0.5)) as Vec
    const grad = ctx.createLinearGradient(back.x, back.y, p.x, p.y)
    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, pal.warm)
    ctx.strokeStyle = grad; ctx.globalAlpha = 0.85 * a; ctx.lineWidth = 0.0045; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(IMPACT_POINT.y - p.y, IMPACT_POINT.x - p.x))
    ctx.fillStyle = pal.body; ctx.globalAlpha = a; ctx.fillRect(-0.013, -0.008, 0.026, 0.016)
    ctx.fillStyle = pal.warm; ctx.globalAlpha = a * 0.9; ctx.fillRect(-0.004, -0.0125, 0.008, 0.025)
    ctx.restore()
  }

  // the impact: shock ring and flash
  const f = flashAt(u)
  if (f) {
    ctx.strokeStyle = pal.flash; ctx.globalAlpha = 0.9 * f.glow; ctx.lineWidth = 0.012 * (1 - f.ring) + 0.002
    ctx.beginPath(); ctx.arc(IMPACT_POINT.x, IMPACT_POINT.y, 0.015 + f.ring * 0.19, 0, Math.PI * 2); ctx.stroke()
    const core = ctx.createRadialGradient(IMPACT_POINT.x, IMPACT_POINT.y, 0, IMPACT_POINT.x, IMPACT_POINT.y, 0.13)
    core.addColorStop(0, pal.flash); core.addColorStop(0.35, pal.warm); core.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.95 * f.glow; ctx.fillStyle = core
    ctx.beginPath(); ctx.arc(IMPACT_POINT.x, IMPACT_POINT.y, 0.13, 0, Math.PI * 2); ctx.fill()
  }

  // the fragments thrown out by the impact
  for (const fr of FRAGMENTS) {
    const s = fragmentAt(fr, u)
    if (!s) continue
    ctx.fillStyle = fr.warm ? pal.warm : pal.body
    ctx.globalAlpha = s.alpha
    ctx.beginPath(); ctx.arc(s.pos.x, s.pos.y, fr.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * Animates the loading scene on `canvas` and returns a function that stops it: a realistic Earth (true-colour map, a
 * sun-lit day side, city lights on the night side, atmosphere) slowly turning inside a ring of orbiting debris, where two
 * objects fly together, collide, and scatter fragments into the cloud, on a loop. The canvas is drawn at device
 * resolution; its CSS size is set here. The loop stops by itself when the canvas leaves the page, and it is a single
 * still frame (no loop) when the user prefers reduced motion. `base` is the app's public base path (for the Earth maps).
 */
export function startOrbitAnimation(canvas: HTMLCanvasElement, opts: { size: number; base?: string }): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(opts.size * dpr)
  canvas.height = Math.round(opts.size * dpr)
  canvas.style.width = `${opts.size}px`
  canvas.style.height = `${opts.size}px`

  // the planet is shaded into its own small canvas, just big enough for its disc, and composited each frame
  const edge = Math.max(8, Math.ceil(GLOBE_R * 2 * canvas.width) + 2)
  const off = document.createElement('canvas')
  off.width = edge
  off.height = edge
  const offCtx = off.getContext('2d')
  if (!offCtx) return () => {}
  const earth: Earth = { canvas: off, ctx: offCtx, img: offCtx.createImageData(edge, edge) }

  let pal = readPalette()
  let palAt = 0
  let tex: EarthTextures | null = null
  let texAt = 0
  let stopped = false
  let still = false
  let raf = 0

  const render = (t: number, now: number) => {
    const texMix = tex ? Math.min(1, (now - texAt) / 900) : 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(canvas.width, 0, 0, canvas.height, canvas.width / 2, canvas.height / 2) // unit square, origin at the centre
    drawFrame(ctx, earth, tex, texMix, t, pal)
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  void loadEarthTextures(opts.base ?? import.meta.env.BASE_URL).then((t) => {
    tex = t
    texAt = performance.now() - (reduce ? 900 : 0)
    if (reduce && !stopped) render(0.2, performance.now()) // a still frame, now with the real maps
  })

  if (reduce) {
    still = true
    render(0.2, performance.now()) // a calm frame: planet, ring and dust, before the two objects appear
    return () => { stopped = true }
  }

  const start = performance.now()
  const frame = (now: number) => {
    if (stopped || still || !canvas.isConnected) return
    if (now - palAt > 800) { pal = readPalette(); palAt = now } // follow a theme change without re-reading every frame
    render((now - start) / 1000 + T_IMPACT * 0.35, now) // begin part-way through, so something is moving at once
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => { stopped = true; cancelAnimationFrame(raf) }
}
