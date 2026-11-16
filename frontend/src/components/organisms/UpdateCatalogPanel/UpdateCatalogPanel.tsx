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
 * immediately and has no completion signal, so the page polls. A refused or failed Celestrak fetch is
 * reported by the API in health.last_fetch and shown as "refused"; "unchanged" means nothing at all moved.
 */
export function UpdateCatalogPanel({ phase, before, after, error, apiOnline, onStart }: Props) {
  const busy = phase === 'starting' || phase === 'waiting'
  return (
    <section className="update-panel">
      <Label>Updating from Celestrak</Label>
      <div className="update-panel__row">
        <Button variant="primary" disabled={busy || !apiOnline} onClick={onStart}>
          <Icon name="refresh" size={14} /> {busy ? 'Refreshing…' : 'Active catalog pull'}
        </Button>
        {!apiOnline ? <span className="update-panel__why">The API can’t be reached.</span> : null}
      </div>

      {phase === 'waiting' ? (
        <EmptyState kind="awaiting" title="Download started">We’re waiting for the number of stored objects to change. The download is about 2.7 MB and can take a minute. The API doesn’t tell us when it has finished, so this page keeps checking.</EmptyState>
      ) : null}
      {phase === 'changed' ? (
        <EmptyState kind="none" title="The catalog has been updated">There are now {integer(after)} objects stored. Before, there were {integer(before)}.</EmptyState>
      ) : null}
      {phase === 'unchanged' ? (
        <EmptyState kind="error" title={`Nothing changed after ${UPDATE_GIVE_UP_MS / 1000} s`}>
          The number of stored objects stayed at {integer(after)}. The API hasn’t reported a result either, so the download might still be running. Check the API log.
        </EmptyState>
      ) : null}
      {phase === 'refused' ? (
        <EmptyState kind="error" title="Celestrak didn’t send any new data">
          {error} The stored catalog hasn’t changed ({integer(after)} objects).
        </EmptyState>
      ) : null}
      {phase === 'failed' ? <EmptyState kind="error" title="We couldn’t start the refresh">{error}</EmptyState> : null}

      <FieldNote>There will be many thousands of elements in Celestrak's “active” category. If you ask repeatedly over a short time period, your requests may be limited based on Celestrak's rate limits.</FieldNote>
    </section>
  )
}
