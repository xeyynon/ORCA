import { useMemo, useRef, useState } from 'react'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Icon } from '../../atoms/Icon/Icon'
import { cx } from '@/lib/cx'
import type { ConjunctionEvent, ObjectType, TleRecord } from '@/api/types'
import type { Snapshot } from '@/globe/EarthScene'
import { useCatalogSummary } from '@/hooks/useCatalogSummary'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useGlobePrefs } from '@/hooks/useGlobePrefs'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useOrbitPaths } from '@/hooks/useOrbitPaths'
import { useElapsed } from '@/hooks/useElapsed'
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
import { positionsWaitNote } from '@/lib/waitNote'
import type { Theme } from '@/lib/theme'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { FieldNote } from '../../molecules/FieldNote/FieldNote'
import { BottomSheet } from '../../organisms/BottomSheet/BottomSheet'
import { CatalogSummaryCard } from '../../organisms/CatalogSummaryCard/CatalogSummaryCard'
import { ConjunctionCard } from '../../organisms/ConjunctionCard/ConjunctionCard'
import { FiltersCard } from '../../organisms/FiltersCard/FiltersCard'
import { GlobeLegend } from '../../organisms/GlobeLegend/GlobeLegend'
import { GlobeCanvas } from '../../organisms/GlobeCanvas/GlobeCanvas'
import type { FocusRequest } from '../../organisms/GlobeCanvas/GlobeCanvas'
import { ObjectCard } from '../../organisms/ObjectCard/ObjectCard'
import { PlaybackBar } from '../../organisms/PlaybackBar/PlaybackBar'
import { ViewOptionsCard } from '../../organisms/ViewOptionsCard/ViewOptionsCard'
import './GlobeView.css'

/**
 * The server caps one request at this many objects (selected ids are always added on top).
 *
 * One request, deliberately, not a small first request followed by the full one. Measured against the running API
 * (2026-11-07, gzip off): limit=500 0.27 s, 2000 0.35-0.39 s, 20000 1.5-1.7 s; through gzip and the dev proxy
 * 2.4-3.7 s. The server runs SGP4 over every object whatever `limit` is (limit only trims the JSON), and the cold
 * cache build is 0.5 s, so a small first request would not return earlier on a cold start. And the first N rows are
 * database order, not a sample: the first 2,000 hold 23% GEO-or-higher objects against 3.8% of the full set, so a
 * partial picture would misstate the catalog. The wait is therefore stated (useElapsed + positionsWaitNote).
 */
const POSITION_LIMIT = 20000
const HOUR_MS = 3_600_000
const NO_PATHS: ReadonlyMap<string, Vec3[]> = new Map()
/** Same breakpoint as GlobeView.css: below it the globe comes first and the details become a bottom sheet over it. */
const NARROW = '(max-width: 1000px)'

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
  const narrow = useMediaQuery(NARROW)

  useKeyboardShortcuts({ ' ': () => setAutoRotate((v) => !v) })

  const summary = useCatalogSummary(totalCount)
  // Selected ids are always requested, so a selected object is drawn even beyond the request cap.
  const positions = usePositions(POSITION_LIMIT, playback.snapOffset, selection)
  const waiting = positions.status === 'loading' && !positions.data
  const waitNote = positionsWaitNote(useElapsed(waiting) * 1000)
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

  // What is selected: the side panel on a wide screen, a bottom sheet over the globe's foot on a phone (above the
  // playback bar, which stays reachable). Single tap on the globe selects; the sheet handle is a button as well as a drag.
  const details = conjunction || primary || selection.length > 1 ? (
    <>
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
    </>
  ) : null
  const sheetTitle = conjunction ? `Conjunction: ${conjunction.sat1_name} × ${conjunction.sat2_name}` : primary ? primary.object_name : `${selection.length} objects selected`
  const inSheet = narrow && details !== null

  return (
    <main className="globe-view" id="main-content" tabIndex={-1} aria-label="Globe">
      <h1 className="visually-hidden">Globe</h1>
      {/* One quiet panel (owner, 2026-11-15: "too congested"); hide it to give the globe the whole width. Desktop only:
          on narrow screens the panels sit below the globe and are always there. */}
      {prefs.panelOpen ? null : (
        <div className="globe-view__show-panel">
          <Button size="sm" onClick={() => setPrefs({ panelOpen: true })}><Icon name="chevron-right" size={14} /> Panel</Button>
        </div>
      )}
      <aside className={cx('globe-view__side globe-view__side--left', !prefs.panelOpen && 'globe-view__side--hidden')} aria-label="Catalog and filters">
        <div className="globe-view__hide-panel">
          <IconButton label="Hide panel" onClick={() => setPrefs({ panelOpen: false })}><Icon name="chevron-left" size={14} /></IconButton>
        </div>
        <CatalogSummaryCard summary={summary.data} error={summary.status === 'error' ? summary.error.message : null} onRetry={summary.reload} />
        <ViewOptionsCard prefs={prefs} onChange={setPrefs} conjunctionActive={conjunction !== null} />
        <FiltersCard prefs={prefs} onChange={setPrefs} summary={summary.data} bandCounts={bandCounts} countsReady={loaded !== undefined} conjunctionActive={conjunction !== null} />
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
        <div className="globe-view__legend">
          <GlobeLegend
            colorBy={prefs.colorBy}
            shown={drawn.length}
            total={loaded ? summary.data?.total ?? null : null}
            showOrbit={prefs.showOrbits && selection.length > 0}
            hasConjunction={activeConj !== null}
            hasSelection={selection.length > 0}
            skipped={positions.data?.skipped ?? 0}
          />
        </div>
        <div className="globe-view__foot">
          {inSheet ? <div className="globe-view__sheet"><BottomSheet title={sheetTitle}>{details}</BottomSheet></div> : null}
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
      </div>

      <aside className="globe-view__side globe-view__side--right" aria-label="Camera and selection">
        {inSheet ? null : details}

        {positions.status === 'error' && !positions.data ? (
          <EmptyState kind="error" title="Could not load positions" action={<Button onClick={positions.reload}>Retry</Button>}>{positions.error.message}</EmptyState>
        ) : null}
        {waiting ? (
          <EmptyState kind="awaiting" title={waitNote.title} action={waitNote.canRetry ? <Button onClick={positions.reload}>Try again</Button> : undefined}>
            {waitNote.body}
          </EmptyState>
        ) : null}
        {positions.status === 'error' && positions.data ? <FieldNote>Position refresh failed ({positions.error.message}). Showing the last good snapshot; it is extrapolated for at most two minutes.</FieldNote> : null}
        {positions.data && positions.data.objects.length === 0 ? <EmptyState kind="none" title="No positions returned">The catalog is empty or no element set could be propagated.</EmptyState> : null}
        {notDrawn.length > 0 ? <FieldNote>{notDrawn.map(nameOf).join(', ')} could not be drawn: it is not in the catalog, or SGP4 cannot propagate it (decayed or invalid elements).</FieldNote> : null}
        {failed.length > 0 ? <FieldNote>Orbit path unavailable for {failed.map(nameOf).join(', ')}.</FieldNote> : null}

      </aside>
    </main>
  )
}
