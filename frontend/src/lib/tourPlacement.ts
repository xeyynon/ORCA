/**
 * Where the tour's spotlight and card go. Pure maths over rectangles, so it is tested without a browser.
 * Same idea as tooltipPlacement.ts: prefer a side, flip when it does not fit, and never leave the viewport.
 */

export type Rect = { left: number; top: number; width: number; height: number }
export type Size = { width: number; height: number }
export type CardSide = 'below' | 'above' | 'right' | 'left'
export type CardPlacement = { mode: 'sheet' } | { mode: 'float'; side: CardSide; left: number; top: number }

/** Below this width the card is a bottom sheet (see placeCard). */
export const SHEET_BELOW_PX = 640

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** The cut-out: the target grown by `pad` on each side, then kept inside the viewport so its ring is always visible. */
export function spotlightRect(target: Rect, viewport: Size, pad = 6, margin = 2): Rect {
  const left = Math.max(margin, target.left - pad)
  const top = Math.max(margin, target.top - pad)
  const right = Math.min(viewport.width - margin, target.left + target.width + pad)
  const bottom = Math.min(viewport.height - margin, target.top + target.height + pad)
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

/**
 * The card's position next to the (already padded) spotlight.
 *
 * Narrower than SHEET_BELOW_PX it is a bottom sheet: every target is in the header, at the top, so a sheet at the bottom
 * never covers what it points at, sits under the thumb, and is wide enough to read without a card squeezed beside a
 * full-width tab row.
 *
 * Otherwise the order is below, above, right, left: the first side with room for the whole card wins, and the card is
 * centred on the target along that side, then clamped inside the viewport. When no side has room, the side with the
 * most space is used and the card is clamped (it may then overlap the target, but it never leaves the screen).
 */
export function placeCard(spot: Rect, card: Size, viewport: Size, gap = 12, margin = 12): CardPlacement {
  if (viewport.width < SHEET_BELOW_PX) return { mode: 'sheet' }

  const room: Record<CardSide, number> = {
    below: viewport.height - (spot.top + spot.height) - gap - margin,
    above: spot.top - gap - margin,
    right: viewport.width - (spot.left + spot.width) - gap - margin,
    left: spot.left - gap - margin,
  }
  const need: Record<CardSide, number> = { below: card.height, above: card.height, right: card.width, left: card.width }
  const order: CardSide[] = ['below', 'above', 'right', 'left']
  const side = order.find((s) => room[s] >= need[s]) ?? order.reduce((best, s) => (room[s] - need[s] > room[best] - need[best] ? s : best))

  const centreX = spot.left + spot.width / 2 - card.width / 2
  const centreY = spot.top + spot.height / 2 - card.height / 2
  const maxLeft = viewport.width - margin - card.width
  const maxTop = viewport.height - margin - card.height

  let left: number
  let top: number
  if (side === 'below') { left = centreX; top = spot.top + spot.height + gap }
  else if (side === 'above') { left = centreX; top = spot.top - gap - card.height }
  else if (side === 'right') { left = spot.left + spot.width + gap; top = centreY }
  else { left = spot.left - gap - card.width; top = centreY }

  return { mode: 'float', side, left: Math.round(clamp(left, margin, maxLeft)), top: Math.round(clamp(top, margin, maxTop)) }
}
