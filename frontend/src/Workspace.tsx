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
import { useAskOrca } from '@/hooks/useAskOrca'
import { loadSavedRun, SAVED_RUN_QUERY } from '@/api/savedRun'
import { AskOrcaPanel } from '@/components/organisms/AskOrcaPanel/AskOrcaPanel'
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
import { AskButton } from '@/components/molecules/AskButton/AskButton'
import { AppMenu } from '@/components/organisms/AppMenu/AppMenu'
import { Breadcrumbs } from '@/components/organisms/Breadcrumbs/Breadcrumbs'
import { ObjectSearch } from '@/components/organisms/ObjectSearch/ObjectSearch'
import { SearchPopover } from '@/components/organisms/SearchPopover/SearchPopover'
import { buildNotices } from '@/lib/notices'
import { useSearchChord } from '@/hooks/useSearchChord'
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
import { ReportsView } from '@/components/views/ReportsView/ReportsView'
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

  // Ask ORCA: a docked panel, not a modal. Its actions call the same functions as the rest of the app.
  // Search is an icon that expands into a floating field (it no longer sits in the bar): "/", Ctrl/Cmd+K or the icon.
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => { setSearchOpen(false); setQuery('') }, [])
  useSearchChord(() => setSearchOpen(true))
  const [askOpen, setAskOpen] = useState(false)
  const askInputRef = useRef<HTMLInputElement>(null)
  const askButtonRef = useRef<HTMLSpanElement>(null) // wraps the Ask ORCA button: focus returns there when the panel closes
  const closeAsk = useCallback(() => { setAskOpen(false); askButtonRef.current?.querySelector('button')?.focus() }, [])
  const ask = useAskOrca({
    open: askOpen, view, theme, health, summary, loaded: catalog.data ?? [], conjSearch, inputRef: askInputRef,
    handlers: {
      go,
      showObject: (id) => showOnGlobe([id]),
      runSearch: (horizonDays) => { const q = { ...conjQuery, horizonDays }; setConjQuery(q); conjSearch.run(q); go('conjunctions') },
      openSavedExample: () => loadSavedRun().then((res) => { const ok = conjSearch.loadSaved(res, SAVED_RUN_QUERY); if (ok) setConjQuery(SAVED_RUN_QUERY); go('conjunctions'); return ok }),
      setTheme: (t) => { if (t !== theme) toggleTheme() },
      startTour: () => { closeAsk(); tour.start() },
      showShortcuts: () => setHelpOpen(true),
    },
  })

  // Esc is the last rung of the ladder: modals and detail panes close themselves first (they prevent default).
  useKeyboardShortcuts({
    ...Object.fromEntries(VIEWS.map((v) => [VIEW_HOTKEY[v], () => go(v)])),
    t: toggleTheme,
    '?': () => setHelpOpen(true),
    '/': () => setSearchOpen(true),
    '.': () => { if (askOpen) askInputRef.current?.focus(); else setAskOpen(true) },
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

  // The bell lists only real, current conditions (lib/notices.ts).
  const notices = buildNotices({ apiStatus, stale, searchPhase: conjSearch.phase, searchSource: conjSearch.source })

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
        left={<Brand href="#/home" onNavigate={() => go('home')} />}
        center={<PrimaryNav view={view} onChange={go} />}
        right={<>
          <SearchPopover open={searchOpen} onOpen={() => setSearchOpen(true)} onClose={closeSearch} inputRef={searchRef}>
            <ObjectSearch bare inputRef={searchRef} query={query} onQueryChange={setQuery} results={search.results} loading={search.loading} degraded={search.degraded} onPick={(id) => { closeSearch(); showOnGlobe([id]) }} />
          </SearchPopover>
          <span ref={askButtonRef}><AskButton open={askOpen} onToggle={() => (askOpen ? closeAsk() : setAskOpen(true))} /></span>
          <AppMenu username={username} theme={theme} notices={notices} onGo={go} onShortcuts={() => setHelpOpen(true)} onTour={tour.start} onToggleTheme={toggleTheme} onSignOut={onSignOut} />
        </>}
      />

      <Breadcrumbs trail={trail} onNavigate={onCrumb} />

      {/* Not on Conjunctions: its result carries the same fact as one of its caveats, and one home per fact. Not on Globe/Data: the canvas stays clear, and Data explains it. */}
      {stale && staleDismissedBand !== currentStaleBand && (view === 'overview' || view === 'analytics') ? (
        <StaleDataBanner notice={stale} onGoData={() => go('data')} onDismiss={() => setStaleDismissedBand(currentStaleBand)} />
      ) : null}

      {view === 'home' ? <HomeView catalog={catalog} summary={summary} health={health} apiStatus={apiStatus} conjSearch={conjSearch} onConjQueryChange={setConjQuery} onSelectConjunction={setConjKey} onGo={go} onStartTour={tour.start} now={now} /> : null}
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
      {view === 'reports' ? <ReportsView summary={summary} health={health} conjSearch={conjSearch} selectedConjKey={conjKey} username={username} now={now} /> : null}

      {/* On the home page these readings are a readable "System status" section instead (homepage spec, Section 05). */}
      {view !== 'home' ? <StatusBar items={status} /> : null}
      {askOpen ? <AskOrcaPanel messages={ask.messages} onSend={ask.send} onPick={ask.pick} onClose={closeAsk} inputRef={askInputRef} footnote={ask.footnote} /> : null}
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}
      {tour.view ? <TourOverlay {...tour.view} /> : null}
    </div>
  )
}
