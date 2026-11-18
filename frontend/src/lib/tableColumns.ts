// Which table columns a narrow screen shows. A column with hideBelow (px) is left out when the window is narrower than
// that, so a phone shows the few columns that matter instead of a table cut off at the edge (audit 2026-11-18 #8).

type Hideable = { hideBelow?: number }

/** The distinct widths at which some column appears or disappears, smallest first. */
export function columnBreakpoints(columns: readonly Hideable[]): number[] {
  const widths = columns.map((c) => c.hideBelow).filter((w): w is number => typeof w === 'number' && w > 0)
  return [...new Set(widths)].sort((a, b) => a - b)
}

/**
 * The window width rounded down to the nearest breakpoint (0 below the smallest). Two widths in the same band show the
 * same columns, so a table only redraws when a column actually comes or goes.
 */
export function widthBand(width: number, breakpoints: readonly number[]): number {
  let band = 0
  for (const b of breakpoints) if (width >= b) band = b
  return band
}

/** The columns to show at this width: every column without hideBelow, and those whose hideBelow the width reaches. */
export function visibleColumns<C extends Hideable>(columns: readonly C[], width: number): C[] {
  return columns.filter((c) => c.hideBelow === undefined || width >= c.hideBelow)
}
