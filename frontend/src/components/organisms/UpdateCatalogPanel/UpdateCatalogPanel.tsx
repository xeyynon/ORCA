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
  /** The Celestrak group the API pulls ("stations", "active"…); null when the API does not say. */
  group: string | null
  onStart: () => void
}

/**
 * Trigger a Celestrak refresh and report what we can actually observe. The API returns "started"
 * immediately and has no completion signal, so the page polls. A refused or failed Celestrak fetch is
 * reported by the API in health.last_fetch and shown as "refused"; "unchanged" means nothing at all moved.
 */
export function UpdateCatalogPanel({ phase, before, after, error, apiOnline, group, onStart }: Props) {
  const busy = phase === 'starting' || phase === 'waiting'
  return (
    <section className="update-panel">
      <Label>Refresh from Celestrak</Label>
      <div className="update-panel__row">
        <Button variant="primary" disabled={busy || !apiOnline} onClick={onStart}>
          <Icon name="refresh" size={14} /> {busy ? 'Refreshing…' : group ? `Fetch the ${group} catalog` : 'Fetch the catalog'}
        </Button>
        {!apiOnline ? <span className="update-panel__why">The API is not reachable.</span> : null}
      </div>

      {phase === 'waiting' ? (
        <EmptyState kind="awaiting" title="Fetch started">Waiting for the stored object count to change. This can take a minute.</EmptyState>
      ) : null}
      {phase === 'changed' ? (
        <EmptyState kind="none" title="Catalog updated">Objects stored: {integer(before)} → {integer(after)}.</EmptyState>
      ) : null}
      {phase === 'unchanged' ? (
        <EmptyState kind="error" title={`No change observed after ${UPDATE_GIVE_UP_MS / 1000} s`}>
          The stored count stayed at {integer(after)}. No fetch result was reported either, so the fetch may still be running. Check again in a minute.
        </EmptyState>
      ) : null}
      {phase === 'refused' ? (
        <EmptyState kind="error" title="Celestrak did not provide new data">
          {error} The stored catalog was left as it was ({integer(after)} objects).
        </EmptyState>
      ) : null}
      {phase === 'failed' ? <EmptyState kind="error" title="Could not start the refresh">{error}</EmptyState> : null}

      <FieldNote>{group ? `This pulls Celestrak's “${group}” group. ` : 'This pulls a group from Celestrak. '}Celestrak limits repeated requests, so wait a few minutes between refreshes.</FieldNote>
    </section>
  )
}
