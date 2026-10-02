import { useEffect, useMemo, useState } from 'react'
import type { TleRecord } from '@/api/types'
import type { Snapshot } from '@/globe/EarthScene'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useOrbitPaths } from '@/hooks/useOrbitPaths'
import { usePositions } from '@/hooks/usePositions'
import { parseUtc } from '@/lib/time'
import type { Theme } from '@/lib/theme'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { GlobeCanvas } from '../../organisms/GlobeCanvas/GlobeCanvas'
import type { FocusRequest } from '../../organisms/GlobeCanvas/GlobeCanvas'
import { GlobeLegend } from '../../organisms/GlobeLegend/GlobeLegend'
import { MethodNote } from '../../organisms/MethodNote/MethodNote'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { TimeScrubber } from '../../organisms/TimeScrubber/TimeScrubber'
import './GlobeView.css'

const POSITION_LIMIT = 2000
const SCRUB_DEBOUNCE_MS = 250

type Props = {
  catalog: readonly TleRecord[] | null
  totalCount: number | null
  selection: readonly string[]
  focus: FocusRequest | null
  theme: Theme
  now: Date
  oldestTleAgeDays: number | null
  onSelect: (ids: string[]) => void
}

/** Full-height globe with a solid side panel (solid, not glass: translucency over a busy canvas hurts legibility). */
export function GlobeView({ catalog, totalCount, selection, focus, theme, now, oldestTleAgeDays, onSelect }: Props) {
  const [offsetInput, setOffsetInput] = useState(0)
  const [offset, setOffset] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)

  // Debounce the slider so dragging does not fire a propagation request per step.
  useEffect(() => {
    const id = window.setTimeout(() => setOffset(offsetInput), SCRUB_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [offsetInput])

  useKeyboardShortcuts({ ' ': () => setAutoRotate((v) => !v) })

  const positions = usePositions(POSITION_LIMIT, offset)
  const { paths, failed } = useOrbitPaths(selection, offset)

  const snapshot: Snapshot | null = useMemo(() => {
    const d = positions.data
    if (!d) return null
    return {
      objects: d.objects.map((o) => ({ id: o.id, name: o.name, r: o.r, v: o.v })),
      epochMs: parseUtc(d.at).getTime(),
      gmstRad: d.gmst_rad,
      live: offset === 0,
    }
  }, [positions.data, offset])

  const byId = useMemo(() => new Map(catalog?.map((t) => [t.norad_cat_id, t]) ?? []), [catalog])
  const posById = useMemo(() => new Map(positions.data?.objects.map((o) => [o.id, o]) ?? []), [positions.data])
  const nameOf = (id: string) => posById.get(id)?.name ?? byId.get(id)?.object_name ?? id

  const primary = selection[0] ? byId.get(selection[0]) ?? null : null
  const missingFromSubset = selection.filter((id) => positions.data && !posById.has(id))

  return (
    <div className="globe-view">
      <aside className="globe-view__panel" aria-label="Globe controls">
        <TimeScrubber offsetHours={offsetInput} atIso={positions.data?.at ?? null} onChange={setOffsetInput} />
        <div className="globe-view__rule" />
        <GlobeLegend shown={positions.data?.objects.length ?? 0} total={totalCount} />
        <Button size="sm" variant="ghost" onClick={() => setAutoRotate((v) => !v)}>{autoRotate ? 'Pause rotation (Space)' : 'Resume rotation (Space)'}</Button>

        {positions.status === 'error' && !positions.data ? (
          <EmptyState kind="error" title="Could not load positions" action={<Button onClick={positions.reload}>Retry</Button>}>{positions.error.message}</EmptyState>
        ) : null}
        {positions.status === 'loading' && !positions.data ? <EmptyState kind="awaiting" title="Propagating catalog…" /> : null}
        {positions.status === 'error' && positions.data ? <FieldNote>Position refresh failed ({positions.error.message}). Showing the last good snapshot; it is extrapolated for at most two minutes.</FieldNote> : null}
        {positions.data && positions.data.objects.length === 0 ? <EmptyState kind="none" title="No positions returned">The catalog is empty or no element set could be propagated.</EmptyState> : null}
        {positions.data && positions.data.skipped > 0 ? <FieldNote>{positions.data.skipped} object(s) could not be propagated and are not drawn.</FieldNote> : null}

        {primary ? <ObjectCard tle={primary} position={posById.get(primary.norad_cat_id) ?? null} now={now} onClose={() => onSelect([])} /> : null}
        {selection.length > 1 ? <FieldNote>{selection.length} objects selected: {selection.map(nameOf).join(' and ')}.</FieldNote> : null}
        {missingFromSubset.length > 0 ? <FieldNote>{missingFromSubset.map(nameOf).join(', ')} is outside the {POSITION_LIMIT.toLocaleString('en-US')}-object position subset, so it is not drawn.</FieldNote> : null}
        {failed.length > 0 ? <FieldNote>Orbit path unavailable for {failed.map(nameOf).join(', ')}.</FieldNote> : null}

        <MethodNote propagator={positions.data?.propagator ?? null} oldestTleAgeDays={oldestTleAgeDays} />
      </aside>
      <div className="globe-view__stage">
        <GlobeCanvas
          snapshot={snapshot}
          selectedIds={selection}
          orbitPaths={paths}
          autoRotate={autoRotate}
          theme={theme}
          focus={focus}
          nameOf={nameOf}
          onPick={(id) => onSelect(id ? [id] : [])}
        />
      </div>
    </div>
  )
}
