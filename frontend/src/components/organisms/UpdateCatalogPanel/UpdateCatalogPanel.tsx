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
 * Trigger a CelesTrak refresh and report what we can actually observe. The API returns "started"
 * immediately and has no completion signal, so the page polls. A refused or failed CelesTrak fetch is
 * reported by the API in health.last_fetch and shown as "refused"; "unchanged" means nothing at all moved.
 */
export function UpdateCatalogPanel({ phase, before, after, error, apiOnline, onStart }: Props) {
  const busy = phase === 'starting' || phase === 'waiting'
  return (
    <section className="update-panel">
      <Label>Updating from CelesTrak</Label>
      <div className="update-panel__row">
        <Button variant="primary" disabled={busy || !apiOnline} onClick={onStart}>
          <Icon name="refresh" size={14} /> {busy ? 'Downloading…' : 'Download the latest catalog'}
        </Button>
        {!apiOnline ? <span className="update-panel__why">ORCA’s server isn’t answering, so this can’t start right now.</span> : null}
      </div>

      {phase === 'waiting' ? (
        <EmptyState kind="awaiting" title="Download started">We’re waiting for the number of stored objects to change. The download is about 2.7 MB and can take a minute. ORCA’s server doesn’t say when it has finished, so this page keeps checking.</EmptyState>
      ) : null}
      {phase === 'changed' ? (
        <EmptyState kind="none" title="The catalog has been updated">There are now {integer(after)} objects stored. Before, there were {integer(before)}.</EmptyState>
      ) : null}
      {phase === 'unchanged' ? (
        <EmptyState kind="error" title={`Nothing changed after ${UPDATE_GIVE_UP_MS / 1000} s`}>
          The number of stored objects stayed at {integer(after)}. ORCA’s server hasn’t reported a result either, so the download may still be running. Look again in a few minutes.
        </EmptyState>
      ) : null}
      {phase === 'refused' ? (
        <EmptyState kind="error" title="CelesTrak didn’t send any new data">
          {error} The stored catalog hasn’t changed ({integer(after)} objects).
        </EmptyState>
      ) : null}
      {phase === 'failed' ? <EmptyState kind="error" title="We couldn’t start the refresh">{error}</EmptyState> : null}

      <FieldNote>This downloads CelesTrak’s list of active satellites, many thousands of them. CelesTrak turns away requests that come too often, so after one download, wait a few minutes before asking again.</FieldNote>
    </section>
  )
}
