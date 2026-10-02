import { useEffect, useRef } from 'react'
import './DebrisBackdrop.css'

type Body = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hot: boolean; tx?: number; ty?: number }
type Flash = { x: number; y: number; age: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const token = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/**
 * Decorative login backdrop: faint drifting satellites, and every few seconds two objects
 * collide and burst into debris. Purely visual; hidden from assistive tech and still under reduced motion.
 */
export function DebrisBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, last = performance.now(), nextHit = 800
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const drifters: Body[] = []
    const incoming: Body[] = []
    const debris: Body[] = []
    const flashes: Flash[] = []
    let ink = token('--text-primary', '#f2f5f9'), accent = token('--accent', '#7aa2f7'), hot = token('--risk-critical', '#ef4444')

    const spawnDrifter = (): Body => {
      const a = rand(0, Math.PI * 2), s = rand(6, 22)
      return { x: rand(0, w), y: rand(0, h), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0, size: rand(0.6, 1.6), hot: false }
    }
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ink = token('--text-primary', '#f2f5f9'); accent = token('--accent', '#7aa2f7'); hot = token('--risk-critical', '#ef4444')
      drifters.length = 0
      for (let i = 0; i < Math.round((w * h) / 9000); i++) drifters.push(spawnDrifter())
    }

    const collide = () => {
      const x = rand(w * 0.12, w * 0.88), y = rand(h * 0.12, h * 0.88)
      const a = rand(0, Math.PI * 2), d = Math.max(w, h) * 0.45, speed = rand(120, 170)
      for (const k of [0, 1]) {
        const ang = a + k * Math.PI + rand(-0.3, 0.3)
        const sx = x + Math.cos(ang) * d, sy = y + Math.sin(ang) * d
        const t = d / speed
        incoming.push({ x: sx, y: sy, vx: (x - sx) / t, vy: (y - sy) / t, life: 0, max: t, size: 2.2, hot: false, tx: x, ty: y })
      }
    }
    const burst = (x: number, y: number) => {
      flashes.push({ x, y, age: 0 })
      for (let i = 0; i < 46; i++) {
        const ang = rand(0, Math.PI * 2), s = rand(20, 190)
        debris.push({ x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: 0, max: rand(1.4, 3.2), size: rand(0.6, 2), hot: Math.random() < 0.4 })
      }
    }

    const dot = (b: Body, color: string, alpha: number, trail = 0) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      if (trail) {
        ctx.strokeStyle = color
        ctx.lineWidth = b.size * 0.8
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * trail, b.y - b.vy * trail); ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill()
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, w, h)

      for (const b of drifters) {
        b.x += b.vx * dt; b.y += b.vy * dt
        if (b.x < -4) b.x = w + 4; else if (b.x > w + 4) b.x = -4
        if (b.y < -4) b.y = h + 4; else if (b.y > h + 4) b.y = -4
        dot(b, ink, 0.28)
      }

      nextHit -= dt * 1000
      if (nextHit <= 0) { collide(); nextHit = rand(3200, 5200) }

      for (let i = incoming.length - 1; i >= 0; i--) {
        const b = incoming[i]
        b.x += b.vx * dt; b.y += b.vy * dt; b.life += dt
        dot(b, accent, 0.95, 0.12)
        if (b.life >= b.max) {
          incoming.splice(i, 1)
          // the pair meets once: only the first arrival triggers the burst
          if (!incoming.some((o) => o.tx === b.tx && o.ty === b.ty)) burst(b.tx ?? b.x, b.ty ?? b.y)
        }
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const b = debris[i]
        b.x += b.vx * dt; b.y += b.vy * dt; b.life += dt
        b.vx *= 1 - 0.6 * dt; b.vy *= 1 - 0.6 * dt
        const f = 1 - b.life / b.max
        if (f <= 0) { debris.splice(i, 1); continue }
        dot(b, b.hot ? hot : accent, f * 0.9, 0.08)
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]
        f.age += dt
        const p = f.age / 0.9
        if (p >= 1) { flashes.splice(i, 1); continue }
        const r = 8 + p * 90
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
        g.addColorStop(0, hot); g.addColorStop(1, 'transparent')
        ctx.globalAlpha = (1 - p) * 0.55
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = (1 - p) * 0.7
        ctx.strokeStyle = ink; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.2, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      if (!still) raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    if (still) { for (let i = 0; i < 3; i++) burst(rand(w * 0.2, w * 0.8), rand(h * 0.2, h * 0.8)); for (const d of debris) d.life = d.max * 0.3; frame(last + 16) }
    else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="debris-backdrop" aria-hidden="true" />
}
