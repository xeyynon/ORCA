import { useEffect, useRef } from 'react'
import './DebrisBackdrop.css'

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const TAU = Math.PI * 2

type Piece = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; pts: [number, number][]; size: number; blur: number; alpha: number; drag: number; born: number }
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number }
type City = { a: number; r: number; s: number; o: number }

const LOOP = 11
const APPROACH = 3.2

function shard(size: number): [number, number][] {
  const n = Math.floor(rand(4, 7))
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + rand(-0.3, 0.3), r = size * rand(0.45, 1)
    return [Math.cos(a) * r, Math.sin(a) * r * rand(0.5, 1)] as [number, number]
  })
}

/**
 * Decorative login scene, drawn procedurally: Earth's limb with city lights, a glowing orbit,
 * tumbling debris and two satellites that collide on a loop. Purely visual; hidden from assistive tech.
 * It draws its own opaque background, so it looks the same in both themes.
 */
export function DebrisBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0, h = 0, k = 1, raf = 0, last = performance.now(), clock = still ? 4.2 : 0
    let ex = 0, ey = 0, er = 0, ix = 0, iy = 0
    let bg: HTMLCanvasElement | null = null
    let lights: HTMLCanvasElement | null = null
    let cities: City[] = []
    let drift: Piece[] = []
    let burst: Piece[] = []
    let sparks: Spark[] = []
    let exploded = false

    const buildStatic = () => {
      bg = document.createElement('canvas')
      bg.width = w * dpr; bg.height = h * dpr
      const g = bg.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#03060d'); sky.addColorStop(1, '#070d1a')
      g.fillStyle = sky; g.fillRect(0, 0, w, h)
      for (let i = 0; i < (w * h) / 2600; i++) {
        g.globalAlpha = rand(0.15, 0.85)
        g.fillStyle = Math.random() < 0.12 ? '#bcd2ff' : '#ffffff'
        g.fillRect(rand(0, w), rand(0, h), rand(0.5, 1.5), rand(0.5, 1.5))
      }
      g.globalAlpha = 1
      // Earth body with a dark night side
      const body = g.createRadialGradient(ex, ey - er * 0.2, er * 0.2, ex, ey, er)
      body.addColorStop(0, '#04070d'); body.addColorStop(0.8, '#071120'); body.addColorStop(1, '#10264a')
      g.fillStyle = body
      g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill()
      // atmosphere rim
      for (const [lw, a, c] of [[34, 0.07, '#3b82f6'], [14, 0.16, '#4f9bff'], [4, 0.75, '#9cc8ff'], [1.5, 1, '#e6f1ff']] as const) {
        g.strokeStyle = c; g.globalAlpha = a; g.lineWidth = lw
        g.beginPath(); g.arc(ex, ey, er + lw * 0.1, 0, TAU); g.stroke()
      }
      g.globalAlpha = 1
      // soft haze above the limb
      const haze = g.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 1.1)
      haze.addColorStop(0, 'rgba(80,150,255,0)'); haze.addColorStop(0.5, 'rgba(80,150,255,0.2)'); haze.addColorStop(1, 'rgba(80,150,255,0)')
      g.fillStyle = haze
      g.beginPath(); g.arc(ex, ey, er * 1.1, 0, TAU); g.fill()
      // orbit ring
      g.strokeStyle = 'rgba(140,190,255,0.55)'; g.lineWidth = 1.3
      g.shadowColor = '#6aa8ff'; g.shadowBlur = 10
      g.beginPath(); g.ellipse(w * 0.5, h * 0.52, w * 0.62, h * 0.52, -0.13, Math.PI * 1.05, Math.PI * 1.95); g.stroke()
      g.shadowBlur = 0
      // vignette keeps the card area readable; baked in so it costs nothing per frame
      const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
      v.addColorStop(0, 'rgba(3,6,12,0)'); v.addColorStop(1, 'rgba(3,6,12,0.55)')
      g.fillStyle = v; g.fillRect(0, 0, w, h)
    }

    /** City lights are drawn once; each frame only sways this layer a few degrees about the planet's centre. */
    const buildLights = () => {
      lights = document.createElement('canvas')
      lights.width = w * dpr; lights.height = h * dpr
      const g = lights.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = '#ffb45a'
      for (const c of cities) {
        const x = ex + Math.cos(c.a) * c.r, y = ey + Math.sin(c.a) * c.r
        if (x < -4 || x > w + 4 || y < 0 || y > h) continue
        g.globalAlpha = c.o
        g.fillRect(x, y, c.s, c.s)
      }
    }

    const makeDebris = () => {
      drift = Array.from({ length: Math.round(Math.min(46, (w * h) / 26000)) }, () => {
        const z = Math.random()
        const size = (4 + z * z * 26) * k
        return { x: rand(0, w), y: rand(0, h), vx: rand(-12, 12) * (0.4 + z), vy: rand(-8, 8) * (0.4 + z), rot: rand(0, TAU), spin: rand(-0.6, 0.6), pts: shard(size), size, blur: z > 0.82 ? (z - 0.8) * 22 : 0, alpha: 0.35 + z * 0.55, drag: 0, born: 0 }
      })
    }

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      k = Math.max(0.6, Math.min(w, h) / 900)
      ex = w * 0.42; ey = h * 1.78; er = h * 1.4
      ix = w * 0.76; iy = h * 0.36
      cities = []
      for (let c = 0; c < 44; c++) {
        const ca = -Math.PI / 2 + rand(-0.55, 0.55), cr = er * rand(0.8, 0.97), n = Math.floor(rand(14, 46))
        for (let i = 0; i < n; i++) cities.push({ a: ca + rand(-0.03, 0.03), r: cr + rand(-0.03, 0.03) * er, s: rand(1, 2.4) * k, o: rand(0.6, 1) })
      }
      buildStatic(); buildLights(); makeDebris()
    }

    const poly = (p: Piece, fill: string, edge: string) => {
      ctx.save()
      ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.beginPath()
      p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fillStyle = fill; ctx.fill()
      ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()
    }

    const satellite = (x: number, y: number, rot: number, alpha: number) => {
      const s = k * 1.15
      ctx.save()
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s)
      ctx.globalAlpha = alpha
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side, 1)
        ctx.fillStyle = '#13244a'; ctx.fillRect(22, -16, 78, 32)
        ctx.strokeStyle = 'rgba(120,170,255,0.6)'; ctx.lineWidth = 0.8
        ctx.strokeRect(22, -16, 78, 32)
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(22 + i * 13, -16); ctx.lineTo(22 + i * 13, 16); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(100, 0); ctx.stroke()
        ctx.fillStyle = '#7b8594'; ctx.fillRect(14, -2, 10, 4)
        ctx.restore()
      }
      const body = ctx.createLinearGradient(-16, -14, 16, 14)
      body.addColorStop(0, '#d8dde6'); body.addColorStop(0.5, '#8d96a6'); body.addColorStop(1, '#4d5564')
      ctx.fillStyle = body; ctx.fillRect(-16, -14, 32, 28)
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(-16, -14, 32, 6)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-16, -14, 32, 28)
      ctx.restore()
    }

    const explode = () => {
      exploded = true
      burst = Array.from({ length: 22 }, () => {
        const a = rand(0, TAU), v = rand(30, 190) * k, size = rand(5, 22) * k
        return { x: ix, y: iy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rand(0, TAU), spin: rand(-3, 3), pts: shard(size), size, blur: 0, alpha: 1, drag: rand(0.25, 0.5), born: clock }
      })
      sparks = Array.from({ length: 110 }, () => {
        const a = rand(0, TAU), v = rand(20, 420) * k
        return { x: ix, y: iy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(0.8, 2.8), size: rand(0.6, 2.2) * k }
      })
    }

    const frame = (now: number) => {
      const dt = still ? 0 : Math.min((now - last) / 1000, 0.05)
      last = now
      clock += dt
      const t = clock % LOOP
      if (t < dt + 0.001 && exploded) { exploded = false; burst = []; sparks = [] }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.drawImage(bg!, 0, 0, w, h)

      // city lights sway slowly with the planet
      ctx.save()
      ctx.translate(ex, ey); ctx.rotate(0.03 * Math.sin(clock * 0.12)); ctx.translate(-ex, -ey)
      ctx.drawImage(lights!, 0, 0, w, h)
      ctx.restore()

      // ambient debris, far to near
      for (const p of drift) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt
        const m = p.size + 30
        if (p.x < -m) p.x = w + m; else if (p.x > w + m) p.x = -m
        if (p.y < -m) p.y = h + m; else if (p.y > h + m) p.y = -m
        ctx.globalAlpha = p.alpha
        poly(p, '#2c3340', 'rgba(220,200,170,0.55)')
      }
      ctx.globalAlpha = 1

      // the two satellites close on each other, then burst
      const D = 330 * k
      if (t < APPROACH) {
        const e = t / APPROACH
        const dist = D * (1 - e * e)
        const fade = Math.min(1, t / 0.8)
        satellite(ix - dist * 0.86, iy - dist * 0.5, -0.5 + t * 0.1, fade)
        satellite(ix + dist * 0.9, iy + dist * 0.42, 0.45 - t * 0.12, fade)
      } else if (!exploded) explode()

      if (exploded) {
        const since = t - APPROACH
        const fadeOut = t > LOOP - 2 ? Math.max(0, (LOOP - t) / 2) : 1
        // blast glow
        if (since < 2.2) {
          const f = Math.max(0, 1 - since / 2.2)
          ctx.globalCompositeOperation = 'lighter'
          const r = (60 + since * 150) * k
          const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, r)
          g.addColorStop(0, `rgba(255,236,190,${0.95 * f})`); g.addColorStop(0.25, `rgba(255,150,40,${0.6 * f})`); g.addColorStop(1, 'rgba(255,90,0,0)')
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(ix, iy, r, 0, TAU); ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
        }
        for (const p of burst) {
          const f = Math.exp(-p.drag * dt)
          p.vx *= f; p.vy *= f
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt * Math.max(0.15, f)
          ctx.globalAlpha = fadeOut
          // pieces glow orange just after the blast and cool to grey
          const heat = Math.max(0, 1 - (clock - p.born) / 2.5)
          poly(p, `rgb(${60 + heat * 190},${64 + heat * 80},${72})`, `rgba(255,${190 + heat * 40},${120},${0.5 + heat * 0.5})`)
        }
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = fadeOut * 0.85
        ctx.lineWidth = 1.4 * k
        const drag = Math.exp(-1.4 * dt)
        for (const s of sparks) { s.life += dt; s.vx *= drag; s.vy *= drag; s.x += s.vx * dt; s.y += s.vy * dt }
        for (const hot of [true, false]) {
          ctx.strokeStyle = hot ? '#ffd9a0' : '#ff8a1f'
          ctx.beginPath()
          for (const s of sparks) {
            const f = 1 - s.life / s.max
            if (f <= 0 || f > 0.55 !== hot) continue
            ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045)
          }
          ctx.stroke()
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }

      if (!still) raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    if (still) { explode(); for (const p of burst) { p.x += p.vx * 0.9; p.y += p.vy * 0.9 } for (const s of sparks) { s.x += s.vx * 0.2; s.y += s.vy * 0.2; s.life = 0.4 } frame(last) }
    else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="debris-backdrop" aria-hidden="true" />
}
