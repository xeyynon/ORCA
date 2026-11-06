import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStatistics, getTles } from '@/api/endpoints'
import type { ConjunctionQuery } from '@/api/endpoints'
import type { ConjunctionEvent } from '@/api/types'
import type { CameraGeo } from '@/lib/coords'
import { useAsync } from '@/hooks/useAsync'
import { useCatalogUpdate } from '@/hooks/useCatalogUpdate'
import { useConjunctionSearch } from '@/hooks/useConjunctionSearch'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHashView } from '@/hooks/useHashView'
import { useHealth } from '@/hooks/useHealth'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNow } from '@/hooks/useNow'
import { useObjectSearch } from '@/hooks/useObjectSearch'
import { useTour } from '@/hooks/useTour'
import { summarizeCatalog } from '@/lib/catalog'
import { days, formatLat, formatLon, integer } from '@/lib/format'
import { formatUtc } from '@/lib/time'
import { staleBand, staleNotice } from '@/lib/staleness'
import { VIEWS, VIEW_HOTKEY, VIEW_LABEL } from '@/lib/views'
import type { ViewId } from '@/lib/views'
import { breadcrumbTrail } from '@/lib/breadcrumbs'
import { pairKey } from '@/lib/pair'
import { Brand } from '@/components/molecules/Brand/Brand'
import type { Theme } from '@/lib/theme'
import { AppBar } from '@/components/organisms/AppBar/AppBar'
import { AppMenu } from '@/components/organisms/AppMenu/AppMenu'
import { Breadcrumbs } from '@/components/organisms/Breadcrumbs/Breadcrumbs'
import { ObjectSearch } from '@/components/organisms/ObjectSearch/ObjectSearch'
import { PrimaryNav } from '@/components/organisms/PrimaryNav/PrimaryNav'
import { SkipLink } from '@/components/molecules/SkipLink/SkipLink'
import { ChunkErrorBoundary } from '@/components/organisms/ChunkErrorBoundary/ChunkErrorBoundary'
import { StaleDataBanner } from '@/components/organisms/StaleDataBanner/StaleDataBanner'
import { ShortcutsHelp } from '@/components/organisms/ShortcutsHelp/ShortcutsHelp'
import { StatusBar } from '@/components/organisms/StatusBar/StatusBar'
import { TourOverlay } from '@/components/organisms/TourOverlay/TourOverlay'
import type { StatusItem } from '@/components/organisms/StatusBar/StatusBar'
import type { FocusRequest } from '@/components/organisms/GlobeCanvas/GlobeCanvas'
import { LoadingScreen } from '@/components/views/LoadingScreen/LoadingScreen'
import { AnalyticsView } from '@/components/views/AnalyticsView/AnalyticsView'
import { ConjunctionsView } from '@/components/views/ConjunctionsView/ConjunctionsView'
import { DataView } from '@/components/views/DataView/DataView'
import { HomeView } from '@/components/views/HomeView/HomeView'
import { OverviewView } from '@/components/views/OverviewView/OverviewView'
import './Workspace.css'

const CATALOG_LIMIT = 5000

// The globe is the only user of three.js (~500 kB). Loading it on demand keeps the other views' first paint small.
const GlobeView = lazy(() => import('@/components/views/GlobeView/GlobeView').then((m) => ({ default: m.GlobeView })))

type Props = { username: string; onSignOut: () => void; theme: Theme; onToggleTheme: () => void }

/**
 * Everything behind the login. It exists only while signed in: signing out unmounts it, which drops the loaded
 * catalog, selection, search text and every polling timer, so nothing from the session lingers on screen.
 */
export function Workspace({ username, onSignOut, theme, onToggleTheme: toggleTheme }: Props) {
  const { view, go } = useHashView()
  const { status: apiStatus, health } = useHealth()
  const now = useNow()
  const searchRef = useRef<HTMLInputElement>(null)

  // Shared across views so switching views never refetches or loses the selection.
  const catalog = useAsync((signal) => getTles(CATALOG_LIMIT, { signal }), [])
  const stats = useAsync((signal) => getStatistics({ signal }), [catalog.data?.length ?? null], view === 'analytics' && catalog.data !== null)
  const update = useCatalogUpdate()

  const [selection, setSelection] = useState<string[]>([])
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [conjunction, setConjunction] = useState<ConjunctionEvent | null>(null)
  const [camera, setCamera] = useState<CameraGeo | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  // A conjunction search takes minutes, so it lives here with its form and selected row: leaving the Conjunctions view
  // (to look at the globe, say) must not abort it or drop its result. All of it goes when the workspace does (sign-out).
  const conjSearch = useConjunctionSearch()
  const [conjQuery, setConjQuery] = useState<ConjunctionQuery>({ horizonDays: 1, limit: 100 })
  const [conjKey, setConjKey] = useState<string | null>(null)
  // The week of catalog age at which the stale notice was dismissed; it returns when the data ages into a later week.
  const [staleDismissedBand, setStaleDismissedBand] = useState<number | null>(null)
  useDocumentTitle(VIEW_LABEL[view])
  const [query, setQuery] = useState('')
  const search = useObjectSearch(query, catalog.data ?? [])
  const focusNonce = useRef(0)
  // First-run tour: starts by itself once per browser; tour.start replays it (menu, Mission control).
  const tour = useTour()

  const summary = useMemo(() => (catalog.data ? summarizeCatalog(catalog.data, now) : null), [catalog.data, now])
  const stale = summary ? staleNotice(summary.medianAgeDays, summary.oldestAgeDays) : null
  const currentStaleBand = staleBand(summary?.medianAgeDays ?? null)

  // After a view change, put focus on the new content so a keyboard or screen-reader user lands in it, not on a nav tab
  // that is still there or on <body>. Not on first load (the skip link is the first Tab stop then).
  const shownView = useRef(view) // compared, not a "first run" flag: StrictMode runs effects twice on mount
  useEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [view])

  // `event` is the conjunction being shown (its dashed closest-approach line and card); a plain object pick has none.
  const showOnGlobe = useCallback((ids: string[], event?: ConjunctionEvent) => {
    setConjunction(event ?? null)
    setSelection(ids)
    if (ids[0]) setFocus({ id: ids[0], nonce: ++focusNonce.current })
    go('globe')
  }, [go])

  // Esc is the last rung of the ladder: modals and detail panes close themselves first (they prevent default).
  useKeyboardShortcuts({
    ...Object.fromEntries(VIEWS.map((v) => [VIEW_HOTKEY[v], () => go(v)])),
    t: toggleTheme,
    '?': () => setHelpOpen(true),
    '/': () => searchRef.current?.focus(),
    Escape: () => setSelection((s) => (s.length ? [] : s)),
  }, !helpOpen)

  // The trail's deepest level: the selected object (by name) or the conjunction pair on screen.
  const selectedName = selection[0] ? (catalog.data?.find((t) => t.norad_cat_id === selection[0])?.object_name ?? selection[0]) : null
  const pairOnScreen = view === 'globe' ? conjunction : view === 'conjunctions' ? (conjSearch.events.find((e) => pairKey(e) === conjKey) ?? null) : null
  const trail = breadcrumbTrail({ view, objectName: selectedName, pairLabel: pairOnScreen ? `${pairOnScreen.sat1_name} × ${pairOnScreen.sat2_name}` : null })
  const onCrumb = (target: ViewId, clearSelection: boolean) => {
    if (clearSelection) {
      if (target === 'conjunctions') setConjKey(null)
      else if (target === 'globe' && conjunction) setConjunction(null)
      else setSelection([])
    }
    go(target)
  }

  const status: StatusItem[] = [
    { label: 'API', value: apiStatus === 'online' ? 'online' : apiStatus === 'offline' ? 'unreachable' : 'checking', tone: apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'bad' : 'warn', dotOnly: apiStatus === 'online' },
    { label: 'Objects', value: health ? integer(health.database.tles_count) : null },
    { label: 'Oldest TLE', value: summary?.oldestAgeDays != null ? days(summary.oldestAgeDays) : null, title: 'Age of the oldest element set in the catalog' },
    { label: 'Last API refresh', value: health?.database.last_update ? formatUtc(health.database.last_update) : null, title: 'When the API last stored a Celestrak fetch' },
    ...(view === 'globe' ? [
      { label: 'Camera lat', value: camera ? formatLat(camera.latDeg) : null },
      { label: 'Lon', value: camera ? formatLon(camera.lonDeg) : null },
      { label: 'Alt', value: camera ? `${integer(camera.altKm)} km` : null },
    ] : []),
    ...(conjSearch.phase === 'running' ? [{ label: 'Search', value: 'running', tone: 'warn' as const, title: 'A conjunction search is running. It continues while you look at other views.' }]
      : conjSearch.phase === 'done' && conjSearch.source === 'live' && view !== 'conjunctions' ? [{ label: 'Search', value: 'result ready', tone: 'ok' as const, title: 'A conjunction search result is waiting on the Conjunctions view.' }] : []),
    { label: 'UTC', value: formatUtc(now.toISOString()).replace(' UTC', '') },
  ]

  return (
    <div className="app">
      <SkipLink targetId="main-content">Skip to content</SkipLink>
      <AppBar
        left={<><Brand href="#/home" onNavigate={() => go('home')} /><ObjectSearch inputRef={searchRef} query={query} onQueryChange={setQuery} results={search.results} loading={search.loading} degraded={search.degraded} onPick={(id) => showOnGlobe([id])} /></>}
        center={<PrimaryNav view={view} onChange={go} />}
        right={<AppMenu username={username} theme={theme} onToggleTheme={toggleTheme} onShowShortcuts={() => setHelpOpen(true)} onStartTour={tour.start} onSignOut={onSignOut} />}
      />

      <Breadcrumbs trail={trail} onNavigate={onCrumb} />

      {/* Not on Conjunctions: its result carries the same fact as one of its caveats, and one home per fact. Not on Globe/Data: the canvas stays clear, and Data explains it. */}
      {stale && staleDismissedBand !== currentStaleBand && (view === 'overview' || view === 'analytics') ? (
        <StaleDataBanner notice={stale} onGoData={() => go('data')} onDismiss={() => setStaleDismissedBand(currentStaleBand)} />
      ) : null}

      {view === 'home' ? <HomeView catalog={catalog} summary={summary} health={health} apiStatus={apiStatus} conjSearch={conjSearch} onConjQueryChange={setConjQuery} onGo={go} onStartTour={tour.start} /> : null}
      {view === 'overview' ? (
        <OverviewView
          catalog={catalog}
          summary={summary}
          totalCount={health?.database.tles_count ?? null}
          selectedId={selection[0] ?? null}
          onSelect={(id) => setSelection(id ? [id] : [])}
          onOpenGlobe={(id) => showOnGlobe([id])}
          onGoData={() => go('data')}
          now={now}
        />
      ) : null}
      {view === 'globe' ? (
        <ChunkErrorBoundary>
        <Suspense fallback={<LoadingScreen fill="area" message="Loading the globe" />}>
        <GlobeView
          catalog={catalog.data}
          totalCount={health?.database.tles_count ?? catalog.data?.length ?? null}
          selection={selection}
          focus={focus}
          conjunction={conjunction}
          theme={theme}
          now={now}
          onSelect={setSelection}
          onCamera={setCamera}
          onClearConjunction={() => setConjunction(null)}
          onViewConjunctions={() => go('conjunctions')}
        />
        </Suspense>
        </ChunkErrorBoundary>
      ) : null}
      {view === 'conjunctions' ? (
        <ConjunctionsView
          now={now}
          catalogSize={health?.database.tles_count ?? catalog.data?.length ?? null}
          search={conjSearch}
          query={conjQuery}
          onQueryChange={setConjQuery}
          selectedKey={conjKey}
          onSelectKey={setConjKey}
          medianTleAgeDays={summary?.medianAgeDays ?? null}
          onShowOnGlobe={showOnGlobe}
        />
      ) : null}
      {view === 'analytics' ? <AnalyticsView catalog={catalog} stats={stats} totalCount={health?.database.tles_count ?? null} now={now} /> : null}
      {view === 'data' ? <DataView health={health} apiStatus={apiStatus} summary={summary} update={update} /> : null}

      <StatusBar items={status} />
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}
      {tour.view ? <TourOverlay {...tour.view} /> : null}
    </div>
  )
}
