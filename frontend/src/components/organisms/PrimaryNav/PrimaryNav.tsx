import { Icon } from '../../atoms/Icon/Icon'
import type { IconName } from '../../atoms/Icon/Icon'
import { NavTab } from '../../molecules/NavTab/NavTab'
import { NAV_LABEL, NAV_VIEWS, VIEW_HOTKEY } from '@/lib/views'
import type { ViewId } from '@/lib/views'

type Props = { view: ViewId; onChange: (v: ViewId) => void }

const ICON: Record<ViewId, IconName> = { home: 'home', overview: 'list', globe: 'globe', conjunctions: 'orbit', analytics: 'chart', data: 'database', reports: 'file', health: 'database' }

/** One tab per view except Home (the logo goes home), each a simple icon with its label; the key is in the tooltip. */
export function PrimaryNav({ view, onChange }: Props) {
  return (
    <>
      {NAV_VIEWS.map((v) => (
        <NavTab key={v} label={NAV_LABEL[v]} icon={<Icon name={ICON[v]} size={15} />} hotkey={VIEW_HOTKEY[v].toUpperCase()} active={v === view} onClick={() => onChange(v)} />
      ))}
    </>
  )
}
