import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { getStatistics, getTles } from '@/api/endpoints'
import type { ConjunctionEvent } from '@/api/types'
import type { CameraGeo } from '@/lib/coords'
import { useAsync } from '@/hooks/useAsync'
import { useCatalogUpdate } from '@/hooks/useCatalogUpdate'
import { useHashView } from '@/hooks/useHashView'
import { useHealth } from '@/hooks/useHealth'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNow } from '@/hooks/useNow'
import { useObjectSearch } from '@/hooks/useObjectSearch'
import { summarizeCatalog } from '@/lib/catalog'
import { days, formatLat, formatLon, integer } from '@/lib/format'
import { formatUtc } from '@/lib/time'
import { VIEWS } from '@/lib/views'
import { Icon } from '@/components/atoms/Icon/Icon'
import { IconButton } from '@/components/atoms/IconButton/IconButton'
import { Brand } from '@/components/molecules/Brand/Brand'
import { SessionControl } from '@/components/molecules/SessionControl/SessionControl'
import { ThemeToggle } from '@/components/molecules/ThemeToggle/ThemeToggle'
import type { Theme } from '@/lib/theme'
import { AppBar } from '@/components/organisms/AppBar/AppBar'
import { ObjectSearch } from '@/components/organisms/ObjectSearch/ObjectSearch'
import { PrimaryNav } from '@/components/organisms/PrimaryNav/PrimaryNav'
import { ShortcutsHelp } from '@/components/organisms/ShortcutsHelp/ShortcutsHelp'
import { StatusBar } from '@/components/organisms/StatusBar/StatusBar'
import type { StatusItem } from '@/components/organisms/StatusBar/StatusBar'
import type { FocusRequest } from '@/components/organisms/GlobeCanvas/GlobeCanvas'
import { LoadingScreen } from '@/components/views/LoadingScreen/LoadingScreen'
import { AnalyticsView } from '@/components/views/AnalyticsView/AnalyticsView'
import { ConjunctionsView } from '@/components/views/ConjunctionsView/ConjunctionsView'
import { DataView } from '@/components/views/DataView/DataView'
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
  const [query, setQuery] = useState('')
  const search = useObjectSearch(query, catalog.data ?? [])
  const focusNonce = useRef(0)

  const summary = useMemo(() => (catalog.data ? summarizeCatalog(catalog.data, now) : null), [catalog.data, now])

  // `event` is the conjunction being shown (its dashed closest-approach line and card); a plain object pick has none.
  const showOnGlobe = useCallback((ids: string[], event?: ConjunctionEvent) => {
    setConjunction(event ?? null)
    setSelection(ids)
    if (ids[0]) setFocus({ id: ids[0], nonce: ++focusNonce.current })
    go('globe')
  }, [go])

  // Esc is the last rung of the ladder: modals and detail panes close themselves first (they prevent default).
  useKeyboardShortcuts({
    '1': () => go(VIEWS[0]),
    '2': () => go(VIEWS[1]),
    '3': () => go(VIEWS[2]),
    '4': () => go(VIEWS[3]),
    '5': () => go(VIEWS[4]),
    t: toggleTheme,
    '?': () => setHelpOpen(true),
    '/': () => searchRef.current?.focus(),
    Escape: () => setSelection((s) => (s.length ? [] : s)),
  }, !helpOpen)

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
    { label: 'UTC', value: formatUtc(now.toISOString()).replace(' UTC', '') },
  ]

  return (
    <div className="app">
      <AppBar
        left={<><Brand /><ObjectSearch inputRef={searchRef} query={query} onQueryChange={setQuery} results={search.results} loading={search.loading} degraded={search.degraded} onPick={(id) => showOnGlobe([id])} /></>}
        center={<PrimaryNav view={view} onChange={go} />}
        right={<>
          <IconButton label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}><Icon name="keyboard" /></IconButton>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <SessionControl username={username} onSignOut={onSignOut} />
        </>}
      />

      {view === 'overview' ? (
        <OverviewView
          catalog={catalog}
          summary={summary}
          totalCount={health?.database.tles_count ?? null}
          selectedId={selection[0] ?? null}
          onSelect={(id) => setSelection(id ? [id] : [])}
          onOpenGlobe={(id) => showOnGlobe([id])}
          onGoData={() => go('data')}
          lastFetch={health?.database.last_fetch}
          now={now}
        />
      ) : null}
      {view === 'globe' ? (
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
          lastFetch={health?.database.last_fetch}
          onGoData={() => go('data')}
        />
        </Suspense>
      ) : null}
      {view === 'conjunctions' ? <ConjunctionsView now={now} catalogSize={health?.database.tles_count ?? catalog.data?.length ?? null} onShowOnGlobe={showOnGlobe} /> : null}
      {view === 'analytics' ? <AnalyticsView catalog={catalog} stats={stats} totalCount={health?.database.tles_count ?? null} lastFetch={health?.database.last_fetch} onGoData={() => go('data')} now={now} /> : null}
      {view === 'data' ? <DataView health={health} apiStatus={apiStatus} summary={summary} update={update} /> : null}

      <StatusBar items={status} />
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}
    </div>
  )
}
