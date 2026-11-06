import { useMemo, useState } from 'react'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { Health, TleRecord } from '@/api/types'
import type { AsyncResult } from '@/hooks/useAsync'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useCountUp } from '@/hooks/useCountUp'
import { useElapsed } from '@/hooks/useElapsed'
import type { ApiStatus } from '@/hooks/useHealth'
import type { CatalogSummary } from '@/lib/catalog'
import { resultAnswer, resultHeadline, tierCounts } from '@/lib/conjunctionSummary'
import { integer } from '@/lib/format'
import { catalogStory, storyScope } from '@/lib/homeStory'
import { formatUtc } from '@/lib/time'
import type { ViewId } from '@/lib/views'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { BentoGrid } from '../../organisms/BentoGrid/BentoGrid'
import { ConjunctionTile } from '../../organisms/ConjunctionTile/ConjunctionTile'
import type { ConjunctionTileState } from '../../organisms/ConjunctionTile/ConjunctionTile'
import { FreshnessTile } from '../../organisms/FreshnessTile/FreshnessTile'
import { GlobeTile } from '../../organisms/GlobeTile/GlobeTile'
import { HomeHeroTile } from '../../organisms/HomeHeroTile/HomeHeroTile'
import { LearnTile } from '../../organisms/LearnTile/LearnTile'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { RegimeTile } from '../../organisms/RegimeTile/RegimeTile'
import { SystemTile } from '../../organisms/SystemTile/SystemTile'

type Props = {
  catalog: AsyncResult<TleRecord[]>
  /** Summary of the LOADED rows (ages, and regimes until the whole-catalog count arrives). */
  summary: CatalogSummary | null
  health: Health | null
  apiStatus: ApiStatus
  /** The workspace's conjunction search: its result (or the saved example) is shown here, never re-run. */
  conjSearch: ConjunctionSearch
  onConjQueryChange: (q: ConjunctionQuery) => void
  onGo: (view: ViewId) => void
  /** Starts the first-run tour; the Learn tile offers it only when given. */
  onStartTour?: () => void
}

/**
 * Mission control, the landing view: a bento grid that tells the catalog's story from real data (MD/design_system_v2.md
 * milestone 2). Every figure comes from the API or the loaded catalog; a missing one is a skeleton while it loads and a
 * dash or a stated reason after.
 */
export function HomeView({ catalog, summary, health, apiStatus, conjSearch, onConjQueryChange, onGo, onStartTour }: Props) {
  const stored = health?.database.tles_count ?? null
  const server = useCatalogSummary(stored)
  const whole = server.data

  // Hero: the whole-catalog count from the server, else the stored count from /health.
  const total = whole?.total ?? stored
  const shownTotal = useCountUp(total)
  const regimes = whole?.by_regime ?? summary?.regimes ?? null
  const regimeTotal = whole ? whole.total : (summary?.count ?? null)
  const story = catalogStory({ regimes, total: regimeTotal, medianAgeDays: summary?.medianAgeDays ?? null })
  const loaded = summary?.count ?? null
  const scope = storyScope({ wholeCounts: whole !== null, loaded, total })
  const partial = loaded !== null && total !== null && loaded < total
  const apiDown = apiStatus === 'offline' && total === null

  const catalogWaiting = catalog.status === 'loading' && !summary
  const catalogFailed = catalog.status === 'error' && !summary ? `The catalog could not be loaded: ${catalog.error.message}` : null

  const running = conjSearch.phase === 'running'
  const elapsed = useElapsed(running, conjSearch.startedAt)
  const [openingSaved, setOpeningSaved] = useState(false)
  const exploreSaved = () => {
    setOpeningSaved(true)
    loadSavedRun().then(
      (res) => { if (conjSearch.loadSaved(res, SAVED_RUN_QUERY)) onConjQueryChange(SAVED_RUN_QUERY); onGo('conjunctions') },
      () => { setOpeningSaved(false); onGo('conjunctions') },
    )
  }

  const conjState: ConjunctionTileState = useMemo(() => {
    const { phase, result, error, query, finishedAt, source } = conjSearch
    if (phase === 'running') return { kind: 'running', elapsedSeconds: elapsed }
    if (phase === 'failed') return { kind: 'failed', message: error?.message ?? 'No reason was given.' }
    if (phase === 'idle' || !result) return { kind: 'idle' }
    const horizonDays = query?.horizonDays ?? SAVED_RUN_QUERY.horizonDays
    const context = `${horizonDays} d horizon · ${integer(result.objects)} objects · ran ${finishedAt ? formatUtc(finishedAt.toISOString()) : '—'}`
    const answer = result.total_events > 0 ? resultAnswer(tierCounts(result), result.total_events, horizonDays, result.report_km) : null
    const none = `${resultHeadline(0, 0, result.report_km)} over the ${horizonDays}-day horizon.`
    return { kind: 'done', answer, none, context, saved: source === 'saved' }
  }, [conjSearch, elapsed])

  return (
    <PageLayout>
      <SectionHeader title="Mission control" subtitle="What is in orbit, how fresh the data is, and what needs a look." />
      <BentoGrid>
        <HomeHeroTile
          total={total}
          shownTotal={shownTotal}
          story={story}
          scope={scope}
          loading={total === null && !apiDown}
          unavailable={apiDown ? 'The API did not answer, so the catalog cannot be counted yet.' : null}
          onShowOnGlobe={() => onGo('globe')}
        />
        <FreshnessTile
          medianAgeDays={summary?.medianAgeDays ?? null}
          oldestAgeDays={summary?.oldestAgeDays ?? null}
          newestAgeDays={summary?.newestAgeDays ?? null}
          futureEpochs={summary?.futureEpochs ?? 0}
          loading={catalogWaiting}
          scope={partial ? `Over the first ${integer(loaded)} of ${integer(total)} objects (by name), as loaded here.` : null}
          unavailable={catalogFailed ?? (summary ? 'No element set has an age to measure.' : null)}
        />
        <ConjunctionTile state={conjState} onOpen={() => onGo('conjunctions')} onExploreSaved={exploreSaved} loadingSaved={openingSaved} />
        <RegimeTile
          counts={regimes}
          total={regimeTotal}
          unclassified={whole?.regime_unclassified ?? summary?.unclassified ?? 0}
          scope={whole ? `All ${integer(whole.total)} stored objects.` : partial ? `The first ${integer(loaded)} of ${integer(total)} objects (by name)${server.status === 'error' ? ': the whole-catalog count could not be loaded.' : ', until the whole-catalog count arrives.'}` : null}
          loading={!regimes && (server.status === 'loading' || catalogWaiting)}
          unavailable={catalogFailed}
        />
        <GlobeTile />
        <SystemTile apiStatus={apiStatus} storedCount={stored} lastRefresh={health?.database.last_update ?? null} build={__ORCA_BUILD__} />
        <LearnTile onStartTour={onStartTour} />
      </BentoGrid>
    </PageLayout>
  )
}
