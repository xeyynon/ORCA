import { useMemo } from 'react'
import { getConjunctionMethod } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { ConjunctionEvent } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePairAssessment } from '@/hooks/usePairAssessment'
import { resultAnswer, resultHeadline, tierCounts } from '@/lib/conjunctionSummary'
import { downloadConjunctionsCsv, downloadConjunctionsJson } from '@/lib/exportConjunctions'
import { integer } from '@/lib/format'
import { countPast, pairKey } from '@/lib/pair'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { GlossaryTerm } from '../../molecules/GlossaryTerm/GlossaryTerm'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { ChartCard } from '../../organisms/ChartCard/ChartCard'
import { ConjunctionControls } from '../../organisms/ConjunctionControls/ConjunctionControls'
import { ConjunctionMethod } from '../../organisms/ConjunctionMethod/ConjunctionMethod'
import { ConjunctionTable } from '../../organisms/ConjunctionTable/ConjunctionTable'
import { EventTimeline } from '../../organisms/EventTimeline/EventTimeline'
import { JobProgress } from '../../organisms/JobProgress/JobProgress'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { PairCard } from '../../organisms/PairCard/PairCard'
import { ResultAnswer } from '../../organisms/ResultAnswer/ResultAnswer'
import { ResultCaveats } from '../../organisms/ResultCaveats/ResultCaveats'
import { RiskSummaryBar } from '../../organisms/RiskSummaryBar/RiskSummaryBar'
import { SavedRunBanner } from '../../organisms/SavedRunBanner/SavedRunBanner'
import './ConjunctionsView.css'

type Props = {
  catalogSize: number | null
  now: Date
  /** The search, its draft form and the selected row live in Workspace so they survive leaving this view. */
  search: ConjunctionSearch
  query: ConjunctionQuery
  onQueryChange: (q: ConjunctionQuery) => void
  selectedKey: string | null
  onSelectKey: (key: string | null) => void
  /** Median TLE age of the catalog, for the one caveat about forecast quality. Null when unknown. */
  medianTleAgeDays: number | null
  onShowOnGlobe: (ids: string[], event: ConjunctionEvent) => void
}

export function ConjunctionsView({ catalogSize, now, search, query, onQueryChange, selectedKey, onSelectKey, medianTleAgeDays, onShowOnGlobe }: Props) {
  const method = useAsync((signal) => getConjunctionMethod({ signal }), [])
  const running = search.phase === 'running'
  const elapsed = useElapsed(running, search.startedAt)

  const selected: ConjunctionEvent | null = useMemo(
    () => search.events.find((e) => pairKey(e) === selectedKey) ?? null,
    [search.events, selectedKey],
  )
  const saved = search.source === 'saved'
  // A saved example is a stored snapshot: re-assessing its pairs against the live catalog would mix two different datasets.
  const pair = usePairAssessment(saved ? null : selected)
  const result = search.result
  const counts = useMemo(() => (result ? tierCounts(result) : null), [result])

  // Esc closes the detail first (the app-wide Esc skips events a child already handled).
  useKeyboardShortcuts({ Escape: () => onSelectKey(null) }, selected !== null)

  const run = () => { onSelectKey(null); search.run(query) }
  const showSaved = () => {
    onSelectKey(null)
    loadSavedRun().then((res) => { if (search.loadSaved(res, SAVED_RUN_QUERY)) onQueryChange(SAVED_RUN_QUERY) }, () => undefined)
  }

  const pastCount = useMemo(() => countPast(search.events, now), [search.events, now])
  const reportKm = method.data?.report_km ?? null
  const stepS = method.data?.step_s ?? null

  let results
  if (search.phase === 'idle') {
    results = (
      <EmptyState kind="idle" title="No search run yet" action={<Button onClick={showSaved}>Explore a saved example run</Button>}>
        Choose a horizon, then run. The search screens the whole stored catalog and takes several minutes. You can leave this page while it runs.
        To see what a result looks like first, open the saved example.
      </EmptyState>
    )
  } else if (running) {
    results = (
      <JobProgress
        title="Searching for conjunctions…"
        detail={`${query.horizonDays}-day horizon over ${integer(catalogSize)} objects${stepS !== null ? `, every object propagated every ${stepS} s` : ''}. The API reports no stage or percentage, so only elapsed time is shown. You can leave this page; the search keeps running and its result will be here when you return.`}
        elapsedSeconds={elapsed}
        onCancel={search.cancel}
      />
    )
  } else if (search.phase === 'failed' && search.error) {
    results = <EmptyState kind="error" title="The search failed" action={<Button onClick={run}>Retry</Button>}>{search.error.message}</EmptyState>
  } else if (!result || result.total_events === 0) {
    results = (
      <EmptyState kind="none" title="No close approaches found">
        No two objects come closer than {result?.report_km ?? reportKm ?? 'the report distance'} km over the {search.query?.horizonDays}-day horizon. The screening
        distance covers the gap between steps, so an approach closer than that cannot be missed: this is a result, not an error.
      </EmptyState>
    )
  } else {
    const horizonDays = search.query?.horizonDays ?? query.horizonDays
    const answer = resultAnswer(counts ?? tierCounts(result), result.total_events, horizonDays, result.report_km)
    const headline = resultHeadline(result.events.length, result.total_events, result.report_km)
    const ranAt = search.finishedAt ? formatUtc(search.finishedAt.toISOString()) : '—'

    // Every caveat that used to be its own box, in order of importance. Nothing is dropped; they now share one.
    const caveats: string[] = []
    if (pastCount > 0) {
      caveats.push(`${pastCount === search.events.length ? 'Every event below is' : `${pastCount} of ${search.events.length} events are`} already in the past. The search window started when it ran (${formatUtc(result.window_start)}), so approaches between then and now are no longer a forecast. Run the search again for a fresh one.`)
    }
    caveats.push('Risk tiers depend on an assumed position uncertainty, because TLEs carry none. A different assumption can move a pair by orders of magnitude (see the method below).')
    if (result.long_encounters > 0) {
      caveats.push(`${integer(result.long_encounters)} long encounter${result.long_encounters === 1 ? '' : 's'}: these pairs pass slower than ${method.data?.long_encounter_kms ?? 0.1} km/s, so the probability, which assumes a fast straight-line pass, can be several times too low. They are marked "Long" in the table.`)
    }
    if (medianTleAgeDays !== null && medianTleAgeDays > 7) {
      caveats.push(`The element sets behind this forecast are a median ${Math.round(medianTleAgeDays)} days old, and accuracy falls quickly with age.`)
    }

    results = (
      <>
        {saved ? <SavedRunBanner ranAt={formatUtc(result.window_start)} disabled={running} onRunFresh={run} /> : null}
        <ResultAnswer answer={answer} context={`${horizonDays} d horizon · ${integer(result.objects)} objects · ran ${ranAt} in ${Math.round(result.runtime_s)} s`} />
        {counts ? (
          <ChartCard title="Every approach found, by risk tier" note={`${integer(result.total_events)} approaches closer than ${result.report_km} km, grouped by tier. The table below lists the highest-probability ones.`}>
            <RiskSummaryBar counts={counts} />
          </ChartCard>
        ) : null}
        <ResultCaveats items={caveats} />
        <ChartCard title="When, and how risky" note="The rows in the table: time on x, probability of collision on a log y axis, colour by risk tier. The dashed line is now. Hover a point for the pair; select it to open its detail.">
          <EventTimeline events={search.events} now={now} selectedKey={selectedKey} onSelect={(e) => onSelectKey(pairKey(e))} />
        </ChartCard>
        <div className="conj-view__bar">
          <span className="conj-view__meta">{headline}</span>
          <div className="conj-view__actions">
            <Button size="sm" onClick={() => downloadConjunctionsCsv(search.events)}><Icon name="download" size={14} /> CSV</Button>
            <Button size="sm" onClick={() => downloadConjunctionsJson(search.events)}><Icon name="download" size={14} /> JSON</Button>
          </div>
        </div>
        <div className={selected ? 'conj-view__grid conj-view__grid--split' : 'conj-view__grid'}>
          <div className="conj-view__table"><ConjunctionTable events={search.events} selectedKey={selectedKey} compact={selected !== null} onSelect={(e) => onSelectKey(pairKey(e))} /></div>
          {selected ? (
            <PairCard
              event={selected}
              assessment={pair.assessment}
              assessing={pair.loading}
              assessError={pair.error}
              saved={saved}
              onShowOnGlobe={() => onShowOnGlobe([selected.sat1_id, selected.sat2_id], selected)}
              onClose={() => onSelectKey(null)}
            />
          ) : null}
        </div>
        <FieldNote>
          <GlossaryTerm term="Pc" /> is the probability of collision, <GlossaryTerm term="TCA" /> the time of closest approach, and <GlossaryTerm term="miss distance" /> the
          separation at that moment; <GlossaryTerm term="uncertainty" /> is how far the true position may be from the computed one. Hover or focus a term for its meaning.
        </FieldNote>
      </>
    )
  }

  return (
    <PageLayout>
      <SectionHeader title="Conjunction screening" subtitle="Close approaches between catalog objects, forecast from public TLEs. Educational and research use only." />
      <ConjunctionControls query={query} catalogSize={catalogSize} stepS={stepS} reportKm={reportKm} running={running} onChange={onQueryChange} onRun={run} />
      {results}
      <ConjunctionMethod method={method.data} error={method.status === 'error' ? method.error.message : null} open={search.phase === 'idle'} />
    </PageLayout>
  )
}
