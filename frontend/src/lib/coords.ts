/**
 * Frame mapping between the engine's ECI frame (km; +z = north pole) and three.js (y up).
 * The map (x, y, z) -> (x, z, -y) is a proper rotation (det +1), so rotating the Earth mesh about
 * three's +y by GMST is exactly the ECEF -> ECI rotation about ECI +z. Scene unit = 1000 km.
 */
export const SCENE_UNIT_KM = 1000
export const EARTH_RADIUS_KM = 6371.0
export const EARTH_ROTATION_RAD_S = 7.2921159e-5

export type Vec3 = readonly [number, number, number]

export function eciToScene(r: Vec3): [number, number, number] {
  return [r[0] / SCENE_UNIT_KM, r[2] / SCENE_UNIT_KM, -r[1] / SCENE_UNIT_KM]
}

/** Linear extrapolation r + v*dt. Over ~20 s at LEO speed the arc error is ~2 km: invisible at globe scale. */
export function extrapolate(r: Vec3, v: Vec3, dtSeconds: number): [number, number, number] {
  return [r[0] + v[0] * dtSeconds, r[1] + v[1] * dtSeconds, r[2] + v[2] * dtSeconds]
}

/** True when the straight line from `cam` to `p` passes through a sphere of `radius` at the origin (p is hidden behind it). */
export function occludedBySphere(cam: Vec3, p: Vec3, radius: number): boolean {
  const d = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]]
  const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2]
  const b = 2 * (cam[0] * d[0] + cam[1] * d[1] + cam[2] * d[2])
  const c = cam[0] * cam[0] + cam[1] * cam[1] + cam[2] * cam[2] - radius * radius
  const disc = b * b - 4 * a * c
  if (disc < 0 || a === 0) return false
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t > 0 && t < 1
}

export interface ScreenPoint { id: string; x: number; y: number; hidden: boolean }

/** Nearest visible point to (x, y) within `maxPx`, or null. Hidden (behind-Earth) points are never picked. */
export function nearestScreenPoint(points: readonly ScreenPoint[], x: number, y: number, maxPx: number): string | null {
  let best: string | null = null
  let bestD = maxPx * maxPx
  for (const p of points) {
    if (p.hidden) continue
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d <= bestD) { bestD = d; best = p.id }
  }
  return best
}
