import { NavTab } from '../../molecules/NavTab/NavTab'
import { NAV_LABEL, VIEWS, VIEW_HOTKEY } from '@/lib/views'
import type { ViewId } from '@/lib/views'

type Props = { view: ViewId; onChange: (v: ViewId) => void }

/** One tab per view; each shows the key that opens it (VIEW_HOTKEY), so the shortcut is learned by looking. */
export function PrimaryNav({ view, onChange }: Props) {
  return (
    <>
      {VIEWS.map((v) => (
        <NavTab key={v} label={NAV_LABEL[v]} hotkey={VIEW_HOTKEY[v].toUpperCase()} active={v === view} onClick={() => onChange(v)} />
      ))}
    </>
  )
}
