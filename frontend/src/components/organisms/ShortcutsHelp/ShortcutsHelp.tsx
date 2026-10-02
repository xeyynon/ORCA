import { SHORTCUT_GROUPS } from '@/lib/shortcuts'
import { Label } from '../../atoms/Label/Label'
import { ShortcutRow } from '../../molecules/ShortcutRow/ShortcutRow'
import { Modal } from '../Modal/Modal'
import './ShortcutsHelp.css'

type Props = { onClose: () => void }

export function ShortcutsHelp({ onClose }: Props) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.title} className="shortcuts-help__group">
          <div className="shortcuts-help__title"><Label>{g.title}</Label></div>
          {g.items.map((s) => <ShortcutRow key={s.description} keys={s.keys} description={s.description} />)}
        </section>
      ))}
    </Modal>
  )
}
