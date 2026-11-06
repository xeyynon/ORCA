import './Skeleton.css'

type Props = { width?: number | string; height?: number | string }

/**
 * A block the shape of what is coming, for a small inline wait (a count, a figure). It carries no text and is hidden from
 * assistive tech: the surrounding region says what is loading. Under prefers-reduced-motion the shimmer stops (base.css).
 */
export function Skeleton({ width = '3ch', height = '1em' }: Props) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height }} />
}
