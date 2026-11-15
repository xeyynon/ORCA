import { Icon } from '../../atoms/Icon/Icon'
import './ArrowLink.css'

type Props = { label: string; onClick: () => void }

/**
 * A text action that goes somewhere ("View all conjunctions"): accent text and an SVG arrow (not a typed glyph,
 * playbook UI-17), a 24 px hit area on desktop and 44 px on touch (UI-73). One component for every such link.
 */
export function ArrowLink({ label, onClick }: Props) {
  return (
    <button type="button" className="arrow-link" onClick={onClick}>
      {label}
      <span className="arrow-link__icon" aria-hidden="true"><Icon name="arrow-right" size={14} /></span>
    </button>
  )
}
