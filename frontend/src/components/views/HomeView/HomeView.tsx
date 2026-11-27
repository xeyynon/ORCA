import { useState } from 'react'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { ConjunctionEvent, Health, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import type { ApiStatus } from '@/hooks/useHealth'
import { useHomeRun } from '@/hooks/useHomeRun'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { CatalogSummary } from '@/lib/catalog'
import { integer } from '@/lib/format'
import { homeKpis, previewEvents, runWindowLine } from '@/lib/homeBoard'
import type { KpiId } from '@/lib/homeBoard'
import { hookLines } from '@/lib/homeHook'
import { pairKey } from '@/lib/pair'
import { STALE_MEDIAN_DAYS } from '@/lib/staleness'
import { formatUtc } from '@/lib/time'
import type { ViewId } from '@/lib/views'
import { ApproachPreview } from '../../organisms/ApproachPreview/ApproachPreview'
import { DataQuality } from '../../organisms/DataQuality/DataQuality'
import { HomeHero } from '../../organisms/HomeHero/HomeHero'
import { HomeKpis } from '../../organisms/HomeKpis/HomeKpis'
import { OrbitDistribution } from '../../organisms/OrbitDistribution/OrbitDistribution'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { StaleDataBanner } from '../../organisms/StaleDataBanner/StaleDataBanner'
import './HomeView.css'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  summary: CatalogSummary | null
  health: Health | null
  apiStatus: ApiStatus
  conjSearch: ConjunctionSearch
  onConjQueryChange: (q: ConjunctionQuery) => void
  /** Selects a row on the Conjunctions view (its detailed analysis), or clears the selection. */
  onSelectConjunction: (key: string | null) => void
  onGo: (view: ViewId) => void
  onStartTour?: () => void
  now: Date
}

const GO_LABEL: Record<KpiId, string> = {
  pairs: 'See the close approaches',
  high: 'See the close approaches',
  critical: 'See the close approaches',
}

/**
 * The home page as a space-monitoring command centre, in this order:
 * 1) mission overview: the headline with the real object count, what ORCA does, two actions, a medium Earth;
 * 2) orbital intelligence: three figures, each naming the run it comes from;
 * 3) close approach intelligence: the run's five worst approaches, each opening its full analysis;
 * 4) where objects orbit, beside data quality (how old the data is, and whether the API answers).
 * The System status section that ended the page repeated the headline and Data quality; its API row moved into Data
 * quality (declutter plan 2026-11-15).
 * Track / Screen / Understand moved into the tour. Every figure is real; stored example-run values are labelled so,
 * never as live monitoring. Each part has its own loading, empty and error state.
 */
export function HomeView({ catalog, summary, health, apiStatus, conjSearch, onConjQueryChange, onSelectConjunction, onGo, onStartTour, now }: Props) {
  const stored = health?.database.tles_count ?? null
  const wholeQuery = useCatalogSummary(stored)
  const whole = wholeQuery.data
  const total = whole?.total ?? stored
  const home = useHomeRun(conjSearch)
  const run = home.status === 'ready' ? home.run : null
  const events = home.status === 'ready' ? home.events : []
  const bigScreen = useMediaQuery('(min-width: 1600px) and (min-height: 1000px)')
  const offline = apiStatus === 'offline'

  const [opening, setOpening] = useState(false)
  // A result already on screen opens as it is; otherwise the stored example is loaded into the search, labelled there.
  // `key` selects one approach so its detailed analysis opens.
  const openApproaches = (key: string | null = null) => {
    if (conjSearch.result || conjSearch.phase === 'running') { onSelectConjunction(key); onGo('conjunctions'); return }
    setOpening(true)
    loadSavedRun().then(
      (res) => { if (conjSearch.loadSaved(res, SAVED_RUN_QUERY)) onConjQueryChange(SAVED_RUN_QUERY); onSelectConjunction(key); setOpening(false); onGo('conjunctions') },
      () => { setOpening(false); onGo('conjunctions') },
    )
  }

  const provenance = run
    ? `The top five worst of the ${integer(events.length)} most probable close approach results in this run.`
    : null

  // One refresh time, one wording, on Home and Data (audit 2026-11-18 #18): the API's last_update, the moment the
  // stored catalog was last replaced by a successful CelesTrak download.
  const snapshot = health ? (health.database.last_update ? formatUtc(health.database.last_update) : 'not recorded') : null

  return (
    <PageLayout>
      <div className="home">
        {/* The first screen says when the API stops answering (audit 2026-11-15 §10): the page keeps the last data.
            This banner is the one place Home says so; its action opens the API health page (audit 2026-11-18 #19). */}
        {offline ? (
          <StaleDataBanner
            tone="bad"
            notice={{ title: 'ORCA’s server isn’t answering', body: 'You’re seeing the last data that loaded. Nothing will update until it’s back.' }}
            actionLabel="See the server status"
            onGoData={() => onGo('health')}
          />
        ) : null}
        <HomeHero
          lines={hookLines(total, offline || summary?.medianAgeDays != null
            // Not answering counts as not current: the figures are the last ones loaded, so no "right now".
            ? { stale: offline || (summary?.medianAgeDays ?? 0) > STALE_MEDIAN_DAYS, asOf: health?.database.last_update ?? null }
            : null)}
          snapshot={snapshot}
          onExploreGlobe={() => onGo('globe')}
          onViewConjunctions={() => openApproaches()}
          conjunctionsBusy={opening}
          onStartTour={onStartTour}
          earthSize={bigScreen ? 400 : 340}
        />
        <HomeKpis kpis={homeKpis(run)} goLabel={GO_LABEL} onOpen={() => openApproaches()} />
        <ApproachPreview
          status={home.status}
          events={previewEvents(events)}
          provenance={provenance}
          reportKm={run?.reportKm ?? null}
          windowLine={home.status === 'ready' ? runWindowLine(home.run, home.windowEnd, now) : null}
          now={now}
          onOpen={(e: ConjunctionEvent) => openApproaches(pairKey(e))}
          onViewAll={() => openApproaches()}
        />
        <div className="home__pair">
          <OrbitDistribution
            counts={whole?.by_regime ?? null}
            unclassified={whole?.regime_unclassified ?? 0}
            total={whole?.total ?? null}
            failed={wholeQuery.status === 'error'}
            onRetry={wholeQuery.reload}
            onOpen={() => onGo('analytics')}
          />
          <DataQuality
            medianAgeDays={summary?.medianAgeDays ?? null}
            newestAgeDays={summary?.newestAgeDays ?? null}
            measuredOver={summary?.count ?? null}
            storedTotal={total}
            lastUpdate={health?.database.last_update ?? null}
            lastFetch={health?.database.last_fetch ?? null}
            known={health !== null}
            offline={offline}
            catalogFailed={catalog.status === 'error' && !summary}
            apiStatus={apiStatus}
            onOpen={() => onGo('data')}
          />
        </div>
      </div>
    </PageLayout>
  )
}
