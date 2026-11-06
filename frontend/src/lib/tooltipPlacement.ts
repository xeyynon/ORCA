export type TipAlign = 'left' | 'right'

/**
 * Which edge of a term a tooltip should hang from so it stays inside the viewport.
 * 'left' lines the tooltip's left edge up with the term (it grows rightward); 'right' lines up the right edges (it grows leftward).
 * Left is preferred; when neither side fits, the side that overflows less wins.
 */
export function tooltipAlign(term: { left: number; right: number }, tipWidth: number, viewportWidth: number, margin = 8): TipAlign {
  const overflowRight = Math.max(0, term.left + tipWidth - (viewportWidth - margin))
  const overflowLeft = Math.max(0, margin - (term.right - tipWidth))
  if (overflowRight === 0) return 'left'
  if (overflowLeft === 0) return 'right'
  return overflowLeft < overflowRight ? 'right' : 'left'
}
