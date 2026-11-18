import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { Mono } from '../../atoms/Mono/Mono'
import './PrevNextNav.css'

type Props = {
  /** What one item is called, for the labels: "pair" gives "Previous pair" / "Next pair". */
  noun: string
  /** 1-based position and the count, shown between the buttons; omitted when unknown. */
  index?: number
  total?: number
  /** Null at that end of the list: the button stays, disabled, so the layout does not jump. */
  onPrev: (() => void) | null
  onNext: (() => void) | null
}

/**
 * Previous / Next through a list. The visible equivalent of a sideways swipe (WCAG 2.5.1), and handy with a mouse.
 * The noun is on the buttons ("Previous pair"), so they are not mistaken for the table's page buttons.
 */
export function PrevNextNav({ noun, index, total, onPrev, onNext }: Props) {
  return (
    <nav className="prev-next" aria-label={`Move between ${noun}s`}>
      <Button variant="ghost" disabled={!onPrev} onClick={onPrev ?? undefined}><Icon name="arrow-left" size={14} /> Previous {noun}</Button>
      {index !== undefined && total !== undefined ? <span className="prev-next__pos"><Mono muted>{index} of {total}</Mono></span> : null}
      <Button variant="ghost" disabled={!onNext} onClick={onNext ?? undefined}>Next {noun} <Icon name="arrow-right" size={14} /></Button>
    </nav>
  )
}
