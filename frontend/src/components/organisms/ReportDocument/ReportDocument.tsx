import type { ConjunctionEvent, ConjunctionMethod, FetchOutcome, RiskLevel } from '@/api/types'
import { days, fixed, integer, pc } from '@/lib/format'
import { fetchSummary, freshness, homeKpis, previewEvents, runName } from '@/lib/homeBoard'
import type { HookRun } from '@/lib/homeHook'
import { REGIME_NAME, sharePercent } from '@/lib/homeStory'
import { REGIMES } from '@/lib/orbit'
import type { Regime } from '@/lib/orbit'
import { pairKey } from '@/lib/pair'
import { includedSections, REPORT_MARKING, REPORT_SECTIONS, tierRows } from '@/lib/report'
import type { ReportOptions, ReportSectionId } from '@/lib/report'
import { RISK_TIER_SOURCE, riskTierLines, riskTierSentence, riskTone } from '@/lib/risk'
import { formatUtc } from '@/lib/time'
import './ReportDocument.css'

const BASE = import.meta.env.BASE_URL
const NA = 'Not available'

export interface ReportQuality {
  medianAgeDays: number | null
  newestAgeDays: number | null
  oldestAgeDays: number | null
  /** Objects the ages are measured over (the loaded subset). */
  measuredOver: number | null
  lastUpdate: string | null
  lastFetch: FetchOutcome | null
}

type Props = {
  options: ReportOptions
  generatedAt: Date
  reference: string
  preparedBy: string
  objects: number | null
  regimes: { counts: Record<Regime, number>; unclassified: number; total: number } | null
  run: HookRun | null
  tierCounts: Partial<Record<RiskLevel, number>> | null
  windowEnd: string | null
  events: readonly ConjunctionEvent[]
  quality: ReportQuality
  method: ConjunctionMethod | null
  /** On screen inside the Reports page: the title is an h2 (the page has its own h1); in print it is the h1. */
  preview?: boolean
}

/** A risk tier as a coloured dot and its word: never colour alone, and readable in black-and-white print. */
function Risk({ level }: { level: RiskLevel }) {
  return <span className="report__risk"><span className={`report__dot report__dot--${riskTone(level)}`} aria-hidden="true" />{level}</span>
}

/** Pc as everywhere else in ORCA ("2.83 × 10⁻⁵", lib/format.pc), kept on one line. */
function Pc({ v }: { v: number }) {
  return <span className="report__pc">{pc(v)}</span>
}

function Threshold({ level }: { level: RiskLevel }) {
  return <>{riskTierLines().find((t) => t.level === level)?.rule ?? ''}</>
}

/**
 * The report itself: white paper with dark ink in both themes (the --paper-* tokens), laid out for A4 and printed
 * as-is by the browser's "Save as PDF". The same component is the on-screen preview and the printed copy, so what you
 * see is what you get. Every figure is real and says where it came from; a missing one is said in words.
 */
export function ReportDocument(p: Props) {
  const [H1, H2, H3] = p.preview ? (['h2', 'h3', 'h4'] as const) : (['h1', 'h2', 'h3'] as const)
  const ids = includedSections(p.options)
  const numberOf = (id: ReportSectionId) => ids.indexOf(id) + 1
  const titleOf = (id: ReportSectionId) => REPORT_SECTIONS.find((s) => s.id === id)?.title ?? id
  const pair = p.options.pairKey ? p.events.find((e) => pairKey(e) === p.options.pairKey) ?? null : null
  const runLine = p.run
    ? `In ${runName(p.run)}, ${integer(p.run.totalEvents)} pairs of objects came within ${p.run.reportKm} km of each other over a period of ${p.run.horizonDays === 1 ? '1 day' : `${p.run.horizonDays} days`}, ${p.windowEnd ? `between ${formatUtc(p.run.windowStart)} and ${formatUtc(p.windowEnd)}` : `starting at ${formatUtc(p.run.windowStart)}`}.`
    : null

  return (
    <article className="report" aria-label="Report preview">
      {/* The handling marking, as formal reports carry one: centred capitals, first thing on the page. In print it
          repeats at the top of every page (ReportsView.css, @page), so no page of the PDF can travel without it. */}
      <p className="report__marking">{REPORT_MARKING}</p>
      <header className="report__header">
        <div className="report__brand">
          <img className="report__logo" src={`${BASE}logo-320-light.png`} alt="ORCA" />
          <span className="report__kind">Space Situational Awareness Report</span>
        </div>
        <H1 className="report__title">{ids.length === 1 ? titleOf(ids[0]) : 'Orbital Situation Report'}</H1>
        <dl className="report__meta">
          <div><dt>Reference</dt><dd>{p.reference}</dd></div>
          <div><dt>Date Generated</dt><dd>{formatUtc(p.generatedAt.toISOString())}</dd></div>
          <div><dt>Prepared By</dt><dd>{p.preparedBy}</dd></div>
          <div><dt>Snapshot of Data</dt><dd>{p.quality.lastUpdate ? formatUtc(p.quality.lastUpdate) : 'Has not been refreshed through the API'}</dd></div>
        </dl>
        {runLine ? <p className="report__run">{runLine}</p> : null}
        {ids.length > 1 ? (
          <ol className="report__contents" aria-label="Contents">
            {ids.map((id) => <li key={id}>{titleOf(id)}</li>)}
          </ol>
        ) : null}
      </header>

      {p.options.sections.summary ? (
        <section className="report__section">
          <H2 className="report__h">{numberOf('summary')}. {titleOf('summary')}</H2>
          <p className="report__lead">
            {p.objects !== null ? `Our tracked catalogue contains ${integer(p.objects)} objects.` : 'We were unable to obtain the size of the catalogue.'}
            {p.regimes ? (sharePercent(p.regimes.counts.LEO, p.regimes.total) ? ` Approximately ${sharePercent(p.regimes.counts.LEO, p.regimes.total)} of these objects are located in low Earth orbit.` : ' Most of these objects are located in low Earth orbit.') : ''}
          </p>
          <table className="report__table">
            <caption>Main Figures</caption>
            <thead><tr><th>Figure</th><th className="num">Value</th><th>What It Counts</th></tr></thead>
            <tbody>
              {homeKpis(p.run).map((k) => (
                <tr key={k.id}><td>{k.label}</td><td className="num">{k.value ?? NA}</td><td>{k.context}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="report__table">
            <caption>Where Objects Orbit (Entire Catalogue)</caption>
            <thead><tr><th>Orbit Regime</th><th className="num">Number of Objects</th><th className="num">Share</th></tr></thead>
            <tbody>
              {p.regimes ? (
                <>
                  {REGIMES.map((r) => (
                    <tr key={r}><td>{r} <span className="report__muted">({REGIME_NAME[r]})</span></td><td className="num">{integer(p.regimes!.counts[r] ?? 0)}</td><td className="num">{sharePercent(p.regimes!.counts[r] ?? 0, p.regimes!.total) ?? NA}</td></tr>
                  ))}
                  {p.regimes.unclassified > 0 ? <tr><td>Could Not Be Classified</td><td className="num">{integer(p.regimes.unclassified)}</td><td className="num">{sharePercent(p.regimes.unclassified, p.regimes.total)}</td></tr> : null}
                </>
              ) : <tr><td colSpan={3}>{NA}: we were unable to load the catalogue summary.</td></tr>}
            </tbody>
          </table>
        </section>
      ) : null}

      {p.options.sections.approaches ? (
        <section className="report__section">
          <H2 className="report__h">{numberOf('approaches')}. {titleOf('approaches')}</H2>
          {p.run && p.tierCounts ? (
            <>
              <p className="report__lead">
                In {runName(p.run)}, {integer(p.run.totalEvents)} pairs of objects came within {p.run.reportKm} km of each other. The breakdown by risk tier is as follows:
              </p>
              <table className="report__table report__table--tiers">
                <caption>Approaches by Risk Tier (Entire Run)</caption>
                <thead><tr>{tierRows(p.tierCounts).map((t) => <th key={t.level}><Risk level={t.level} /></th>)}</tr></thead>
                <tbody><tr>{tierRows(p.tierCounts).map((t) => <td key={t.level} className="num">{integer(t.count)}</td>)}</tr></tbody>
              </table>
              <table className="report__table">
                <caption>The {Math.min(p.options.topN, p.events.length)} Worst Approaches (Sorted by Risk Tier, then by Pc)</caption>
                <thead><tr><th className="num">#</th><th>Object Pair (NORAD IDs)</th><th>TCA (UTC)</th><th className="num">Miss Distance</th><th className="num">Pc</th><th>Risk</th></tr></thead>
                <tbody>
                  {previewEvents(p.events, p.options.topN).map((e, i) => (
                    <tr key={pairKey(e)}>
                      <td className="num">{i + 1}</td>
                      <td>{e.sat1_name} <span className="report__muted">({e.sat1_id})</span> × {e.sat2_name} <span className="report__muted">({e.sat2_id})</span></td>
                      <td className="mono">{formatUtc(e.tca).replace(' UTC', '')}</td>
                      <td className="num">{fixed(e.min_distance_km, 3)} km</td>
                      <td className="num"><Pc v={e.probability_of_collision} /></td>
                      <td><Risk level={e.risk_level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="report__note">A run only returns the {integer(p.events.length)} most probable approaches, so the tier counts include more pairs than the table lists. Pc is used to rank pairs. It is NOT a forecast.</p>
            </>
          ) : <p className="report__lead">{NA}: the close approach run did not load.</p>}
        </section>
      ) : null}

      {p.options.sections.pair ? (
        <section className="report__section">
          <H2 className="report__h">{numberOf('pair')}. {titleOf('pair')}</H2>
          {pair ? (
            <>
              <H3 className="report__pair">{pair.sat1_name} × {pair.sat2_name}</H3>
              <p className="report__lead">
                {pair.sat1_name} (NORAD {pair.sat1_id}) and {pair.sat2_name} (NORAD {pair.sat2_id}) are predicted to pass {fixed(pair.min_distance_km, 3)} km from each other at {formatUtc(pair.tca)}, moving at {fixed(pair.relative_velocity_kms, 2)} km/sec relative to one another.
                {' '}Their estimated probability of collision is <Pc v={pair.probability_of_collision} />, which ORCA rates as {pair.risk_level}.
                {' '}This estimate is based upon an assumed position uncertainty of {fixed(pair.uncertainty_km, 2)} km (1 sigma) and uses orbital data that is up to {fixed(pair.tle_age_days, 1)} days old. Because of this, it should only be used as a rough guide.
              </p>
              <table className="report__table report__table--facts">
                <caption>Assessment</caption>
                <tbody>
                  <tr><th scope="row">Time of Closest Approach (TCA)</th><td className="mono">{formatUtc(pair.tca)}</td></tr>
                  <tr><th scope="row">Miss Distance</th><td>{fixed(pair.min_distance_km, 3)} km</td></tr>
                  <tr><th scope="row">Probability of Collision (Pc)</th><td><Pc v={pair.probability_of_collision} /></td></tr>
                  <tr><th scope="row">Risk Tier</th><td><Risk level={pair.risk_level} /> <span className="report__muted">(<Threshold level={pair.risk_level} />)</span></td></tr>
                  <tr><th scope="row">Relative Velocity</th><td>{fixed(pair.relative_velocity_kms, 3)} km/s</td></tr>
                  <tr><th scope="row">Position Uncertainty (1 sigma)</th><td>{fixed(pair.uncertainty_km, 2)} km</td></tr>
                  <tr><th scope="row">Age of the Older TLE at TCA</th><td>{fixed(pair.tle_age_days, 1)} days</td></tr>
                  <tr><th scope="row">Long Encounter</th><td>{pair.long_encounter ? 'Yes. These objects move slowly relative to one another, so the 2-D probability may be several times lower than actual.' : 'No'}</td></tr>
                </tbody>
              </table>
            </>
          ) : <p className="report__lead">No pair was selected.</p>}
        </section>
      ) : null}

      {p.options.sections.quality ? (
        <section className="report__section">
          <H2 className="report__h">{numberOf('quality')}. {titleOf('quality')}</H2>
          <table className="report__table report__table--facts">
            <caption>Quality of Data</caption>
            <tbody>
              <tr>
                <th scope="row">Median TLE Age</th>
                <td>{p.quality.medianAgeDays !== null ? <>{days(p.quality.medianAgeDays)}: {freshness(p.quality.medianAgeDays).word}. <span className="report__muted">{freshness(p.quality.medianAgeDays).explain}</span></> : NA}</td>
              </tr>
              <tr><th scope="row">Newest Orbital Data</th><td>{p.quality.newestAgeDays !== null ? days(p.quality.newestAgeDays) : NA}</td></tr>
              <tr><th scope="row">Oldest Orbital Data</th><td>{p.quality.oldestAgeDays !== null ? days(p.quality.oldestAgeDays) : NA}</td></tr>
              <tr><th scope="row">Number of Objects Measured</th><td>{p.quality.measuredOver !== null ? `${integer(p.quality.measuredOver)} loaded objects` : NA}</td></tr>
              <tr><th scope="row">Last Successful Refresh</th><td>{p.quality.lastUpdate ? formatUtc(p.quality.lastUpdate) : 'Has never been refreshed through the API'} <span className="report__muted">(this is when the data was retrieved, NOT how old the data is)</span></td></tr>
              <tr><th scope="row">Last Celestrak Fetch</th><td>{fetchSummary(p.quality.lastFetch).text}{p.quality.lastFetch?.at ? `, ${formatUtc(p.quality.lastFetch.at)}` : ''}</td></tr>
              <tr><th scope="row">Source</th><td>Celestrak, public two-line element sets (TLEs)</td></tr>
            </tbody>
          </table>
          {p.method ? (
            <>
              <table className="report__table report__table--facts">
                <caption>Methodology</caption>
                <tbody>
                  <tr><th scope="row">Propagation</th><td>{p.method.propagator}</td></tr>
                  <tr><th scope="row">Screening</th><td>{p.method.screening}</td></tr>
                  <tr><th scope="row">Closest Approach</th><td>{p.method.closest_approach}</td></tr>
                  <tr><th scope="row">Probability of Collision</th><td>{p.method.collision_probability}</td></tr>
                  <tr><th scope="row">Uncertainty in Object Position</th><td>{p.method.uncertainty}</td></tr>
                  <tr><th scope="row">Risk Categories/Tiers</th><td>{riskTierSentence()} {RISK_TIER_SOURCE}</td></tr>
                </tbody>
              </table>
              <H3 className="report__sub">Limitations</H3>
              <ul className="report__limits">{p.method.limits.map((l) => <li key={l}>{l}</li>)}</ul>
            </>
          ) : <p className="report__note">Methodology details are not available because the API did not respond.</p>}
        </section>
      ) : null}

      <footer className="report__footer">Created by ORCA · Reference {p.reference} · Generated on {formatUtc(p.generatedAt.toISOString())} · This is an educational and research tool built upon public TLEs. It is NOT intended for operational decisions.</footer>
    </article>
  )
}
