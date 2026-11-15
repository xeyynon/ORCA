# Frontend Guide

> How the React frontend is built, component by component. Read from `frontend/src` on 2026-10-03.
> The rulebook it follows is [rules.md](rules.md). The short run guide is [../frontend/README.md](../frontend/README.md).
> This file is a deep reference. If you want it out of git, add `MD/frontend.md` to `.gitignore`.

## 1. Stack

React 19, TypeScript, Vite 8, three.js. No UI framework and no state library. Tests use Node's built-in test runner through `tsx`.

```bash
cd frontend
npm install
npm run dev         # http://127.0.0.1:5173, proxies /api and /health to :8000
npm run build       # tsc -b, then vite build
npm run typecheck
npm test            # unit tests for src/lib
```

## 2. Folder layout

```
src/
  main.tsx, App.tsx          entry, top-level routing between login and workspace
  Workspace.tsx/.css         the signed-in shell
  api/                       auth.ts, client.ts, endpoints.ts, session.ts, types.ts
  lib/                       pure logic and its tests (no React, no fetch)
  hooks/                     every fetch, poll and effect
  globe/                     EarthScene.ts, earthTexture.ts (the only code that touches three.js)
  components/
    atoms/ molecules/ organisms/ views/    one folder per component
  styles/                    tokens.css (dark + light), base.css
```

## 3. Layers and who may call whom

| Layer | May do | May not do |
|---|---|---|
| `components/atoms` and `molecules` | Render props | Fetch, touch storage, import hooks that fetch |
| `components/organisms` | Compose smaller parts, hold local UI state | Call `fetch` |
| `components/views` | Wire hooks to organisms | Contain raw styling values |
| `hooks/` | Fetch, poll, subscribe, call `api/` | Render |
| `api/` | The only place that calls the backend. Typed responses copied from real ones | Be imported by presentational components |
| `lib/` | Pure functions: units, risk, time, histogram, coordinates, CSV | Touch the DOM or the network |
| `globe/EarthScene.ts` | Own the three.js scene. React talks to it through methods | Be imported outside `GlobeCanvas` |

## 4. Components

**Atoms (15):** Badge, Button, Divider, Dot, Icon, IconButton, Kbd, Label, Mono, SheetHandle, Skeleton, Spinner, Swatch, Switch, Unit.

**Molecules (45):** ArrowLink, AskButton, BlockHeader, Brand, Callout, ChatComposer, ChatMessage, CheckboxRow, CopyButton, CredentialRow, EmptyState, FactRow, FieldNote, FineOnly, GlobeTooltip, GlossaryTerm, Kpi, LegendItem, LoadingMark, MenuItem, NavTab, NoticeRow, NumberField, Pager, Panel, PrevNextNav, QuickReplyChips, RangeMarker, RiskBadge, SearchField, SearchResultItem, SectionHeader, SegmentedControl, SelectField, ShortcutRow, SkipLink, SortHeader, StatusField, StatusIndicator, StepDots, TextField, ThemeToggle, TleAgeChip, ToggleChip, ValueUnit.

**Organisms (60):** AppBar, AppMenu, ApproachPreview, AskOrcaPanel, BarList, BottomSheet, CameraCard, CatalogFilterBar, CatalogSummaryCard, CatalogTable, ChartCard, ChartLegend, ChunkErrorBoundary, ConjunctionCard, ConjunctionControls, ConjunctionMethod, ConjunctionTable, DataQuality, DataStatusCard, DataTable, DebrisBackdrop, DonutChart, EvaluatorAccess, EventTimeline, FiltersCard, GlobeCanvas, GlobeLegend, HeatmapChart, Histogram, HomeHero, HomeKpis, JobProgress, KpiRow, LoginForm, MethodNote, Modal, ObjectCard, ObjectSearch, ObjectStanding, OrbitDistribution, PageLayout, PairCard, PlaybackBar, PopoverMenu, PrimaryNav, RegimeBreakdown, ReportBuilder, ReportDocument, ResultAnswer, ResultCaveats, RiskSummaryBar, SearchPopover, ShortcutsHelp, StaleDataBanner, StatusBar, TimeScrubber, TourCard, TourOverlay, UpdateCatalogPanel, ViewOptionsCard.

**Views (10):** AnalyticsView, ConjunctionsView, DataView, GlobeView, HealthView, HomeView, LoadingScreen, LoginView, OverviewView, ReportsView.

## 5. Views and keys

| Key | View | Shows |
|---|---|---|
| `H` (or the logo) | Home ("Mission control") | Headline object count, three run figures, the five worst approaches, orbit regimes, data quality with the API state |
| `1` | Overview | Three KPI cards, a filterable table 50 rows a page, the object card beside it with its standing in the catalogue |
| `2` | Globe | three.js Earth, every object, orbit paths, time scrub up to +7 days, colour by altitude, type or constellation |
| `3` | Conjunctions | Method panel, cancellable search over 1 to 7 days, tier counts over everything found, 25 rows a page, the pair card beside the table |
| `4` | Analytics | Histograms, a density heatmap, bar lists and a donut, all derived in the browser; the scope is stated once in the subtitle |
| `5` | Data | Catalogue status and the Celestrak refresh; API details under "For developers" |
| `6` | Reports | Report builder and a printable PDF |
| (none) | API health (`#/health`) | Opened from Data: whether the API answers, response time, what it reports, the raw JSON folded |

`/` focuses search, `T` toggles the theme, `?` lists shortcuts, `Esc` steps back once per press. Handled by one window listener in `hooks/useKeyboardShortcuts.ts`.

## 6. Hooks

| Hook | Job |
|---|---|
| `useAsync` | Shared loading, result and error states |
| `useSession` | Sign-in state and token |
| `useHealth` | Polls `/health` every 15 s; also returns `check` (last check time, response time, last error) and `recheck` for the API health page |
| `useCatalogUpdate` | Triggers the refresh and tracks progress |
| `useConjunctionSearch`, `usePairAssessment` | Conjunction search (cancellable; holds the whole result with its counts) and pair detail |
| `useClipboard` | Copy with a short "copied" state (evaluator panel) |
| `usePositions`, `useOrbitPaths`, `useTleById` | Globe data and object detail |
| `useObjectSearch` | Catalog search |
| `useHashView` | The current view from the URL hash (also feeds `PageAnalytics`, one Vercel page view per view) |
| `useElementHeight` | Measures an element so the Globe's side panel stops above the bottom-right stack |
| `useHashView` | View selection through the URL hash |
| `useKeyboardShortcuts`, `useTheme`, `useNow`, `useElapsed` | UI plumbing |

## 7. Design tokens and theme

Every colour comes from `styles/tokens.css` (dark and light). `lib/tokens.ts` reads the tokens at runtime, so the theme is the single source of truth, including for charts (`lib/chartColors.ts` returns CSS token references and never literals, enforced by `charts.test.ts`). Categorical chart colours are `--cat-*`. Reduced motion is honoured in CSS and in the WebGL camera.

## 8. What the UI is honest about

- **TLE age** appears next to every object and position (`TleAgeChip`, `lib/tleAge.ts`).
- **Propagator** is named in `MethodNote`, read from the API response.
- **Three kinds of "nothing"** have different looks (`EmptyState`): not loaded yet, ran and found nothing, request failed.
- **Past events** are flagged. A conjunction whose TCA is already behind us is not a forecast.
- **Method and limits** are shown above the results (`ConjunctionMethod`), in the engine's own words from the API.
- **Pc** carries its condition: it depends on the uncertainty model, shown per event as the 1σ uncertainty and TLE age.
- **Totals are not truncated.** The table shows the top N by Pc; the tier counts and headline cover all M found.
- **Long encounters** (< 0.1 km/s) carry a "Long" badge and a note that the 2D Pc may understate them.
- **Units** are rendered by `Unit` and `ValueUnit`. Field names in `api/types.ts` carry unit suffixes.

## 9. Auth in the client

`LoginView` and `LoginForm` post to `/api/auth/login`. If both `VITE_EVALUATOR_USERNAME` and `VITE_EVALUATOR_PASSWORD` are set at build time, `EvaluatorAccess` shows them with copy buttons and a one-click fill (`lib/evaluator.ts`, tested). Unset, the panel does not render. Anything set there is public in the bundle. `api/session.ts` stores the token. `api/client.ts` attaches it as a bearer header and is the one point of contact with the backend. A 401 returns the user to the login screen. `lib/authErrors.ts` maps server errors (401, 429 with `Retry-After`, 503 not configured) to plain messages and is covered by `authErrors.test.ts`.

## 10. Tests

`npm test` runs every `src/lib/*.test.ts` (89 tests), among them `conjunctionSummary.test.ts` and `evaluator.test.ts`. There are no component tests. Visual checks were done with headless Chrome screenshots on 2026-10-15; they are not automated.

## 11. Adding a UI piece

1. Pick the lowest level that fits (atom, molecule, organism, view).
2. One component per file, one folder per component, a CSS file beside it, no raw colours.
3. Put logic in `lib/` with a test, effects in `hooks/`, backend calls in `api/`.
4. Check it in both themes and with the keyboard.
