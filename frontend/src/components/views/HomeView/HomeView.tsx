import { useState } from 'react'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { Health, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useHomeRun } from '@/hooks/useHomeRun'
import type { ApiStatus } from '@/hooks/useHealth'
import type { CatalogSummary } from '@/lib/catalog'
import { hookLines, riskFact } from '@/lib/homeHook'
import { dominantRegime, REGIME_NAME, sharePercent } from '@/lib/homeStory'
import { STALE_MEDIAN_DAYS } from '@/lib/staleness'
import type { ViewId } from '@/lib/views'
import { HomeFacts } from '../../organisms/HomeFacts/HomeFacts'
import type { HomeFact } from '../../organisms/HomeFacts/HomeFacts'
import { HomeHero } from '../../organisms/HomeHero/HomeHero'
import { HowItWorks } from '../../organisms/HowItWorks/HowItWorks'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import './HomeView.css'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  summary: CatalogSummary | null
  health: Health | null
  apiStatus: ApiStatus
  conjSearch: ConjunctionSearch
  onConjQueryChange: (q: ConjunctionQuery) => void
  onGo: (view: ViewId) => void
  onStartTour?: () => void
}

/**
 * The landing page, written for someone who has never seen ORCA (the owner: "no hook, they will leave"). In story order:
 * 1) the hook: one striking, true sentence, why it matters, two next steps, the orbit animation;
 * 2) how it works, in three steps;
 * 3) right now: three short facts for the curious.
 * Status detail (API, build, refresh times, age breakdowns) lives on the Data page, not here. Every figure is real; a
 * missing one is a skeleton while loading and a plain reason after.
 */
export function HomeView({ catalog, summary, health, apiStatus, conjSearch, onConjQueryChange, onGo, onStartTour }: Props) {
  const stored = health?.database.tles_count ?? null
  const whole = useCatalogSummary(stored).data
  const total = whole?.total ?? stored
  const run = useHomeRun(conjSearch)
  const lines = hookLines(total, run)

  const [opening, setOpening] = useState(false)
  // A result already on screen opens as it is; otherwise the stored example is loaded into the search, labelled there.
  const openApproaches = () => {
    if (conjSearch.result || conjSearch.phase === 'running') { onGo('conjunctions'); return }
    setOpening(true)
    loadSavedRun().then(
      (res) => { if (conjSearch.loadSaved(res, SAVED_RUN_QUERY)) onConjQueryChange(SAVED_RUN_QUERY); setOpening(false); onGo('conjunctions') },
      () => { setOpening(false); onGo('conjunctions') },
    )
  }

  const regimes = whole?.by_regime ?? summary?.regimes ?? null
  const regimeTotal = whole?.total ?? summary?.count ?? null
  const top = regimes ? dominantRegime(regimes) : null
  const topShare = top && regimes ? sharePercent(regimes[top], regimeTotal) : null
  const median = summary?.medianAgeDays ?? null
  const offline = apiStatus === 'offline'
  const catalogFailed = catalog.status === 'error' && !summary

  const facts: HomeFact[] = [
    {
      label: 'Where they orbit',
      value: top && topShare ? `${topShare} in ${REGIME_NAME[top]}` : null,
      missing: offline && !regimes ? 'Not available: the API is not answering.' : undefined,
      action: { label: 'See the charts', onSelect: () => onGo('analytics') },
    },
    {
      label: 'How fresh the data is',
      value: median !== null ? `${Math.round(median)} days old (median)` : null,
      missing: catalogFailed ? 'Not available: the catalog did not load.' : undefined,
      status: median !== null ? (median > STALE_MEDIAN_DAYS ? { tone: 'warn', word: 'Indicative only' } : { tone: 'ok', word: 'Fresh' }) : undefined,
      action: { label: 'Data and refresh', onSelect: () => onGo('data') },
    },
    {
      label: 'Close approaches',
      value: riskFact(run),
      note: run ? (run.saved ? 'In the stored example run.' : 'In your latest search.') : undefined,
      action: { label: 'Open', onSelect: openApproaches },
    },
  ]

  return (
    <PageLayout>
      <div className="home">
        <HomeHero lines={lines} onWatch={() => onGo('globe')} onApproaches={openApproaches} approachesBusy={opening} onStartTour={onStartTour} />
        <HowItWorks onGo={onGo} />
        <HomeFacts facts={facts} />
      </div>
    </PageLayout>
  )
}
