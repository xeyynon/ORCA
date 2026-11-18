import { API_BASE, API_ORIGIN, API_ROUTE_NOTE } from '@/api/client'
import type { Health } from '@/api/types'
import { useClipboard } from '@/hooks/useClipboard'
import type { ApiStatus, HealthCheck } from '@/hooks/useHealth'
import { copyState } from '@/lib/copyState'
import { integer } from '@/lib/format'
import { agoShort, healthHeadline, healthJson } from '@/lib/health'
import { fetchSummary } from '@/lib/homeBoard'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Dot } from '../../atoms/Dot/Dot'
import { Icon } from '../../atoms/Icon/Icon'
import { Mono } from '../../atoms/Mono/Mono'
import { CopyButton } from '../../molecules/CopyButton/CopyButton'
import { FactRow } from '../../molecules/FactRow/FactRow'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import './HealthView.css'

type Props = {
  health: Health | null
  apiStatus: ApiStatus
  check: HealthCheck
  onRecheck: () => void
  onBack: () => void
  now: Date
}

/**
 * The API's /health response as a page (owner, 2026-11-15: "rather than a json type of health check prepare a proper
 * page"), with the raw JSON one click away ("give an option for json"). Opened from Data; it has no tab.
 */
export function HealthView({ health, apiStatus, check, onRecheck, onBack, now }: Props) {
  const head = healthHeadline(apiStatus, check)
  const fetch = health?.database.last_fetch ?? null
  const fetchWords = fetchSummary(fetch)
  const json = healthJson(health)
  const { last, copy } = useClipboard()

  return (
    <PageLayout narrow>
      <div className="health-view__back">
        <Button size="sm" variant="ghost" onClick={onBack}><Icon name="arrow-left" size={14} /> Data</Button>
      </div>
      <SectionHeader title="API health" subtitle="Shows whether the ORCA API is responding, and what it says about its catalog." />

      <section className="health-view__answer" aria-live="polite">
        <div className="health-view__answer-title"><Dot tone={head.tone} /> {head.title}</div>
        <p className="health-view__answer-detail">{head.detail}</p>
        <div className="health-view__answer-foot">
          <span className="health-view__checked">Last check {agoShort(check.checkedAt, now)}</span>
          <Button size="sm" onClick={onRecheck}><Icon name="refresh" size={14} /> Check now</Button>
        </div>
      </section>

      <section className="health-view__card">
        <h2 className="health-view__h2">Server</h2>
        <div className="health-view__grid">
          <FactRow label="Reported status">{health ? <StatusIndicator tone={health.status === 'healthy' ? 'ok' : 'warn'} label={health.status === 'healthy' ? 'Healthy' : health.status} /> : <Mono muted>no response yet</Mono>}</FactRow>
          <FactRow label="Server time (UTC)">{health ? <Mono>{formatUtc(health.timestamp)}</Mono> : <Mono muted>—</Mono>}</FactRow>
          <FactRow label="Response time">{check.latencyMs !== null ? <Mono>{check.latencyMs} ms</Mono> : <Mono muted>—</Mono>}</FactRow>
          <FactRow label="Address"><Mono>{API_ORIGIN}</Mono>{API_ROUTE_NOTE ? <span className="health-view__route">{API_ROUTE_NOTE}</span> : null}</FactRow>
        </div>
      </section>

      <section className="health-view__card">
        <h2 className="health-view__h2">Catalog database</h2>
        <div className="health-view__grid">
          <FactRow label="Number of objects in catalog">{health ? <Mono>{integer(health.database.tles_count)}</Mono> : <Mono muted>—</Mono>}</FactRow>
          <FactRow label="Last updated from CelesTrak">{health?.database.last_update ? <Mono>{formatUtc(health.database.last_update)}</Mono> : <Mono muted>not recorded (the catalog was loaded another way)</Mono>}</FactRow>
          <FactRow label="Last download attempt"><StatusIndicator tone={fetchWords.tone} label={fetchWords.text} /></FactRow>
          <FactRow label="Attempted at">{fetch ? <Mono>{formatUtc(fetch.at)}</Mono> : <Mono muted>none yet</Mono>}</FactRow>
        </div>
        {fetch && fetch.status !== 'ok' && fetch.detail ? <p className="health-view__detail">{fetch.detail}</p> : null}
      </section>

      <details className="health-view__json">
        <summary className="health-view__json-summary">
          <span className="health-view__h2">Raw response (JSON)</span>
          <span className="health-view__json-hint">The last thing <Mono>GET /health</Mono> returned</span>
          <span className="health-view__chevron"><Icon name="chevron-down" size={16} /></span>
        </summary>
        <div className="health-view__json-actions">
          {json ? <CopyButton what="JSON" state={copyState(last, 'health-json')} onCopy={() => copy('health-json', json)} /> : null}
          <a className="health-view__link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">Open /health</a>
          <a className="health-view__link" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">API docs (Swagger)</a>
        </div>
        {json ? <pre className="health-view__pre" tabIndex={0} aria-label="Raw health response">{json}</pre> : <p className="health-view__detail">Nothing has been received yet.</p>}
      </details>
    </PageLayout>
  )
}
