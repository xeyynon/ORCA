import type { ConjunctionEvent } from '@/api/types'
import { pairKey } from '@/lib/pair'
import { REPORT_SECTIONS, TOP_N_OPTIONS } from '@/lib/report'
import type { ReportOptions, ReportSectionId, TopN } from '@/lib/report'
import { Button } from '../../atoms/Button/Button'
import { Icon } from '../../atoms/Icon/Icon'
import { CheckboxRow } from '../../molecules/CheckboxRow/CheckboxRow'
import { SelectField } from '../../molecules/SelectField/SelectField'
import './ReportBuilder.css'

type Props = {
  options: ReportOptions
  onChange: (o: ReportOptions) => void
  /** The run's events, for the pair picker (worst first). */
  pairs: readonly ConjunctionEvent[]
  /** Where the run figures come from, in words. */
  source: string | null
  /** Why Generate is disabled; null when it can run. */
  blocked: string | null
  onGenerate: () => void
}

/**
 * The report's controls: which sections, how many approaches, which pair; then Generate, which opens the browser's
 * print dialog to save the preview as a PDF. Every control is a native input (keyboard and screen readers for free).
 */
export function ReportBuilder({ options, onChange, pairs, source, blocked, onGenerate }: Props) {
  const toggle = (id: ReportSectionId, on: boolean) => onChange({ ...options, sections: { ...options.sections, [id]: on } })
  return (
    <aside className="report-builder" aria-labelledby="report-builder-title">
      <h2 id="report-builder-title" className="report-builder__title">Build a report</h2>
      <fieldset className="report-builder__group">
        <legend className="report-builder__legend">Sections</legend>
        {REPORT_SECTIONS.map((s) => (
          <div key={s.id} className="report-builder__section">
            <CheckboxRow label={s.title} checked={options.sections[s.id]} onChange={(on) => toggle(s.id, on)} />
            <p className="report-builder__about">{s.about}</p>
            {s.id === 'approaches' && options.sections.approaches ? (
              <div className="report-builder__option">
                <SelectField<string>
                  label="Approaches listed"
                  value={String(options.topN)}
                  options={TOP_N_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))}
                  onChange={(v) => onChange({ ...options, topN: Number(v) as TopN })}
                />
              </div>
            ) : null}
            {s.id === 'pair' && options.sections.pair ? (
              <div className="report-builder__option">
                {pairs.length > 0 ? (
                  <SelectField<string>
                    label="Pair to analyse"
                    value={options.pairKey ?? ''}
                    options={[
                      ...(options.pairKey ? [] : [{ value: '', label: 'Choose a pair' }]),
                      ...pairs.map((e) => ({ value: pairKey(e), label: `${e.sat1_name} × ${e.sat2_name} (${e.risk_level})` })),
                    ]}
                    onChange={(v) => onChange({ ...options, pairKey: v || null })}
                  />
                ) : <p className="report-builder__about">The run's approaches are still loading.</p>}
              </div>
            ) : null}
          </div>
        ))}
      </fieldset>
      {source ? <p className="report-builder__source">{source}</p> : null}
      <div className="report-builder__actions">
        <Button variant="primary" size="lg" onClick={onGenerate} disabled={blocked !== null}>
          <Icon name="printer" /> Generate PDF
        </Button>
        <p className="report-builder__hint" role="status">
          {blocked ?? 'Opens the print dialog: choose “Save as PDF” as the destination.'}
        </p>
      </div>
    </aside>
  )
}
