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
import { integer, plural } from '@/lib/format'
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
    results = <EmptyState kind="idle" title="No search yet">Choose how many days ahead to look, then press Run search. It checks the whole catalog and can take a few minutes.</EmptyState>
  } else if (running) {
    results = (
      <JobProgress
        title="Searching for close approaches…"
        detail={`Checking ${plural(catalogSize ?? 0, 'object')} over the next ${plural(query.horizonDays, 'day')}, calculating positions every ${stepS ?? '…'} s. Progress is not reported, so the timer shows time elapsed.`}
        elapsedSeconds={elapsed}
        onCancel={search.cancel}
      />
    )
  } else if (search.phase === 'failed' && search.error) {
    results = <EmptyState kind="error" title="The search failed" action={<Button onClick={run}>Retry</Button>}>{search.error.message}</EmptyState>
  } else if (!result || result.total_events === 0) {
    results = (
      <EmptyState kind="none" title="No close approaches found">
        No two objects come closer than {result?.report_km ?? reportKm ?? '…'} km in the next {plural(search.query?.horizonDays ?? query.horizonDays, 'day')}. Positions
        are sampled finely enough that nothing closer can slip between two steps.
        {isSmallCatalog(catalogSize) ? ` This catalog holds only ${plural(catalogSize, 'object')}, so a quiet result is normal. The full public catalog has about 16,000.` : ''}
      </EmptyState>
    )
  } else {
    const headline = resultHeadline(result.events.length, result.total_events, result.report_km)
    results = (
      <>
        {pastCount > 0 ? (
          <Callout tone="warn" title={pastCount === search.events.length ? 'Every event below is already in the past' : `${pastCount} of ${search.events.length} events are already in the past`}>
            The search covered the time after it ran ({formatUtc(result.window_start)}). Approaches that have gone by since are no longer a forecast.
            Run the search again for current results.
          </Callout>
        ) : null}
        {result.long_encounters > 0 ? (
          <Callout tone="warn" title={`${integer(result.long_encounters)} long encounter${result.long_encounters === 1 ? '' : 's'}`}>
            These pairs drift past each other slower than {method.data?.long_encounter_kms ?? 0.1} km/s and stay close for a long while. The probability model
            assumes a quick, straight-line pass, so for them it can come out several times too low. They are marked “Long” in the table.
          </Callout>
        ) : null}
        {counts ? (
          <ChartCard title="Every approach found, by risk tier" note={`${integer(result.total_events)} approaches closer than ${result.report_km} km. TLEs come with no error estimate, so the tiers rest on an assumed position uncertainty (see the method above).`}>
            <RiskSummaryBar counts={counts} />
          </ChartCard>
        ) : null}
        <ChartCard title="When, and how risky" note="Each dot is one row of the table: when the closest approach happens (across) against its collision probability (up, on a log scale), coloured by risk tier. The dashed line marks now. Hover a dot to see the pair.">
          <EventTimeline events={search.events} now={now} />
        </ChartCard>
        <div className="conj-view__bar">
          <span className="conj-view__meta">
            {headline} · {search.query?.horizonDays}-day window · {integer(result.objects)} objects · ran {search.finishedAt ? formatUtc(search.finishedAt.toISOString()) : '—'} in {Math.round(result.runtime_s)} s
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
      <SectionHeader title="Conjunction screening" subtitle="Close approaches between catalog objects, forecast from public TLEs. For research and learning, not for operational decisions." />
      <ConjunctionControls query={query} catalogSize={catalogSize} stepS={stepS} reportKm={reportKm} running={running} onChange={setQuery} onRun={run} />
      <ConjunctionMethod method={method.data} error={method.status === 'error' ? method.error.message : null} />
      {results}
    </PageLayout>
  )
}
