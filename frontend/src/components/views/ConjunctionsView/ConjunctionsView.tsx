import { useMemo, useState } from 'react'
import { getConjunctionMethod } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import type { ConjunctionEvent } from '@/api/types'
import { isSmallCatalog } from '@/lib/catalogState'
import { useAsync } from '@/hooks/useAsync'
import { useConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePairAssessment } from '@/hooks/usePairAssessment'
import { resultHeadline, tierCounts } from '@/lib/conjunctionSummary'
import { downloadConjunctionsCsv, downloadConjunctionsJson } from '@/lib/exportConjunctions'
import { integer } from '@/lib/format'
import { countPast, pairKey } from '@/lib/pair'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { Callout } from '../../molecules/Callout/Callout'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { ConjunctionControls } from '../../organisms/ConjunctionControls/ConjunctionControls'
import { ConjunctionMethod } from '../../organisms/ConjunctionMethod/ConjunctionMethod'
import { ConjunctionTable } from '../../organisms/ConjunctionTable/ConjunctionTable'
import { EventTimeline } from '../../organisms/EventTimeline/EventTimeline'
import { JobProgress } from '../../organisms/JobProgress/JobProgress'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { PairCard } from '../../organisms/PairCard/PairCard'
import { RiskSummaryBar } from '../../organisms/RiskSummaryBar/RiskSummaryBar'
import './ConjunctionsView.css'

type Props = { catalogSize: number | null; now: Date; onShowOnGlobe: (ids: string[], event: ConjunctionEvent) => void }

const DEFAULT_QUERY: ConjunctionQuery = { horizonDays: 1, limit: 100 }

export function ConjunctionsView({ catalogSize, now, onShowOnGlobe }: Props) {
  const [query, setQuery] = useState<ConjunctionQuery>(DEFAULT_QUERY)
  const search = useConjunctionSearch()
  const method = useAsync((signal) => getConjunctionMethod({ signal }), [])
  const running = search.phase === 'running'
  const elapsed = useElapsed(running)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selected: ConjunctionEvent | null = useMemo(
    () => search.events.find((e) => pairKey(e) === selectedKey) ?? null,
    [search.events, selectedKey],
  )
  const pair = usePairAssessment(selected)
  const result = search.result
  const counts = useMemo(() => (result ? tierCounts(result) : null), [result])

  // Esc closes the detail first (the app-wide Esc skips events a child already handled).
  useKeyboardShortcuts({ Escape: () => setSelectedKey(null) }, selected !== null)

  const run = () => { setSelectedKey(null); search.run(query) }

  const pastCount = useMemo(() => countPast(search.events, now), [search.events, now])
  const reportKm = method.data?.report_km ?? null
  const stepS = method.data?.step_s ?? null

  let results
  if (search.phase === 'idle') {
    results = <EmptyState kind="idle" title="No search run yet">Choose a horizon, then run. The search screens the whole stored catalog and can take a few minutes.</EmptyState>
  } else if (running) {
    results = (
      <JobProgress
        title="Searching for conjunctions…"
        detail={`${query.horizonDays}-day horizon over ${integer(catalogSize)} objects, every object propagated every ${stepS ?? '…'} s. The API reports no stage or percentage, so only elapsed time is shown.`}
        elapsedSeconds={elapsed}
        onCancel={search.cancel}
      />
    )
  } else if (search.phase === 'failed' && search.error) {
    results = <EmptyState kind="error" title="The search failed" action={<Button onClick={run}>Retry</Button>}>{search.error.message}</EmptyState>
  } else if (!result || result.total_events === 0) {
    results = (
      <EmptyState kind="none" title="No close approaches found">
        No two objects come closer than {result?.report_km ?? reportKm ?? '…'} km over the {search.query?.horizonDays}-day horizon. The screening
        distance covers the gap between steps, so an approach closer than that cannot be missed: this is a result, not an error.
        {isSmallCatalog(catalogSize) ? ` The catalog holds only ${integer(catalogSize)} objects, so a quiet result is expected. The full public catalog has about 16,000.` : ''}
      </EmptyState>
    )
  } else {
    const headline = resultHeadline(result.events.length, result.total_events, result.report_km)
    results = (
      <>
        {pastCount > 0 ? (
          <Callout tone="warn" title={pastCount === search.events.length ? 'Every event below is already in the past' : `${pastCount} of ${search.events.length} events are already in the past`}>
            The search window started when it ran ({formatUtc(result.window_start)}). Approaches between then and now are no longer a forecast.
            Run the search again for a fresh one.
          </Callout>
        ) : null}
        {result.long_encounters > 0 ? (
          <Callout tone="warn" title={`${integer(result.long_encounters)} long encounter${result.long_encounters === 1 ? '' : 's'}`}>
            These pairs pass slower than {method.data?.long_encounter_kms ?? 0.1} km/s, so they stay close for a long time. The probability assumes a fast,
            straight-line pass and can be several times too low for them. They are marked in the table.
          </Callout>
        ) : null}
        {counts ? (
          <ChartCard title="Every approach found, by risk tier" note={`${integer(result.total_events)} approaches closer than ${result.report_km} km. Tiers depend on the assumed position uncertainty: TLEs carry none (see the method above).`}>
            <RiskSummaryBar counts={counts} />
          </ChartCard>
        ) : null}
        <ChartCard title="When, and how risky" note="The rows in the table: time on x, probability of collision on a log y axis, colour by risk tier. The dashed line is now; hover a dot for the pair.">
          <EventTimeline events={search.events} now={now} />
        </ChartCard>
        <div className="conj-view__bar">
          <span className="conj-view__meta">
            {headline} · {search.query?.horizonDays} d horizon · {integer(result.objects)} objects · ran {search.finishedAt ? formatUtc(search.finishedAt.toISOString()) : '—'} in {Math.round(result.runtime_s)} s
          </span>
          <div className="conj-view__actions">
            <Button size="sm" onClick={() => downloadConjunctionsCsv(search.events)}><Icon name="download" size={14} /> CSV</Button>
            <Button size="sm" onClick={() => downloadConjunctionsJson(search.events)}><Icon name="download" size={14} /> JSON</Button>
          </div>
        </div>
        <div className={selected ? 'conj-view__grid conj-view__grid--split' : 'conj-view__grid'}>
          <div className="conj-view__table"><ConjunctionTable events={search.events} selectedKey={selectedKey} compact={selected !== null} onSelect={(e) => setSelectedKey(pairKey(e))} /></div>
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
      <SectionHeader title="Conjunction screening" subtitle="Close approaches between catalog objects, forecast from public TLEs. Educational and research use only." />
      <ConjunctionControls query={query} catalogSize={catalogSize} stepS={stepS} reportKm={reportKm} running={running} onChange={setQuery} onRun={run} />
      <ConjunctionMethod method={method.data} error={method.status === 'error' ? method.error.message : null} />
      {results}
    </PageLayout>
  )
}
