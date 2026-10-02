import './Brand.css'

export function Brand() {
  return (
    <div className="brand">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
        <ellipse cx="10" cy="10" rx="8.5" ry="3.2" fill="none" stroke="var(--accent)" strokeWidth="1" transform="rotate(-28 10 10)" />
        <circle cx="16.2" cy="6.4" r="1.6" fill="var(--text-primary)" />
      </svg>
      <span className="brand__name">ORCA</span>
    </div>
  )
}
