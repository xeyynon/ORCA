/**
 * Direction from the Earth to the Sun in the inertial equatorial frame (x toward the March equinox, z toward the north
 * pole), as a unit vector. This is the low-precision formula from the Astronomical Almanac, good to about 0.01 degrees
 * over decades: far more than a day/night terminator on a globe needs.
 */
export function sunDirectionEci(date: Date): [number, number, number] {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5
  const n = jd - 2_451_545.0 // days since J2000
  const rad = Math.PI / 180
  const meanLon = (280.46 + 0.9856474 * n) % 360
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * rad
  const lambda = (meanLon + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * rad
  const eps = (23.439 - 0.0000004 * n) * rad
  return [Math.cos(lambda), Math.cos(eps) * Math.sin(lambda), Math.sin(eps) * Math.sin(lambda)]
}
