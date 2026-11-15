import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getConjunctionMethod } from '@/api/endpoints'
import type { Health } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import type { ConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useHomeRun } from '@/hooks/useHomeRun'
import type { CatalogSummary } from '@/lib/catalog'
import { previewEvents } from '@/lib/homeBoard'
import { blockedReason, DEFAULT_REPORT, defaultPairKey, reportFileName, reportReference } from '@/lib/report'
import type { ReportOptions } from '@/lib/report'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import { ReportBuilder } from '../../organisms/ReportBuilder/ReportBuilder'
import { ReportDocument } from '../../organisms/ReportDocument/ReportDocument'
import './ReportsView.css'

type Props = {
  summary: CatalogSummary | null
  health: Health | null
  conjSearch: ConjunctionSearch
  /** The pair selected on Conjunctions, preselected for the single-pair section when it is in the run. */
  selectedConjKey: string | null
  username: string
  now: Date
}

/**
 * Reports: choose what goes in, read the live preview, generate a PDF. The preview IS the report (one component on
 * white paper), and Generate prints a second copy of it that only exists for print, so the PDF matches the screen.
 * Run figures come from the run on screen (your search) or the stored example, and the report names which.
 */
export function ReportsView({ summary, health, conjSearch, selectedConjKey, username, now }: Props) {
  const stored = health?.database.tles_count ?? null
  const whole = useCatalogSummary(stored).data
  const home = useHomeRun(conjSearch)
  const method = useAsync((signal) => getConjunctionMethod({ signal }), [])
  const [options, setOptions] = useState<ReportOptions>(DEFAULT_REPORT)

  const ready = home.status === 'ready'
  const events = useMemo(() => (home.status === 'ready' ? home.events : []), [home])
  const ranked = useMemo(() => previewEvents(events, events.length), [events])

  // Preselect a pair once the run is in: the one chosen on Conjunctions, else the worst approach.
  useEffect(() => {
    if (!ready || options.pairKey !== null) return
    const key = defaultPairKey(ranked, selectedConjKey, ranked[0])
    if (key) setOptions((o) => (o.pairKey === null ? { ...o, pairKey: key } : o))
  }, [ready, ranked, options.pairKey, selectedConjKey])

  const blocked = blockedReason(options, ready, events)
  const generatedAt = new Date(Math.floor(now.getTime() / 60000) * 60000) // to the minute: the reference is stable while you read

  // The browser names the saved PDF after the document title, so it carries the report's file name while printing.
  const generate = () => {
    const previous = document.title
    const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore) }
    window.addEventListener('afterprint', restore)
    document.title = reportFileName(generatedAt)
    window.print()
  }

  // Once the run is ready the report's own run line names it, so the builder says nothing (declutter plan 2026-11-15);
  // it speaks only while the run is loading or when it failed.
  const source = ready
    ? null
    : home.status === 'failed' ? 'The close-approach run could not be loaded.' : 'Loading the close-approach run…'

  // The same document twice: the on-screen preview (its title an h2 under the page's h1) and the print-only copy (h1).
  const report = (preview: boolean) => (
    <ReportDocument
      preview={preview}
      options={options}
      generatedAt={generatedAt}
      reference={reportReference(generatedAt)}
      preparedBy={username}
      objects={whole?.total ?? stored}
      regimes={whole ? { counts: whole.by_regime, unclassified: whole.regime_unclassified, total: whole.total } : null}
      run={ready ? home.run : null}
      tierCounts={ready ? home.tierCounts : null}
      windowEnd={ready ? home.windowEnd : null}
      events={events}
      quality={{
        medianAgeDays: summary?.medianAgeDays ?? null,
        newestAgeDays: summary?.newestAgeDays ?? null,
        oldestAgeDays: summary?.oldestAgeDays ?? null,
        measuredOver: summary?.count ?? null,
        lastUpdate: health?.database.last_update ?? null,
        lastFetch: health?.database.last_fetch ?? null,
      }}
      method={method.data ?? null}
    />
  )

  return (
    <PageLayout>
      <SectionHeader title="Reports" subtitle="Choose what goes in, check the preview, and save it as a PDF." />
      <div className="reports">
        <div className="reports__builder">
          <ReportBuilder options={options} onChange={setOptions} pairs={ranked} source={source} blocked={blocked} onGenerate={generate} />
        </div>
        <div className="reports__preview" aria-label="Preview">
          {report(true)}
        </div>
      </div>
      {createPortal(<div className="report-print">{report(false)}</div>, document.body)}
    </PageLayout>
  )
}
