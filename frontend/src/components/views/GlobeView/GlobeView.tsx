import { useMemo, useRef, useState } from 'react'
import type { ConjunctionEvent, ObjectType, TleRecord } from '@/api/types'
import type { Snapshot } from '@/globe/EarthScene'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useGlobePrefs } from '@/hooks/useGlobePrefs'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useOrbitPaths } from '@/hooks/useOrbitPaths'
import { usePlayback } from '@/hooks/usePlayback'
import { usePositions } from '@/hooks/usePositions'
import { useTleById } from '@/hooks/useTleById'
import { countBy } from '@/lib/countBy'
import { EARTH_RADIUS_KM } from '@/lib/coords'
import type { CameraGeo, Vec3 } from '@/lib/coords'
import { filterObjects } from '@/lib/globePrefs'
import { ALTITUDE_BANDS, altitudeBand } from '@/lib/orbit'
import { offsetForTca } from '@/lib/playback'
import { riskTone } from '@/lib/risk'
import { parseUtc } from '@/lib/time'
import type { Theme } from '@/lib/theme'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { CatalogSummaryCard } from '../../organisms/CatalogSummaryCard/CatalogSummaryCard'
import { ConjunctionCard } from '../../organisms/ConjunctionCard/ConjunctionCard'
import { FiltersCard } from '../../organisms/FiltersCard/FiltersCard'
import { GlobeCanvas } from '../../organisms/GlobeCanvas/GlobeCanvas'
import type { FocusRequest } from '../../organisms/GlobeCanvas/GlobeCanvas'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { PlaybackBar } from '../../organisms/PlaybackBar/PlaybackBar'
import { ViewOptionsCard } from '../../organisms/ViewOptionsCard/ViewOptionsCard'
import './GlobeView.css'

/** The server caps one request at this many objects (selected ids are always added on top). */
const POSITION_LIMIT = 20000
const HOUR_MS = 3_600_000
const NO_PATHS: ReadonlyMap<string, Vec3[]> = new Map()

type Props = {
  catalog: readonly TleRecord[] | null
  totalCount: number | null
  selection: readonly string[]
  focus: FocusRequest | null
  conjunction: ConjunctionEvent | null
  theme: Theme
  now: Date
  onSelect: (ids: string[]) => void
  /** The point below the camera and its height; shown in the status bar. */
  onCamera: (geo: CameraGeo) => void
  onClearConjunction: () => void
  onViewConjunctions: () => void
}

/** Three panels: what is in the catalog and how to filter it; the globe with its playback bar; what is selected. */
export function GlobeView({ catalog, totalCount, selection, focus, conjunction, theme, now, onSelect, onCamera, onClearConjunction, onViewConjunctions }: Props) {
  const [prefs, setPrefs] = useGlobePrefs()
  const playback = usePlayback()
  const [autoRotate, setAutoRotate] = useState(true)
  const [resetNonce, setResetNonce] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const toggleFullscreen = useFullscreen(stageRef)

  useKeyboardShortcuts({ ' ': () => setAutoRotate((v) => !v) })

  const summary = useCatalogSummary(totalCount)
  // Selected ids are always requested, so a selected object is drawn even beyond the request cap.
  const positions = usePositions(POSITION_LIMIT, playback.snapOffset, selection)
  const { paths, failed } = useOrbitPaths(selection, playback.snapOffset)

  const activeConj = conjunction && prefs.showConjunction ? conjunction : null
  const conjIds = useMemo(() => new Set(activeConj ? [activeConj.sat1_id, activeConj.sat2_id] : []), [activeConj])
  const keepIds = useMemo(() => new Set(selection), [selection])

  const loaded = positions.data?.objects
  const drawn = useMemo(() => (loaded ? filterObjects(loaded, prefs, keepIds, conjIds) : []), [loaded, prefs, keepIds, conjIds])

  // Linear extrapolation runs from when this snapshot arrived. Live moves in real time, a scrubbed time is frozen, playback runs at its speed.
  const rate = playback.playing ? playback.speed : playback.snapOffset === 0 ? 1 : 0
  const snapshot: Snapshot | null = useMemo(() => {
    const d = positions.data
    if (!d) return null
    return {
      objects: drawn.map((o) => ({ id: o.id, name: o.name, type: o.type as ObjectType, r: o.r, v: o.v })),
      epochMs: parseUtc(d.at).getTime(),
      gmstRad: d.gmst_rad,
      wallMs: Date.now(),
      rate,
    }
    // `rate` is read when the snapshot is built; a rate change alone must not restart the extrapolation clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.data, drawn])

  const altitudes = (xs: readonly { r: readonly [number, number, number] }[]) => xs.map((o) => Math.hypot(o.r[0], o.r[1], o.r[2]) - EARTH_RADIUS_KM)
  const bandCounts = useMemo(() => countBy(altitudes(loaded ?? []), ALTITUDE_BANDS, altitudeBand), [loaded])

  const byId = useMemo(() => new Map(catalog?.map((t) => [t.norad_cat_id, t]) ?? []), [catalog])
  const posById = useMemo(() => new Map(loaded?.map((o) => [o.id, o]) ?? []), [loaded])
  const nameOf = (id: string) => posById.get(id)?.name ?? byId.get(id)?.object_name ?? id

  const primary = useTleById(selection[0] ?? null, byId)
  const notDrawn = selection.filter((id) => positions.data && !posById.has(id))

  const overlay = useMemo(
    () => (activeConj ? { a: activeConj.sat1_id, b: activeConj.sat2_id, color: `var(--risk-${riskTone(activeConj.risk_level)})` } : null),
    [activeConj],
  )
  const labels = useMemo(
    () => (prefs.labelSelected || activeConj ? selection.map((id) => ({ id, text: posById.get(id)?.name ?? byId.get(id)?.object_name ?? id })) : []),
    [prefs.labelSelected, activeConj, selection, posById, byId],
  )
  const shownPaths = prefs.showOrbits ? paths : NO_PATHS

  const nowMs = now.getTime()
  const tca = conjunction ? offsetForTca(parseUtc(conjunction.tca).getTime(), nowMs) : null
  const tcaOffsetH = tca && 'offsetH' in tca ? tca.offsetH : null
  const simMs = nowMs + playback.offsetH * HOUR_MS

  return (
    <div className="globe-view">
      <aside className="globe-view__side globe-view__side--left" aria-label="Catalog and filters">
        <CatalogSummaryCard summary={summary.data} error={summary.status === 'error' ? summary.error.message : null} onRetry={summary.reload} />
        <ViewOptionsCard prefs={prefs} onChange={setPrefs} conjunctionActive={conjunction !== null} />
        <FiltersCard prefs={prefs} onChange={setPrefs} summary={summary.data} bandCounts={bandCounts} conjunctionActive={conjunction !== null} />
      </aside>

      <div className="globe-view__center">
        <div className="globe-view__stage" ref={stageRef}>
          <GlobeCanvas
            snapshot={snapshot}
            selectedIds={selection}
            orbitPaths={shownPaths}
            autoRotate={autoRotate}
            theme={theme}
            focus={focus}
            colorMode={prefs.colorBy}
            conjunction={overlay}
            labels={labels}
            resetNonce={resetNonce}
            nameOf={nameOf}
            onPick={(id) => onSelect(id ? [id] : [])}
            onCamera={onCamera}
          />
        </div>
        <div className="globe-view__bar">
          <PlaybackBar
            offsetH={playback.offsetH}
            playing={playback.playing}
            speed={playback.speed}
            simMs={simMs}
            tcaOffsetH={tcaOffsetH}
            onToggle={playback.toggle}
            onStep={(d) => playback.step(d)}
            onSpeed={playback.setSpeed}
            onScrub={playback.scrub}
            onLive={playback.toLive}
            onResetView={() => setResetNonce((n) => n + 1)}
            onFullscreen={toggleFullscreen}
          />
        </div>
      </div>

      <aside className="globe-view__side globe-view__side--right" aria-label="Camera and selection">
        {conjunction ? (
          <ConjunctionCard
            event={conjunction}
            nowMs={nowMs}
            onJumpToTca={() => { if (tcaOffsetH !== null) playback.jumpTo(tcaOffsetH) }}
            onViewDetails={onViewConjunctions}
            onClose={onClearConjunction}
          />
        ) : null}
        {primary ? <ObjectCard tle={primary} position={posById.get(primary.norad_cat_id) ?? null} now={now} onClose={() => onSelect([])} /> : null}
        {selection.length > 1 ? <FieldNote>{selection.length} objects selected: {selection.map(nameOf).join(' and ')}.</FieldNote> : null}

        {positions.status === 'error' && !positions.data ? (
          <EmptyState kind="error" title="Could not load positions" action={<Button onClick={positions.reload}>Retry</Button>}>{positions.error.message}</EmptyState>
        ) : null}
        {positions.status === 'loading' && !positions.data ? <EmptyState kind="awaiting" title="Propagating catalog…" /> : null}
        {positions.status === 'error' && positions.data ? <FieldNote>Position refresh failed ({positions.error.message}). Showing the last good snapshot; it is extrapolated for at most two minutes.</FieldNote> : null}
        {positions.data && positions.data.objects.length === 0 ? <EmptyState kind="none" title="No positions returned">The catalog is empty or no element set could be propagated.</EmptyState> : null}
        {positions.data && positions.data.skipped > 0 ? <FieldNote>{positions.data.skipped} object(s) could not be propagated and are not drawn.</FieldNote> : null}
        {notDrawn.length > 0 ? <FieldNote>{notDrawn.map(nameOf).join(', ')} could not be drawn: it is not in the catalog, or SGP4 cannot propagate it (decayed or invalid elements).</FieldNote> : null}
        {failed.length > 0 ? <FieldNote>Orbit path unavailable for {failed.map(nameOf).join(', ')}.</FieldNote> : null}

      </aside>
    </div>
  )
}
