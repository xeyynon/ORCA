import './Spinner.css'

type Props = { size?: number; label?: string }

export function Spinner({ size = 14, label = 'Loading' }: Props) {
  return <span className="spinner" role="status" aria-label={label} style={{ width: size, height: size }} />
}
