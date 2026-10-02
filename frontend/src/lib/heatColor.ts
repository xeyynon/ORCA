/**
 * Colour of a density cell: a three-stop sequential ramp (--heat-0 -> --heat-1 -> --heat-2) on a log
 * scale, so a handful of objects stays visible next to a constellation of thousands. Empty cells have
 * no fill at all (a zero is not "the lowest colour"). Returns a CSS value built from tokens only.
 */
export function heatColor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return 'transparent'
  const t = Math.min(1, Math.log1p(count) / Math.log1p(max))
  return t < 0.5
    ? `color-mix(in srgb, var(--heat-1) ${Math.round(t * 200)}%, var(--heat-0))`
    : `color-mix(in srgb, var(--heat-2) ${Math.round((t - 0.5) * 200)}%, var(--heat-1))`
}
