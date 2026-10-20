import { API_BASE } from '@/api/client'
import type { Health } from '@/api/types'
import type { UpdatePhase } from '@/hooks/useCatalogUpdate'
import type { ApiStatus } from '@/hooks/useHealth'
import type { CatalogSummary } from '@/lib/catalog'
import { groupLabel } from '@/lib/catalogState'
import { Mono } from '../../atoms/Mono/Mono'
import { Label } from '../../atoms/Label/Label'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { DataStatusCard } from '../../organisms/DataStatusCard/DataStatusCard'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { UpdateCatalogPanel } from '../../organisms/UpdateCatalogPanel/UpdateCatalogPanel'
import './DataView.css'

type Props = {
  health: Health | null
  apiStatus: ApiStatus
  summary: CatalogSummary | null
  update: { phase: UpdatePhase; before: number | null; after: number | null; error: string | null; start: () => void }
}

export function DataView({ health, apiStatus, summary, update }: Props) {
  const tone = apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'bad' : 'warn'
  const label = apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Unreachable' : 'Checking…'
  return (
    <PageLayout>
      <SectionHeader title="Data" subtitle="Where the catalog comes from, how old it is, and how to refresh it." />
      <div className="data-view__grid">
        <DataStatusCard
          count={health?.database.tles_count ?? summary?.count ?? null}
          lastUpdate={health?.database.last_update ?? null}
          lastFetch={health?.database.last_fetch ?? null}
          newestAgeDays={summary?.newestAgeDays ?? null}
          oldestAgeDays={summary?.oldestAgeDays ?? null}
        />
        <UpdateCatalogPanel phase={update.phase} before={update.before} after={update.after} error={update.error} apiOnline={apiStatus === 'online'} group={groupLabel(health?.database.tle_group)} onStart={update.start} />
      </div>
      <section className="data-view__api">
        <Label>API</Label>
        <div className="data-view__api-grid">
          <FactRow label="Status"><StatusIndicator tone={tone} label={label} /></FactRow>
          <FactRow label="Address"><Mono>{API_BASE || 'same origin'}</Mono></FactRow>
          <FactRow label="Documentation"><a className="data-view__link" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">Open the API docs</a></FactRow>
        </div>
        <FieldNote>Every page reads this one catalog through the API, so a refresh here changes what all of them show.</FieldNote>
      </section>
    </PageLayout>
  )
}
