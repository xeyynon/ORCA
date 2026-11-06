import { NavTab } from '../../molecules/NavTab/NavTab'
import { VIEWS, VIEW_LABEL } from '@/lib/views'
import type { ViewId } from '@/lib/views'

type Props = { view: ViewId; onChange: (v: ViewId) => void }

/** Hotkeys are the view's position, 1-5, shown on each tab. */
export function PrimaryNav({ view, onChange }: Props) {
  return (
    <>
      {VIEWS.map((v, i) => (
        <NavTab key={v} label={VIEW_LABEL[v]} hotkey={String(i + 1)} active={v === view} onClick={() => onChange(v)} />
      ))}
    </>
  )
}
