import { useCallback, useMemo, useRef, useState } from 'react'
import { getStatistics, getTles } from '@/api/endpoints'
import { useAsync } from '@/hooks/useAsync'
import { useCatalogUpdate } from '@/hooks/useCatalogUpdate'
import { useHashView } from '@/hooks/useHashView'
import { useHealth } from '@/hooks/useHealth'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNow } from '@/hooks/useNow'
import { useTheme } from '@/hooks/useTheme'
import { summarizeCatalog } from '@/lib/catalog'
import { days, integer } from '@/lib/format'
import { formatUtc } from '@/lib/time'
import { VIEWS } from '@/lib/views'
import { Icon } from '@/components/atoms/Icon/Icon'
import { IconButton } from '@/components/atoms/IconButton/IconButton'
import { Brand } from '@/components/molecules/Brand/Brand'
import { ThemeToggle } from '@/components/molecules/ThemeToggle/ThemeToggle'
import { AppBar } from '@/components/organisms/AppBar/AppBar'
import { ObjectSearch } from '@/components/organisms/ObjectSearch/ObjectSearch'
import { PrimaryNav } from '@/components/organisms/PrimaryNav/PrimaryNav'
import { ShortcutsHelp } from '@/components/organisms/ShortcutsHelp/ShortcutsHelp'
import { StatusBar } from '@/components/organisms/StatusBar/StatusBar'
import type { StatusItem } from '@/components/organisms/StatusBar/StatusBar'
import type { FocusRequest } from '@/components/organisms/GlobeCanvas/GlobeCanvas'
import { AnalyticsView } from '@/components/views/AnalyticsView/AnalyticsView'
import { ConjunctionsView } from '@/components/views/ConjunctionsView/ConjunctionsView'
import { DataView } from '@/components/views/DataView/DataView'
import { GlobeView } from '@/components/views/GlobeView/GlobeView'
import { OverviewView } from '@/components/views/OverviewView/OverviewView'
import './App.css'

const CATALOG_LIMIT = 5000

export function App() {
  const { theme, toggle: toggleTheme } = useTheme()
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
  const [helpOpen, setHelpOpen] = useState(false)
  const focusNonce = useRef(0)

  const summary = useMemo(() => (catalog.data ? summarizeCatalog(catalog.data, now) : null), [catalog.data, now])

  const showOnGlobe = useCallback((ids: string[]) => {
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
    { label: 'API', value: apiStatus === 'online' ? 'online' : apiStatus === 'offline' ? 'unreachable' : 'checking', tone: apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'bad' : 'warn' },
    { label: 'Objects', value: health ? integer(health.database.tles_count) : null },
    { label: 'Oldest TLE', value: summary?.oldestAgeDays != null ? days(summary.oldestAgeDays) : null, title: 'Age of the oldest element set in the catalog' },
    { label: 'Last API refresh', value: health?.database.last_update ? formatUtc(health.database.last_update) : null, title: 'When the API last stored a Celestrak fetch' },
    { label: 'UTC', value: formatUtc(now.toISOString()).replace(' UTC', '') },
  ]

  return (
    <div className="app">
      <AppBar
        left={<><Brand /><ObjectSearch inputRef={searchRef} catalog={catalog.data ?? []} onPick={(id) => showOnGlobe([id])} /></>}
        center={<PrimaryNav view={view} onChange={go} />}
        right={<>
          <IconButton label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}><Icon name="keyboard" /></IconButton>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </>}
      />

      {view === 'overview' ? (
        <OverviewView
          catalog={catalog}
          summary={summary}
          selectedId={selection[0] ?? null}
          onSelect={(id) => setSelection(id ? [id] : [])}
          onOpenGlobe={(id) => showOnGlobe([id])}
          onGoData={() => go('data')}
          now={now}
        />
      ) : null}
      {view === 'globe' ? (
        <GlobeView
          catalog={catalog.data}
          totalCount={health?.database.tles_count ?? catalog.data?.length ?? null}
          selection={selection}
          focus={focus}
          theme={theme}
          now={now}
          oldestTleAgeDays={summary?.oldestAgeDays ?? null}
          onSelect={setSelection}
        />
      ) : null}
      {view === 'conjunctions' ? <ConjunctionsView now={now} catalogSize={health?.database.tles_count ?? catalog.data?.length ?? null} onShowOnGlobe={showOnGlobe} /> : null}
      {view === 'analytics' ? <AnalyticsView catalog={catalog} stats={stats} /> : null}
      {view === 'data' ? <DataView health={health} apiStatus={apiStatus} summary={summary} update={update} /> : null}

      <StatusBar items={status} />
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}
    </div>
  )
}
