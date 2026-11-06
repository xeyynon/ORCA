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
import { RISK_THRESHOLDS, riskTone } from '@/lib/risk'
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
}

/** A risk tier as a coloured dot and its word: never colour alone, and readable in black-and-white print. */
function Risk({ level }: { level: RiskLevel }) {
  return <span className="report__risk"><span className={`report__dot report__dot--${riskTone(level)}`} aria-hidden="true" />{level}</span>
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Pc typeset for paper: "2.83 × 10" with the exponent as a superscript and a true minus sign, not "10^-5". */
function Pc({ v }: { v: number }) {
  const s = pc(v)
  const m = /^(.*) × 10\^(-?\d+)$/.exec(s)
  return m ? <span className="report__pc">{m[1]} × 10<sup>{m[2].replace('-', '−')}</sup></span> : <>{s}</>
}

function Threshold({ level }: { level: RiskLevel }) {
  const t = RISK_THRESHOLDS.find((x) => x.level === level)
  return t?.minPc != null ? <>Pc of <Pc v={t.minPc} /> or more</> : <>Pc below every other tier</>
}

/**
 * The report itself: white paper with dark ink in both themes (the --paper-* tokens), laid out for A4 and printed
 * as-is by the browser's "Save as PDF". The same component is the on-screen preview and the printed copy, so what you
 * see is what you get. Every figure is real and says where it came from; a missing one is said in words.
 */
export function ReportDocument(p: Props) {
  const ids = includedSections(p.options)
  const numberOf = (id: ReportSectionId) => ids.indexOf(id) + 1
  const titleOf = (id: ReportSectionId) => REPORT_SECTIONS.find((s) => s.id === id)?.title ?? id
  const pair = p.options.pairKey ? p.events.find((e) => pairKey(e) === p.options.pairKey) ?? null : null
  const runLine = p.run
    ? `${capitalise(runName(p.run))}: ${integer(p.run.totalEvents)} pairs within ${p.run.reportKm} km over ${p.run.horizonDays === 1 ? '1 day' : `${p.run.horizonDays} days`}, from ${formatUtc(p.run.windowStart)}${p.windowEnd ? ` to ${formatUtc(p.windowEnd)}` : ''}.`
    : null

  return (
    <article className="report" aria-label="Report preview">
      {/* The handling marking, as formal reports carry one: centred capitals, first thing on the page. In print it
          repeats at the top of every page (ReportsView.css, @page), so no page of the PDF can travel without it. */}
      <p className="report__marking">{REPORT_MARKING}</p>
      <header className="report__header">
        <div className="report__brand">
          <img className="report__logo" src={`${BASE}logo-320-light.png`} alt="ORCA" />
          <span className="report__kind">Space situational awareness report</span>
        </div>
        <h1 className="report__title">{ids.length === 1 ? titleOf(ids[0]) : 'Orbital situation report'}</h1>
        <dl className="report__meta">
          <div><dt>Reference</dt><dd>{p.reference}</dd></div>
          <div><dt>Generated</dt><dd>{formatUtc(p.generatedAt.toISOString())}</dd></div>
          <div><dt>Prepared by</dt><dd>{p.preparedBy}</dd></div>
          <div><dt>Data snapshot</dt><dd>{p.quality.lastUpdate ? formatUtc(p.quality.lastUpdate) : 'Not refreshed through the API'}</dd></div>
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
          <h2>{numberOf('summary')}. Situation summary</h2>
          <p className="report__lead">
            {p.objects !== null ? `${integer(p.objects)} objects are in the tracked catalogue.` : 'The catalogue size is not available.'}
            {p.regimes ? ` ${sharePercent(p.regimes.counts.LEO, p.regimes.total) ?? 'Most'} of them are in low Earth orbit.` : ''}
          </p>
          <table className="report__table">
            <caption>Headline figures</caption>
            <thead><tr><th>Figure</th><th className="num">Value</th><th>What it counts</th></tr></thead>
            <tbody>
              {homeKpis(p.objects, p.run).map((k) => (
                <tr key={k.id}><td>{k.label}</td><td className="num">{k.value ?? NA}</td><td>{k.context}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="report__table">
            <caption>Where objects orbit (whole catalogue)</caption>
            <thead><tr><th>Regime</th><th className="num">Objects</th><th className="num">Share</th></tr></thead>
            <tbody>
              {p.regimes ? (
                <>
                  {REGIMES.map((r) => (
                    <tr key={r}><td>{r} <span className="report__muted">({REGIME_NAME[r]})</span></td><td className="num">{integer(p.regimes!.counts[r] ?? 0)}</td><td className="num">{sharePercent(p.regimes!.counts[r] ?? 0, p.regimes!.total) ?? NA}</td></tr>
                  ))}
                  {p.regimes.unclassified > 0 ? <tr><td>Not classified</td><td className="num">{integer(p.regimes.unclassified)}</td><td className="num">{sharePercent(p.regimes.unclassified, p.regimes.total)}</td></tr> : null}
                </>
              ) : <tr><td colSpan={3}>{NA}: the catalogue summary could not be loaded.</td></tr>}
            </tbody>
          </table>
        </section>
      ) : null}

      {p.options.sections.approaches ? (
        <section className="report__section">
          <h2>{numberOf('approaches')}. Close approaches</h2>
          {p.run && p.tierCounts ? (
            <>
              <p className="report__lead">
                {integer(p.run.totalEvents)} pairs came within {p.run.reportKm} km in {runName(p.run)}. By risk tier:
              </p>
              <table className="report__table report__table--tiers">
                <caption>Approaches by risk tier (whole run)</caption>
                <thead><tr>{tierRows(p.tierCounts).map((t) => <th key={t.level}><Risk level={t.level} /></th>)}</tr></thead>
                <tbody><tr>{tierRows(p.tierCounts).map((t) => <td key={t.level} className="num">{integer(t.count)}</td>)}</tr></tbody>
              </table>
              <table className="report__table">
                <caption>The {Math.min(p.options.topN, p.events.length)} worst approaches (risk tier, then Pc)</caption>
                <thead><tr><th className="num">#</th><th>Object pair (NORAD ids)</th><th>TCA (UTC)</th><th className="num">Miss distance</th><th className="num">Pc</th><th>Risk</th></tr></thead>
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
              <p className="report__note">Only the {integer(p.events.length)} most probable approaches are returned by a run, so tier counts cover more pairs than the table lists. Pc ranks pairs; it is not a forecast.</p>
            </>
          ) : <p className="report__lead">{NA}: the close-approach run did not load.</p>}
        </section>
      ) : null}

      {p.options.sections.pair ? (
        <section className="report__section">
          <h2>{numberOf('pair')}. Single pair analysis</h2>
          {pair ? (
            <>
              <h3 className="report__pair">{pair.sat1_name} × {pair.sat2_name}</h3>
              <p className="report__lead">
                At {formatUtc(pair.tca)}, {pair.sat1_name} (NORAD {pair.sat1_id}) and {pair.sat2_name} (NORAD {pair.sat2_id}) are predicted to pass {fixed(pair.min_distance_km, 3)} km apart at {fixed(pair.relative_velocity_kms, 2)} km/s.
                {' '}The estimated probability of collision is <Pc v={pair.probability_of_collision} />, which ORCA rates {pair.risk_level}.
                {' '}The estimate assumes a position uncertainty of {fixed(pair.uncertainty_km, 2)} km (1 sigma) and uses element sets up to {fixed(pair.tle_age_days, 1)} days old, so it is indicative only.
              </p>
              <table className="report__table report__table--facts">
                <caption>Assessment</caption>
                <tbody>
                  <tr><th scope="row">Time of closest approach (TCA)</th><td className="mono">{formatUtc(pair.tca)}</td></tr>
                  <tr><th scope="row">Miss distance</th><td>{fixed(pair.min_distance_km, 3)} km</td></tr>
                  <tr><th scope="row">Probability of collision (Pc)</th><td><Pc v={pair.probability_of_collision} /></td></tr>
                  <tr><th scope="row">Risk tier</th><td><Risk level={pair.risk_level} /> <span className="report__muted">(<Threshold level={pair.risk_level} />)</span></td></tr>
                  <tr><th scope="row">Relative velocity</th><td>{fixed(pair.relative_velocity_kms, 3)} km/s</td></tr>
                  <tr><th scope="row">Position uncertainty (1 sigma)</th><td>{fixed(pair.uncertainty_km, 2)} km</td></tr>
                  <tr><th scope="row">Age of the older TLE at TCA</th><td>{fixed(pair.tle_age_days, 1)} days</td></tr>
                  <tr><th scope="row">Long encounter</th><td>{pair.long_encounter ? 'Yes: the objects move slowly relative to each other, so the 2D probability can be several times too low.' : 'No'}</td></tr>
                </tbody>
              </table>
            </>
          ) : <p className="report__lead">No pair chosen.</p>}
        </section>
      ) : null}

      {p.options.sections.quality ? (
        <section className="report__section">
          <h2>{numberOf('quality')}. Data quality and method</h2>
          <table className="report__table report__table--facts">
            <caption>Data quality</caption>
            <tbody>
              <tr>
                <th scope="row">Median TLE age</th>
                <td>{p.quality.medianAgeDays !== null ? <>{days(p.quality.medianAgeDays)}: {freshness(p.quality.medianAgeDays).word}. <span className="report__muted">{freshness(p.quality.medianAgeDays).explain}</span></> : NA}</td>
              </tr>
              <tr><th scope="row">Newest element set</th><td>{p.quality.newestAgeDays !== null ? days(p.quality.newestAgeDays) : NA}</td></tr>
              <tr><th scope="row">Oldest element set</th><td>{p.quality.oldestAgeDays !== null ? days(p.quality.oldestAgeDays) : NA}</td></tr>
              <tr><th scope="row">Ages measured over</th><td>{p.quality.measuredOver !== null ? `${integer(p.quality.measuredOver)} loaded objects` : NA}</td></tr>
              <tr><th scope="row">Last successful refresh</th><td>{p.quality.lastUpdate ? formatUtc(p.quality.lastUpdate) : 'Never through the API'} <span className="report__muted">(when the data was fetched, not how old it is)</span></td></tr>
              <tr><th scope="row">Last fetch from the source</th><td>{fetchSummary(p.quality.lastFetch).text}{p.quality.lastFetch?.at ? `, ${formatUtc(p.quality.lastFetch.at)}` : ''}</td></tr>
              <tr><th scope="row">Source</th><td>Celestrak, public two-line element sets (TLEs)</td></tr>
            </tbody>
          </table>
          {p.method ? (
            <>
              <table className="report__table report__table--facts">
                <caption>Method</caption>
                <tbody>
                  <tr><th scope="row">Propagation</th><td>{p.method.propagator}</td></tr>
                  <tr><th scope="row">Screening</th><td>{p.method.screening}</td></tr>
                  <tr><th scope="row">Closest approach</th><td>{p.method.closest_approach}</td></tr>
                  <tr><th scope="row">Probability of collision</th><td>{p.method.collision_probability}</td></tr>
                  <tr><th scope="row">Uncertainty</th><td>{p.method.uncertainty}</td></tr>
                  <tr><th scope="row">Risk tiers</th><td>{p.method.risk_tiers}</td></tr>
                </tbody>
              </table>
              <h3 className="report__sub">Limits</h3>
              <ul className="report__limits">{p.method.limits.map((l) => <li key={l}>{l}</li>)}</ul>
            </>
          ) : <p className="report__note">Method details: {NA.toLowerCase()} (the API did not answer).</p>}
        </section>
      ) : null}

      <footer className="report__footer">ORCA · {p.reference} · Generated {formatUtc(p.generatedAt.toISOString())} · Educational and research tool built on public TLEs. Not for operational decisions.</footer>
    </article>
  )
}
