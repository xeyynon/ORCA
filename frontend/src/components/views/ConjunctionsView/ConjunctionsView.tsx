import { useMemo, useState } from 'react'
import type { ConjunctionQuery } from '@/api/endpoints'
import type { ConjunctionEvent } from '@/api/types'
import { useConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePairAssessment } from '@/hooks/usePairAssessment'
import { downloadConjunctionsCsv, downloadConjunctionsJson } from '@/lib/exportConjunctions'
import { integer } from '@/lib/format'
import { countPast, pairKey } from '@/lib/pair'
import { countByRisk } from '@/lib/risk'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { Callout } from '../../molecules/Callout/Callout'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { ConjunctionControls } from '../../organisms/ConjunctionControls/ConjunctionControls'
import { ConjunctionTable } from '../../organisms/ConjunctionTable/ConjunctionTable'
import { EventTimeline } from '../../organisms/EventTimeline/EventTimeline'
import { JobProgress } from '../../organisms/JobProgress/JobProgress'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { PairCard } from '../../organisms/PairCard/PairCard'
import { RiskSummaryBar } from '../../organisms/RiskSummaryBar/RiskSummaryBar'
import './ConjunctionsView.css'

type Props = { catalogSize: number | null; now: Date; onShowOnGlobe: (ids: string[], event: ConjunctionEvent) => void }

const DEFAULT_QUERY: ConjunctionQuery = { horizonDays: 1, stepHours: 2, limit: 100 }

export function ConjunctionsView({ catalogSize, now, onShowOnGlobe }: Props) {
  const [query, setQuery] = useState<ConjunctionQuery>(DEFAULT_QUERY)
  const search = useConjunctionSearch()
  const running = search.phase === 'running'
  const elapsed = useElapsed(running)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selected: ConjunctionEvent | null = useMemo(
    () => search.events.find((e) => pairKey(e) === selectedKey) ?? null,
    [search.events, selectedKey],
  )
  const pair = usePairAssessment(selected)
  const counts = useMemo(() => countByRisk(search.events), [search.events])

  // Esc closes the detail first (the app-wide Esc skips events a child already handled).
  useKeyboardShortcuts({ Escape: () => setSelectedKey(null) }, selected !== null)

  const run = () => { setSelectedKey(null); search.run(query) }

  const pastCount = useMemo(() => countPast(search.events, now), [search.events, now])

  let results
  if (search.phase === 'idle') {
    results = <EmptyState kind="idle" title="No search run yet">Choose a horizon and step, then run. The search screens the whole stored catalog and can take from seconds to minutes.</EmptyState>
  } else if (running) {
    results = (
      <JobProgress
        title="Searching for conjunctions…"
        detail={`${query.horizonDays}-day horizon, ${query.stepHours} h step, over ${integer(catalogSize)} objects. The API reports no stage or percentage, so only elapsed time is shown.`}
        elapsedSeconds={elapsed}
        onCancel={search.cancel}
      />
    )
  } else if (search.phase === 'failed' && search.error) {
    results = <EmptyState kind="error" title="The search failed" action={<Button onClick={run}>Retry</Button>}>{search.error.message}</EmptyState>
  } else if (search.events.length === 0) {
    results = (
      <EmptyState kind="none" title="No conjunctions found">
        The search completed and found no close approaches within the screening distance over {search.query?.horizonDays} days at a {search.query?.stepHours} h step. That is a result, not an error. A smaller step can catch passes that close between two steps.
      </EmptyState>
    )
  } else {
    results = (
      <>
        {pastCount > 0 ? (
          <Callout tone="warn" title={pastCount === search.events.length ? 'Every event below is already in the past' : `${pastCount} of ${search.events.length} events are already in the past`}>
            A closest approach before now is not a forecast. A few hours before now is normal near the start of the window, because each
            time of closest approach is refined up to 6 h around its search step. If they are days old, the search ran on an older
            API that started from the TLE epoch instead of the current time: restart the API.
          </Callout>
        ) : null}
        <RiskSummaryBar counts={counts} />
        <ChartCard title="When, and how risky" note="Time on x, probability of collision on a log y axis, colour by risk tier. The dashed line is now; hover a dot for the pair.">
          <EventTimeline events={search.events} now={now} />
        </ChartCard>
        <div className="conj-view__bar">
          <span className="conj-view__meta">
            {integer(search.events.length)} events · {search.query?.horizonDays} d horizon · {search.query?.stepHours} h step · run {search.finishedAt ? formatUtc(search.finishedAt.toISOString()) : '—'}
          </span>
          <div className="conj-view__actions">
            <Button size="sm" onClick={() => downloadConjunctionsCsv(search.events)}><Icon name="download" size={14} /> CSV</Button>
            <Button size="sm" onClick={() => downloadConjunctionsJson(search.events)}><Icon name="download" size={14} /> JSON</Button>
          </div>
        </div>
        <div className={selected ? 'conj-view__grid conj-view__grid--split' : 'conj-view__grid'}>
          <div className="conj-view__table"><ConjunctionTable events={search.events} selectedKey={selectedKey} onSelect={(e) => setSelectedKey(pairKey(e))} /></div>
          {selected ? (
            <PairCard
              event={selected}
              assessment={pair.assessment}
              assessing={pair.loading}
              assessError={pair.error}
              onShowOnGlobe={() => onShowOnGlobe([selected.sat1_id, selected.sat2_id], selected)}
              onClose={() => setSelectedKey(null)}
            />
          ) : null}
        </div>
      </>
    )
  }

  return (
    <PageLayout>
      <SectionHeader title="Conjunction screening" subtitle="Screening finds candidate close approaches. A candidate is a hypothesis, not a confirmed threat." />
      <ConjunctionControls query={query} catalogSize={catalogSize} running={running} onChange={setQuery} onRun={run} />
      {results}
    </PageLayout>
  )
}
