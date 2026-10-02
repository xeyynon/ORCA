import './Swatch.css'

type Props = { color: string; shape?: 'square' | 'circle' }

/** Legend colour chip. `color` is a CSS value, normally a token: "var(--chart-1)". */
export function Swatch({ color, shape = 'square' }: Props) {
  return <span className={shape === 'circle' ? 'swatch swatch--circle' : 'swatch'} style={{ background: color }} aria-hidden="true" />
}
