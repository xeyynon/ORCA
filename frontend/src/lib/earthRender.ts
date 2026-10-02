import { smoothstep, spherePoint } from './sphere'

/** Day and night maps resampled to a modest size once, so sampling per pixel per frame stays cheap. */
export interface EarthTextures {
  w: number
  h: number
  day: Uint8ClampedArray
  night: Uint8ClampedArray
}

const MAP_W = 1024
const MAP_H = 512

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load ${src}`))
    img.src = src
  })
}

function pixelsOf(img: HTMLImageElement): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = MAP_W
  c.height = MAP_H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, MAP_W, MAP_H)
  return ctx.getImageData(0, 0, MAP_W, MAP_H).data
}

let cached: Promise<EarthTextures | null> | null = null

/** Loads the vendored Earth maps once. Resolves null if either is missing: the caller then draws a plain ocean-blue sphere. */
export function loadEarthTextures(base: string): Promise<EarthTextures | null> {
  cached ??= Promise.all([loadImage(`${base}textures/earth_atmos_2048.jpg`), loadImage(`${base}textures/earth_lights_2048.png`)])
    .then(([day, night]) => ({ w: MAP_W, h: MAP_H, day: pixelsOf(day), night: pixelsOf(night) }))
    .catch(() => null)
  return cached
}

export interface EarthLook {
  /** how far the sphere has turned east, radians */
  rot: number
  /** north pole leaning toward the viewer, radians */
  tilt: number
  /** unit vector pointing toward the sun, in view space (x right, y up, z toward the viewer) */
  sun: readonly [number, number, number]
  /** 0 = plain ocean sphere, 1 = fully textured (fades the planet in when the maps arrive) */
  texMix: number
}

/**
 * Shades a sphere filling the square `img` (disc radius = half the width). Day side: the true-colour map lit by the
 * sun; night side: dark, with city lights; plus a thin blue atmosphere at the limb, strongest on the sunlit side.
 */
export function renderEarth(img: ImageData, tex: EarthTextures | null, look: EarthLook): void {
  const n = img.width
  const out = img.data
  const half = n / 2
  const [lx, ly, lz] = look.sun
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const i = (py * n + px) * 4
      const x = (px + 0.5 - half) / half
      const y = -(py + 0.5 - half) / half
      const p = spherePoint(x, y, look.tilt, look.rot)
      if (!p) { out[i + 3] = 0; continue }

      const ndl = p.nx * lx + p.ny * ly + p.nz * lz
      const dayF = smoothstep(-0.1, 0.22, ndl)
      const lit = 0.1 + 1.05 * Math.pow(Math.max(0, ndl), 0.8)

      // plain ocean blue, then blended toward the real maps as they become available
      let dr = 10, dg = 40, db = 92
      let nr = 0, ng = 0, nb = 0
      if (tex && look.texMix > 0) {
        const mx = Math.min(tex.w - 1, (p.u * tex.w) | 0)
        const my = Math.min(tex.h - 1, (p.v * tex.h) | 0)
        const k = (my * tex.w + mx) * 4
        const m = look.texMix
        dr += (tex.day[k] - dr) * m; dg += (tex.day[k + 1] - dg) * m; db += (tex.day[k + 2] - db) * m
        nr = tex.night[k] * m; ng = tex.night[k + 1] * m; nb = tex.night[k + 2] * m
      }

      const night = 1 - dayF
      let r = dr * lit * dayF + nr * 1.7 * night + 3 * night
      let g = dg * lit * dayF + ng * 1.6 * night + 5 * night
      let b = db * lit * dayF + nb * 1.3 * night + 12 * night

      // atmosphere at the limb
      const fres = Math.pow(1 - p.nz, 3)
      const air = fres * (0.22 + 0.78 * dayF)
      r += 70 * air; g += 140 * air; b += 255 * air

      out[i] = r > 255 ? 255 : r
      out[i + 1] = g > 255 ? 255 : g
      out[i + 2] = b > 255 ? 255 : b
      // anti-aliased edge: fade over the outermost pixel
      const d = Math.sqrt(x * x + y * y)
      const edge = Math.max(0, Math.min(1, (1 - d) * half))
      out[i + 3] = (edge * 255) | 0
    }
  }
}
