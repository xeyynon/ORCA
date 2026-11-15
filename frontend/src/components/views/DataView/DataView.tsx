import { API_BASE, API_ORIGIN } from '@/api/client'
import type { Health } from '@/api/types'
import type { UpdatePhase } from '@/hooks/useCatalogUpdate'
import type { ApiStatus } from '@/hooks/useHealth'
import type { CatalogSummary } from '@/lib/catalog'
import { Icon } from '../../atoms/Icon/Icon'
import { Mono } from '../../atoms/Mono/Mono'
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
    <PageLayout narrow>
      <SectionHeader title="Data" subtitle="Where the catalog comes from, how old it is, and how to refresh it." />
      <div className="data-view__grid">
        <DataStatusCard
          count={health?.database.tles_count ?? summary?.count ?? null}
          lastUpdate={health?.database.last_update ?? null}
          lastFetch={health?.database.last_fetch ?? null}
          newestAgeDays={summary?.newestAgeDays ?? null}
          oldestAgeDays={summary?.oldestAgeDays ?? null}
        />
        <UpdateCatalogPanel phase={update.phase} before={update.before} after={update.after} error={update.error} apiOnline={apiStatus === 'online'} onStart={update.start} />
      </div>
      {/* Developer detail, closed by default; the API state stays visible in its summary (declutter plan 2026-11-15). */}
      <details className="data-view__api">
        <summary className="data-view__api-summary">
          <span className="data-view__api-title">API</span>
          <StatusIndicator tone={tone} label={label} />
          <span className="data-view__api-hint">For developers: address, health check, build</span>
          <span className="data-view__api-chevron"><Icon name="chevron-down" size={16} /></span>
        </summary>
        <div className="data-view__api-grid">
          <FactRow label="Base URL"><Mono>{API_ORIGIN}</Mono></FactRow>
          <FactRow label="Health check"><a className="data-view__link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">/health (JSON)</a></FactRow>
          <FactRow label="Interactive docs"><a className="data-view__link" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">/docs (Swagger)</a></FactRow>
          <FactRow label="App build"><Mono>{__ORCA_BUILD__}</Mono></FactRow>
        </div>
        <FieldNote>Every view reads the same stored catalog through the API. Refreshing here changes what they all show.</FieldNote>
      </details>
    </PageLayout>
  )
}
