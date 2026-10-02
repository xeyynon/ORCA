/**
 * The geometry of the loading animation, as pure functions of time (no canvas, no DOM), so it can be tested.
 * Coordinates are in a unit square centred on the globe: x right, y down, the globe has radius GLOBE_R.
 *
 * The loop (PERIOD seconds): debris drifts around the globe; two objects fly toward each other and meet at IMPACT_POINT
 * at T_IMPACT; a flash and shock ring appear; fragments burst outward, slow down and fade into the dust; the objects
 * return and the story repeats. It illustrates a conjunction. It is decoration, not data.
 */

export interface Vec { x: number; y: number }

export const GLOBE_R = 0.24
export const PERIOD = 7.0
/** seconds into the loop when the two objects meet */
export const T_IMPACT = 3.4
const T_APPEAR = 0.5
export const IMPACT_POINT: Vec = { x: 0.27, y: -0.14 }
const START_A: Vec = { x: -0.12, y: 0.47 }
const START_B: Vec = { x: 0.49, y: 0.2 }

export const FLASH_DURATION = 0.7
export const FRAGMENT_LIFE = 2.6
const FRAGMENT_DRAG = 1.5

/** Small deterministic generator, so the cloud looks the same on every load and in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Time within the loop, in [0, PERIOD). */
export function loopTime(t: number): number {
  return ((t % PERIOD) + PERIOD) % PERIOD
}

// ---- ambient debris ---------------------------------------------------------------------------

export interface Dust { r: number; a0: number; w: number; size: number; alpha: number; twinkle: number }

/** A ring-shaped cloud around the globe, each particle on its own radius and angular speed (rad/s, both directions). */
export function makeDust(count: number, seed = 7): Dust[] {
  const rnd = mulberry32(seed)
  return Array.from({ length: count }, () => ({
    r: GLOBE_R + 0.045 + rnd() ** 1.4 * 0.2,
    a0: rnd() * Math.PI * 2,
    w: (0.05 + rnd() * 0.22) * (rnd() < 0.5 ? -1 : 1),
    size: 0.0016 + rnd() * rnd() * 0.0046,
    alpha: 0.35 + rnd() * 0.6,
    twinkle: rnd() * Math.PI * 2,
  }))
}

export function dustPos(d: Dust, t: number): Vec {
  const a = d.a0 + d.w * t
  return { x: Math.cos(a) * d.r, y: Math.sin(a) * d.r * 0.92 }
}

export function dustAlpha(d: Dust, t: number): number {
  return d.alpha * (0.7 + 0.3 * Math.sin(t * 1.7 + d.twinkle))
}

// ---- the two objects that collide --------------------------------------------------------------

const easeIn = (k: number) => k * k * (1.4 - 0.4 * k) // starts slow, arrives fast, never overshoots 1

function between(a: Vec, b: Vec, k: number): Vec {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

export type BodyId = 'A' | 'B'

/** Where the object is at loop time u, or null while it is not on screen (before it appears and after the impact). */
export function bodyPos(id: BodyId, u: number): Vec | null {
  if (u < T_APPEAR || u > T_IMPACT) return null
  const k = easeIn((u - T_APPEAR) / (T_IMPACT - T_APPEAR))
  return between(id === 'A' ? START_A : START_B, IMPACT_POINT, k)
}

/** Fade-in over the first moments of the approach; fully opaque from then until the impact. */
export function bodyAlpha(u: number): number {
  if (u < T_APPEAR || u > T_IMPACT) return 0
  return Math.min(1, (u - T_APPEAR) / 0.5)
}

/** 0..1 how close the pair is to meeting, for the warning ring at the impact point (0 until it starts to show). */
export function warning(u: number): number {
  const start = T_IMPACT - 1.7
  if (u < start || u > T_IMPACT) return 0
  return (u - start) / (T_IMPACT - start)
}

// ---- the impact --------------------------------------------------------------------------------

export interface Flash { ring: number; glow: number }

/** Shock ring progress (0..1) and glow strength (1 -> 0) for FLASH_DURATION after the impact; null otherwise. */
export function flashAt(u: number): Flash | null {
  const s = u - T_IMPACT
  if (s < 0 || s > FLASH_DURATION) return null
  const k = s / FLASH_DURATION
  return { ring: 1 - (1 - k) ** 2, glow: (1 - k) ** 2 }
}

export interface Fragment { angle: number; speed: number; size: number; warm: boolean }

export function makeFragments(count: number, seed = 21): Fragment[] {
  const rnd = mulberry32(seed)
  return Array.from({ length: count }, () => ({
    angle: rnd() * Math.PI * 2,
    speed: 0.08 + rnd() ** 0.8 * 0.3,
    size: 0.0022 + rnd() * rnd() * 0.0052,
    warm: rnd() < 0.62,
  }))
}

/** Position and opacity of a fragment at loop time u; null before the impact or after it has faded out. */
export function fragmentAt(f: Fragment, u: number): { pos: Vec; alpha: number } | null {
  const s = u - T_IMPACT
  if (s < 0 || s > FRAGMENT_LIFE) return null
  // Exponential slow-down: the distance covered approaches speed / drag, so fragments spread and then hang in the cloud.
  const dist = (f.speed * (1 - Math.exp(-FRAGMENT_DRAG * s))) / FRAGMENT_DRAG * 2.2
  return {
    pos: { x: IMPACT_POINT.x + Math.cos(f.angle) * dist, y: IMPACT_POINT.y + Math.sin(f.angle) * dist },
    alpha: (1 - s / FRAGMENT_LIFE) ** 1.2,
  }
}

// ---- the orbit ring around the globe -----------------------------------------------------------

export const ORBIT = { a: 0.4, b: 0.135, tilt: (-22 * Math.PI) / 180 }

/** A point on the tilted orbit ellipse at angle `theta`. */
export function orbitPoint(theta: number): Vec {
  const x = Math.cos(theta) * ORBIT.a
  const y = Math.sin(theta) * ORBIT.b
  return { x: x * Math.cos(ORBIT.tilt) - y * Math.sin(ORBIT.tilt), y: x * Math.sin(ORBIT.tilt) + y * Math.cos(ORBIT.tilt) }
}

/** The satellites riding the orbit: angle at time t, one per phase offset. */
export function satelliteAngle(index: number, t: number): number {
  return (index / 3) * Math.PI * 2 + t * 0.55
}
