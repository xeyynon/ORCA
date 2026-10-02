import { Kbd } from '../../atoms/Kbd/Kbd'
import './ShortcutRow.css'

type Props = { keys: readonly string[]; description: string }

export function ShortcutRow({ keys, description }: Props) {
  return (
    <div className="shortcut-row">
      <span className="shortcut-row__keys">
        {keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
      </span>
      <span className="shortcut-row__desc">{description}</span>
    </div>
  )
}
