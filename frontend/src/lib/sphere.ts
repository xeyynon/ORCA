/**
 * Where a pixel of a drawn sphere lands on an equirectangular map (the usual world-map texture), as a pure function.
 *
 * (x, y) are disc coordinates in [-1, 1] with y UP and the viewer on +z. The sphere's north pole leans TOWARD the
 * viewer by `tilt` radians (so the north looks "above" the equator), and the sphere has turned east by `rot` radians.
 */
export interface SpherePoint {
  /** unit surface normal in view space (x right, y up, z toward the viewer) */
  nx: number
  ny: number
  nz: number
  /** map coordinates in [0, 1): u = 0.5 at lon 0, increasing east; v = 0 at the north pole, 1 at the south pole */
  u: number
  v: number
}

export function spherePoint(x: number, y: number, tilt: number, rot: number): SpherePoint | null {
  const d2 = x * x + y * y
  if (d2 > 1) return null
  const z = Math.sqrt(1 - d2)
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  // components of the surface normal along the body's own axes: north pole P = (0, c, s), and Q = (0, -s, c) in the y-z plane
  const north = y * c + z * s
  const toward = -y * s + z * c
  const lat = Math.asin(Math.max(-1, Math.min(1, north)))
  const lon = Math.atan2(x, toward) + rot
  const u = lon / (2 * Math.PI) + 0.5
  return { nx: x, ny: y, nz: z, u: u - Math.floor(u), v: 0.5 - lat / Math.PI }
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
