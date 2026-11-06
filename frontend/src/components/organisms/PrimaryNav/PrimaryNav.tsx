import { Icon } from '../../atoms/Icon/Icon'
import type { IconName } from '../../atoms/Icon/Icon'
import { NavTab } from '../../molecules/NavTab/NavTab'
import { NAV_LABEL, VIEWS, VIEW_HOTKEY } from '@/lib/views'
import type { ViewId } from '@/lib/views'

type Props = { view: ViewId; onChange: (v: ViewId) => void }

const ICON: Record<ViewId, IconName> = { home: 'home', overview: 'list', globe: 'globe', conjunctions: 'orbit', analytics: 'chart', data: 'database' }

/** One tab per view, each a simple icon with its label; the key that opens it is in the tooltip. */
export function PrimaryNav({ view, onChange }: Props) {
  return (
    <>
      {VIEWS.map((v) => (
        <NavTab key={v} label={NAV_LABEL[v]} icon={<Icon name={ICON[v]} size={15} />} hotkey={VIEW_HOTKEY[v].toUpperCase()} active={v === view} onClick={() => onChange(v)} />
      ))}
    </>
  )
}
