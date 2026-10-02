import { cx } from '@/lib/cx'
import { Mono } from '../../atoms/Mono/Mono'
import './SearchResultItem.css'

type Props = { name: string; id: string; active: boolean; onPick: () => void; onHover: () => void }

export function SearchResultItem({ name, id, active, onPick, onHover }: Props) {
  return (
    <li role="option" aria-selected={active} className={cx('search-result', active && 'search-result--active')} onMouseDown={(e) => { e.preventDefault(); onPick() }} onMouseEnter={onHover}>
      <span className="search-result__name">{name}</span>
      <Mono muted>{id}</Mono>
    </li>
  )
}
