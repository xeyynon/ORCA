import { useMemo, useRef } from 'react'
import { getConjunctionMethod } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import type { ConjunctionEvent } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePairAssessment } from '@/hooks/usePairAssessment'
import { useRevealOnSelect } from '@/hooks/useRevealOnSelect'
import { durationText, resultAnswer, tableLine, tierCounts, windowText } from '@/lib/conjunctionSummary'
import { downloadConjunctionsCsv, downloadConjunctionsJson } from '@/lib/exportConjunctions'
import { integer } from '@/lib/format'
import { countPast, pairKey } from '@/lib/pair'
import { sortBy } from '@/lib/sort'
import { stepIndex } from '@/lib/swipe'
import { formatDay, formatLongUtc } from '@/lib/time'
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
  /** False when the API health check says the server is unreachable: a search can't start then. */
  apiOnline: boolean
  onShowOnGlobe: (ids: string[], event: ConjunctionEvent) => void
}

export function ConjunctionsView({ catalogSize, now, search, query, onQueryChange, selectedKey, onSelectKey, medianTleAgeDays, apiOnline, onShowOnGlobe }: Props) {
  const method = useAsync((signal) => getConjunctionMethod({ signal }), [])
  const running = search.phase === 'running'
  const elapsed = useElapsed(running, search.startedAt)

  const selected: ConjunctionEvent | null = useMemo(
    () => search.events.find((e) => pairKey(e) === selectedKey) ?? null,
    [search.events, selectedKey],
  )
  // Previous/next pair follow the table's default order (Pc, highest first). The table sorts internally, so a re-sorted
  // table is not followed: exposing its order would mean lifting its sort state out of ConjunctionTable.
  const ordered = useMemo(() => sortBy(search.events, (e) => e.probability_of_collision, 'desc'), [search.events])
  const at = selected ? ordered.indexOf(selected) : -1
  const neighbour = (step: -1 | 1) => {
    const i = stepIndex(at, step, ordered.length)
    return i === null ? null : () => onSelectKey(pairKey(ordered[i]))
  }
  const saved = search.source === 'saved'
  // A saved example is a stored snapshot: re-assessing its pairs against the live catalog would mix two different datasets.
  const pair = usePairAssessment(saved ? null : selected)
  const result = search.result
  const counts = useMemo(() => (result ? tierCounts(result) : null), [result])

  // Esc closes the detail first (the app-wide Esc skips events a child already handled).
  useKeyboardShortcuts({ Escape: () => onSelectKey(null) }, selected !== null)
  // One column below 1100 px (ConjunctionsView.css) puts the pair card under the table: bring it into view on a new selection.
  const gridRef = useRef<HTMLDivElement>(null)
  useRevealOnSelect(gridRef, selected ? selectedKey : null, '(max-width: 1100px)', '.pair-card')

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
      <EmptyState kind="idle" title="You haven’t run a search yet" action={<Button onClick={showSaved}>Look at a saved example run</Button>}>
        Pick how many days ahead to look, then press Run search. The search checks the whole stored catalog and takes several minutes. You can leave this page while it runs.
        If you want to see what a result looks like first, open the saved example.
      </EmptyState>
    )
  } else if (running) {
    results = (
      <JobProgress
        title="Searching for close approaches…"
        detail={`Looking ${query.horizonDays} ${query.horizonDays === 1 ? 'day' : 'days'} ahead across ${integer(catalogSize)} objects${stepS !== null ? `, with every object’s position worked out every ${stepS} s` : ''}. The API doesn’t report its progress, so we can only show how long the search has been running. You can leave this page. The search keeps going, and the result will be here when you come back.`}
        elapsedSeconds={elapsed}
        onCancel={search.cancel}
      />
    )
  } else if (search.phase === 'failed' && search.error) {
    results = <EmptyState kind="error" title="The search didn’t work" action={<Button onClick={run}>Retry</Button>}>{search.error.message}</EmptyState>
  } else if (!result || result.total_events === 0) {
    results = (
      <EmptyState kind="none" title="No close approaches found">
        No two objects come closer than {result?.report_km ?? reportKm ?? 'the report distance'} km over the {search.query?.horizonDays} days searched. The screening
        distance covers the gaps between time steps, so an approach closer than that can’t be missed. This is a real result, not an error.
      </EmptyState>
    )
  } else {
    const span = windowText(result.window_start, result.window_end)
    const answer = resultAnswer(counts ?? tierCounts(result), result.total_events, { start: result.window_start, end: result.window_end }, result.report_km)
    const headline = tableLine(result.events.length, result.total_events)

    // Every caveat that applies, in order of importance, in one box. Short sentences in plain words (audit 2026-11-18 #24).
    const caveats: string[] = []
    if (saved) {
      caveats.push(`This is a saved example run from ${formatDay(result.window_start)}, so you can explore a result while you wait for your own search. Its times are now in the past, and the orbits have changed since then.`)
    } else if (pastCount > 0) {
      caveats.push(`${pastCount === search.events.length ? 'All of the approaches listed below are' : `${pastCount} of the ${search.events.length} approaches listed below ${pastCount === 1 ? 'is' : 'are'}`} already in the past. The search window began when the search ran (${formatLongUtc(result.window_start)} UTC), so ${pastCount === 1 ? 'that one is' : 'those are'} no longer a forecast. Run the search again for a new forecast.`)
    }
    caveats.push('TLEs don’t say how uncertain each position is, so ORCA assumes an uncertainty. A different assumption could make a pair’s probability much higher or lower and change its risk tier. The method section below explains how the tiers are set.')
    if (result.long_encounters > 0) {
      const one = result.long_encounters === 1
      caveats.push(`${integer(result.long_encounters)} ${one ? 'pair is a long encounter: its two objects pass' : 'pairs are long encounters: their two objects pass'} each other slower than ${method.data?.long_encounter_kms ?? 0.1} km/s. The probability assumes a fast, straight-line pass, so for these slow pairs it is not reliable: it may be too high or too low. They are marked “Long” in the table.`)
    }
    if (medianTleAgeDays !== null && medianTleAgeDays > 7) {
      caveats.push(`The orbital data behind this forecast has a median age of ${Math.round(medianTleAgeDays)} days. Forecasts get less accurate quickly as the data gets older.`)
    }

    results = (
      <>
        <ResultAnswer answer={answer} context={`Searched ${integer(result.objects)} objects from ${span}, took ${durationText(result.runtime_s)}`} />
        {counts ? (
          <ChartCard title="All approaches found, grouped by risk tier">
            <RiskSummaryBar counts={counts} />
          </ChartCard>
        ) : null}
        <ResultCaveats items={caveats} action={saved ? <Button size="sm" disabled={running || !apiOnline} onClick={run}>Run a fresh search</Button> : undefined} />
        <ChartCard title="When each approach happens, and how risky it is" note="This chart shows the rows from the table. The y axis uses a log scale, and the dashed line marks now. Select a point to open that pair.">
          <EventTimeline events={search.events} now={now} selectedKey={selectedKey} onSelect={(e) => onSelectKey(pairKey(e))} />
        </ChartCard>
        <div className="conj-view__bar">
          <span className="conj-view__meta">{headline}</span>
          <div className="conj-view__actions">
            <Button size="sm" onClick={() => downloadConjunctionsCsv(search.events)}><Icon name="download" size={14} /> CSV</Button>
            <Button size="sm" onClick={() => downloadConjunctionsJson(search.events)}><Icon name="download" size={14} /> JSON</Button>
          </div>
        </div>
        <div className={selected ? 'conj-view__grid conj-view__grid--split' : 'conj-view__grid'} ref={gridRef}>
          <div className="conj-view__table"><ConjunctionTable events={search.events} selectedKey={selectedKey} compact={selected !== null} onSelect={(e) => onSelectKey(pairKey(e))} /></div>
          {selected ? (
            <PairCard
              event={selected}
              assessment={pair.assessment}
              assessing={pair.loading}
              assessError={pair.error}
              saved={saved}
              onPrev={neighbour(-1)}
              onNext={neighbour(1)}
              index={at >= 0 ? at + 1 : undefined}
              total={ordered.length}
              onShowOnGlobe={() => onShowOnGlobe([selected.sat1_id, selected.sat2_id], selected)}
              onClose={() => onSelectKey(null)}
            />
          ) : null}
        </div>
        <FieldNote>
          <GlossaryTerm term="Pc" />, <GlossaryTerm term="TCA" />, <GlossaryTerm term="miss distance" /> and <GlossaryTerm term="uncertainty" />. Hover over or focus on any of these terms to see what it means.
        </FieldNote>
      </>
    )
  }

  return (
    <PageLayout>
      <SectionHeader title="Conjunction screening" subtitle="This page looks for close approaches between objects in the catalog, forecast from public TLEs. It is for education and research only." />
      <ConjunctionControls query={query} catalogSize={catalogSize} running={running} apiOnline={apiOnline} onChange={onQueryChange} onRun={run} />
      {results}
      <ConjunctionMethod method={method.data} error={method.status === 'error' ? method.error.message : null} open={search.phase === 'idle'} />
    </PageLayout>
  )
}
