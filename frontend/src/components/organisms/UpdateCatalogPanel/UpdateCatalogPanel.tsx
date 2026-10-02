import type { UpdatePhase } from '@/hooks/useCatalogUpdate'
import { integer } from '@/lib/format'
import { UPDATE_GIVE_UP_MS } from '@/lib/updatePolicy'
import { Button } from '../../atoms/Button/Button'
import { Label } from '../../atoms/Label/Label'
import { Icon } from '../../atoms/Icon/Icon'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import './UpdateCatalogPanel.css'

type Props = {
  phase: UpdatePhase
  before: number | null
  after: number | null
  error: string | null
  apiOnline: boolean
  onStart: () => void
}

/**
 * Trigger a Celestrak refresh and report what we can actually observe. The API returns "started"
 * immediately and has no completion signal, and it cannot tell us if Celestrak rate-limited the fetch
 * (that failure is swallowed to an empty list server-side). So "unchanged" is stated as exactly that.
 */
export function UpdateCatalogPanel({ phase, before, after, error, apiOnline, onStart }: Props) {
  const busy = phase === 'starting' || phase === 'waiting'
  return (
    <section className="update-panel">
      <Label>Refresh from Celestrak</Label>
      <div className="update-panel__row">
        <Button variant="primary" disabled={busy || !apiOnline} onClick={onStart}>
          <Icon name="refresh" size={14} /> {busy ? 'Refreshing…' : 'Fetch active catalog'}
        </Button>
        {!apiOnline ? <span className="update-panel__why">The API is not reachable.</span> : null}
      </div>

      {phase === 'waiting' ? (
        <EmptyState kind="awaiting" title="Fetch started">Waiting for the stored object count to change. The fetch is ~2.7 MB and can take a minute; the API gives no completion event, so this page polls.</EmptyState>
      ) : null}
      {phase === 'changed' ? (
        <EmptyState kind="none" title="Catalog updated">Objects stored: {integer(before)} → {integer(after)}.</EmptyState>
      ) : null}
      {phase === 'unchanged' ? (
        <EmptyState kind="error" title={`No change observed after ${UPDATE_GIVE_UP_MS / 1000} s`}>
          The stored count stayed at {integer(after)}. Celestrak may have refused the request (it returns 403 if hit repeatedly, and the API reports that as an empty fetch), or it is still working. Check the API log.
        </EmptyState>
      ) : null}
      {phase === 'failed' ? <EmptyState kind="error" title="Could not start the refresh">{error}</EmptyState> : null}

      <FieldNote>This pulls Celestrak's “active” group (about 10,000 objects). Repeated requests in a short window are rate-limited by Celestrak.</FieldNote>
    </section>
  )
}
