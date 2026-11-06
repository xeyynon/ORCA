import { useState } from 'react'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { Health, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useHomeRun } from '@/hooks/useHomeRun'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { ApiStatus } from '@/hooks/useHealth'
import type { CatalogSummary } from '@/lib/catalog'
import { hookLines, riskStat } from '@/lib/homeHook'
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
 * 1) the hook, on the page itself: one striking, true sentence, why it matters, two next steps, three live figures,
 *    and the orbit animation large beside it;
 * 2) how it works, as a light three-step strip, each step the way into its view;
 * 3) one line of fine print: where the figures come from, and that it is an educational tool.
 * The page fills the screen (the hero takes the spare height) and fits one screen from 1280×720 up.
 * Status detail (API, build, refresh times, age breakdowns) lives on the Data page, not here. Every figure is real; a
 * missing one is a skeleton while loading and a plain reason after.
 */
export function HomeView({ catalog, summary, health, apiStatus, conjSearch, onConjQueryChange, onGo, onStartTour }: Props) {
  const stored = health?.database.tles_count ?? null
  const whole = useCatalogSummary(stored).data
  const total = whole?.total ?? stored
  const run = useHomeRun(conjSearch)
  const lines = hookLines(total, run)

  const bigScreen = useMediaQuery('(min-width: 1600px) and (min-height: 1000px)')
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

  const risk = riskStat(run)
  // Most telling first: the risk, then where they are, then how much to trust the figures.
  const facts: HomeFact[] = [
    {
      topic: 'Close approaches',
      figure: risk?.figure ?? null,
      caption: risk?.caption ?? null,
      note: risk?.note,
      goLabel: 'See the ranked approaches',
      onSelect: openApproaches,
    },
    {
      topic: 'Where they orbit',
      figure: topShare,
      caption: top ? `in ${REGIME_NAME[top]}` : null,
      missing: offline && !regimes ? 'Unavailable' : undefined,
      goLabel: 'See the charts',
      onSelect: () => onGo('analytics'),
    },
    {
      topic: 'How fresh the data is',
      figure: median !== null ? `${Math.round(median)} days` : null,
      caption: 'median age of the orbit data',
      missing: catalogFailed ? 'Unavailable' : undefined,
      status: median !== null ? (median > STALE_MEDIAN_DAYS ? { tone: 'warn', word: 'Indicative only' } : { tone: 'ok', word: 'Fresh' }) : undefined,
      goLabel: 'Data and refresh',
      onSelect: () => onGo('data'),
    },
  ]

  return (
    <PageLayout fill>
      <div className="home">
        <HomeHero
          lines={lines}
          onWatch={() => onGo('globe')}
          onApproaches={openApproaches}
          approachesBusy={opening}
          onStartTour={onStartTour}
          stats={<HomeFacts facts={facts} />}
          earthSize={bigScreen ? 480 : 400}
        />
        <HowItWorks onGlobe={() => onGo('globe')} onSearch={() => onGo('conjunctions')} onApproaches={openApproaches} />
        <p className="home__fineprint">{lines.source ? `${lines.source} ` : ''}Educational tool, not for operational decisions.</p>
      </div>
    </PageLayout>
  )
}
