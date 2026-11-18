import type { BuildNote } from '@/lib/builds'
import { formatBuildDate } from '@/lib/builds'
import { Modal } from '../Modal/Modal'
import './WhatsNew.css'

type Props = { builds: readonly BuildNote[]; onClose: () => void }

/**
 * What's new: each build newest first, its date and what changed in plain words (as in Tarang). The newest is the
 * build this copy of ORCA runs; it is marked so. Data comes in as props (lib/builds.ts); this only lays it out.
 */
export function WhatsNew({ builds, onClose }: Props) {
  return (
    <Modal title="What's new" onClose={onClose}>
      <ol className="whats-new">
        {builds.map((b, i) => (
          <li key={b.build} className="whats-new__build">
            <div className="whats-new__head">
              <h3 className="whats-new__title">{b.title}</h3>
              <span className="whats-new__meta">Build {b.build} · {formatBuildDate(b.date)}{i === 0 ? ' · the one you are using' : ''}</span>
            </div>
            <ul className="whats-new__changes">
              {b.changes.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
