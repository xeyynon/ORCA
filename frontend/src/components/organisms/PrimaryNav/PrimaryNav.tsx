import { NavTab } from '../../molecules/NavTab/NavTab'
import { VIEWS } from '@/lib/views'
import type { ViewId } from '@/lib/views'

const LABELS: Record<ViewId, string> = {
  overview: 'Overview',
  globe: 'Globe',
  conjunctions: 'Conjunctions',
  analytics: 'Analytics',
  data: 'Data',
}

type Props = { view: ViewId; onChange: (v: ViewId) => void }

/** Hotkeys are the view's position, 1-5, shown on each tab. */
export function PrimaryNav({ view, onChange }: Props) {
  return (
    <>
      {VIEWS.map((v, i) => (
        <NavTab key={v} label={LABELS[v]} hotkey={String(i + 1)} active={v === view} onClick={() => onChange(v)} />
      ))}
    </>
  )
}
