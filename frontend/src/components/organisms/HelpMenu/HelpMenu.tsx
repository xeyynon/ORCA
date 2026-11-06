import { Icon } from '../../atoms/Icon/Icon'
import { FineOnly } from '../../molecules/FineOnly/FineOnly'
import { MenuItem } from '../../molecules/MenuItem/MenuItem'
import { PopoverMenu } from '../PopoverMenu/PopoverMenu'

type Props = {
  onAsk: () => void
  onShortcuts: () => void
  onTour: () => void
}

/** Everything that helps a user find their way: ask a question, the keyboard shortcuts, and the guided tour again. */
export function HelpMenu({ onAsk, onShortcuts, onTour }: Props) {
  return (
    <PopoverMenu label="Help" icon={<Icon name="help" />} menuLabel="Help" tourId="help">
      {(close) => (
        <>
          <MenuItem label="Ask ORCA" hint="." icon={<Icon name="chat" />} onSelect={() => { close(false); onAsk() }} />
          <FineOnly><MenuItem label="Keyboard shortcuts" hint="?" icon={<Icon name="keyboard" />} onSelect={() => { close(false); onShortcuts() }} /></FineOnly>
          {/* Focus goes back to the help button first, so the tour returns it there when it closes. */}
          <MenuItem label="Take the tour" icon={<Icon name="info" />} onSelect={() => { close(true); onTour() }} />
        </>
      )}
    </PopoverMenu>
  )
}
