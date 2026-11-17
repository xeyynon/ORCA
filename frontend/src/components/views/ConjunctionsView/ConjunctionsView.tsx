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
import { resultAnswer, tableLine, tierCounts } from '@/lib/conjunctionSummary'
import { downloadConjunctionsCsv, downloadConjunctionsJson } from '@/lib/exportConjunctions'
import { integer } from '@/lib/format'
import { countPast, pairKey } from '@/lib/pair'
import { sortBy } from '@/lib/sort'
import { stepIndex } from '@/lib/swipe'
import { formatLongUtc, formatUtc } from '@/lib/time'
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
  onShowOnGlobe: (ids: string[], event: ConjunctionEvent) => void
}

const NUMBER_WORD: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven' }
/** "one (1) day", "three (3) days": the search horizon written out. */
const dayWords = (n: number) => `${NUMBER_WORD[n] ? `${NUMBER_WORD[n]} (${n})` : n} ${n === 1 ? 'day' : 'days'}`

export function ConjunctionsView({ catalogSize, now, search, query, onQueryChange, selectedKey, onSelectKey, medianTleAgeDays, onShowOnGlobe }: Props) {
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
    const horizonDays = search.query?.horizonDays ?? query.horizonDays
    const answer = resultAnswer(counts ?? tierCounts(result), result.total_events, horizonDays, result.report_km)
    const headline = tableLine(result.events.length, result.total_events)
    const ranAt = search.finishedAt ? formatUtc(search.finishedAt.toISOString()) : '—'

    // Every caveat that used to be its own box, in order of importance. Nothing is dropped; they now share one.
    const caveats: string[] = []
    if (saved) {
      // The saved-run notice and the "in the past" caveat said one thing twice; now it is the first point (declutter plan).
      caveats.push(`This is an example run that was saved from a time when the UTC time was ${formatLongUtc(result.window_start)}. The saved runs allow us to have something for users to explore while they wait for results from their searches. The times listed with the results are now historical and the orbital elements used to create them have changed over time.`)
    } else if (pastCount > 0) {
      caveats.push(`${pastCount === search.events.length ? 'All of the events listed below have' : `${pastCount} of the ${search.events.length} events listed below ${pastCount === 1 ? 'has' : 'have'}`} already taken place. The search window began at the time the search was run (${formatLongUtc(result.window_start)}), so any approaches that occurred between then and now are no longer a forecast. Please run the search again to obtain a new forecast.`)
    }
    caveats.push('The Risk Tier values will vary depending upon what uncertainty value is assumed for each position as there is no uncertainty associated with the positional information included in TLEs. An alternate uncertainty may increase or decrease a pair’s probability by orders of magnitude. Please see the method section below for additional details regarding the risk tiers.')
    if (result.long_encounters > 0) {
      const one = result.long_encounters === 1
      caveats.push(`There ${one ? 'is' : 'are'} ${integer(result.long_encounters)} long encounter ${one ? 'pair. This pair' : 'pairs. All of these pairs'} will pass one another less quickly than ${method.data?.long_encounter_kms ?? 0.1} km/sec. Because the likelihood calculation assumes a fast, direct path through space (a straight line), this likelihood may be several times lower than actual for ${one ? 'this long encounter pair' : 'these long encounter pairs'}. Long encounters are denoted by "Long" in the Results Table.`)
    }
    if (medianTleAgeDays !== null && medianTleAgeDays > 7) {
      caveats.push(`The orbital data used to create this forecast has a median age of ${Math.round(medianTleAgeDays)} days, and its accuracy decreases quickly as the data ages.`)
    }

    results = (
      <>
        <ResultAnswer answer={answer} context={`Looked ${dayWords(horizonDays)} into the future · Identified ${integer(result.objects)} objects · Ran on ${ranAt} · Took approximately ${integer(Math.round(result.runtime_s))} seconds`} />
        {counts ? (
          <ChartCard title="All approaches found, grouped by risk tier">
            <RiskSummaryBar counts={counts} />
          </ChartCard>
        ) : null}
        <ResultCaveats items={caveats} action={saved ? <Button size="sm" disabled={running} onClick={run}>Run a fresh search</Button> : undefined} />
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
        <div className={selected ? 'conj-view__grid conj-view__grid--split' : 'conj-view__grid'}>
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
      <ConjunctionControls query={query} catalogSize={catalogSize} running={running} onChange={onQueryChange} onRun={run} />
      {results}
      <ConjunctionMethod method={method.data} error={method.status === 'error' ? method.error.message : null} open={search.phase === 'idle'} />
    </PageLayout>
  )
}
