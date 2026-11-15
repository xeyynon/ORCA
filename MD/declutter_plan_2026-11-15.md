# Declutter plan, every page (2026-11-15)

The owner asked for the Globe treatment on every page: find what is repeated, idle or over-explained, and tailor each page so it does its job with less. This is the plan; nothing here is built yet.

## How it was measured

Each page was rendered whole (1440 px wide, a viewport tall enough to show it without scrolling; screenshots in `MD/ux_audit/2026-11-15-declutter/`), with the catalogue freshly refreshed (15,977 objects) and, for Conjunctions, the stored example run loaded with its first pair selected. A script counted, inside each page: total height, words, footnotes, small uppercase labels, buttons and links, and every figure that appears more than once.

| Page | Height | Words | Footnotes | Uppercase labels | Figures repeated |
|---|---|---|---|---|---|
| Home | 1,476 px | 354 | 0 | 5 | 15,977 ×3 |
| Overview | **8,873 px** | **2,828** | 1 | 14 | **5,000 ×6**, 15,977 ×2 |
| Conjunctions (idle) | 1,047 px | 399 | 1 | 8 | none |
| Conjunctions (a result, a pair open) | **4,783 px** | 2,040 | **6** | **21** | 442,786 ×3 |
| Analytics | 1,507 px | 345 | **7** | 5 | **15,977 ×10** |
| Data | 816 px | 136 | 3 | 13 | none |
| Reports | 2,391 px | 806 | 0 | 8 | 442,786 ×4 (inside the report: expected) |

The rules applied are the ones that worked on the Globe: one home per fact, a control or note only where it applies, say a scope once, show a table a page at a time, and fold detail behind the place that needs it rather than repeating it everywhere.

## 1. Conjunctions (worst: 4,783 px, six notes)

| What | Why it is clutter | Change |
|---|---|---|
| The search card carries a four-line paragraph on SGP4, screening and run time | The same explanation is in "How this list is made" at the foot of the page | One line under the button ("Takes about 2 minutes for 15,977 objects"); the method stays in its disclosure |
| "Saved example run, not live" is a separate notice, then "3 things to know" repeats it as point 1 ("every event is in the past") | Two blocks for one fact | One block: the saved-run line becomes the first point of the caveats |
| 442,786 three times (result headline, tier bar caption, table caption) | One figure, three places | Keep it in the headline; the tier bar and the table say "of these" |
| The table renders all 100 rows (most of the page height) | The page is 4.8k px; the detail panel scrolls away from the row it describes | 25 rows a page with page buttons; the detail panel stays beside the table (sticky) |
| The detail panel shows "Mahalanobis distance —" and "Combined hard-body radius —" | Two rows that say nothing for the stored run | Show a row only when it has a value; one line says those two are computed for a live search |
| The detail panel's two closing paragraphs | Same caveat as the page's caveats block | One line, as on the Globe card |
| The timeline chart is 300 px tall | Its points sit in a narrow band | 200 px |

Expected: about 1,900 px instead of 4,783, three notes instead of six, the selected pair always next to its details.

## 2. Overview (8,873 px, "5,000" six times)

| What | Why | Change |
|---|---|---|
| Five KPI cards: objects, newest TLE, median TLE age, oldest TLE, median altitude | Three of the five are the same fact (TLE age) in three cards; the median age is also in the status bar | Three cards: Objects, TLE age ("0.6 d median · newest 0.2 d · oldest 89.5 d"), Median altitude |
| "5,000" six times (KPI hint, filter note, count line, chips, cap text) | The loaded-subset story is told in three places | The count line above the table says it once; the KPI hint and the filter note drop it |
| 250 rows then "Show next 250": the page grows past 8,000 px | Scrolling 250 rows to reach anything below; the selected object's card scrolls away | 50 rows a page with page buttons; the object card stays beside the table (sticky) |

Expected: about 2,300 px instead of 8,873 at the first page.

## 3. Analytics (15,977 ten times, seven notes)

| What | Why | Change |
|---|---|---|
| "All 15,977 objects" on every chart (seven times) plus the subtitle and the donut centre | Every chart covers the same set; the scope is the page's, not each chart's | Say it once in the subtitle; a chart shows its own scope only when it differs (e.g. the first 5,000 when the whole catalogue failed to load) |
| KPI row: mean apogee, median perigee, mean period, mean inclination | Means and medians mixed; a mean apogee of 2,214 km is pulled up by the few GEO objects and describes no real orbit | Drop the row, or four medians with the unit; the charts below carry the distributions |
| A two-line note under every chart | Most say how to read the chart; the useful part is one clause | One line each, the clause that matters ("log axis", "naming heuristic, not ownership") |

Expected: about 1,250 px, 15,977 once, notes half as long.

## 4. Home (15,977 three times, a third section that repeats the status)

| What | Why | Change |
|---|---|---|
| KPI "Catalogued objects 15,977" | The headline says the same number in 52 px type right above it | Three KPI cards: close pairs, high-risk, critical |
| "System status" section (API, catalogue size, oldest TLE, refresh, time) | Catalogue size repeats the headline; refresh and age repeat the Data quality panel beside it | Fold the API state into Data quality as one row; remove the section |

Expected: about 1,280 px; every figure once.

## 5. Data (three cards, developer links in the middle)

| What | Why | Change |
|---|---|---|
| Three cards: catalogue status, refresh, API | The API card is developer detail (base URL, /health, /docs, build) | Catalogue status and Refresh stay; the API facts go under a "For developers" disclosure, closed by default |
| "Objects stored 15,977" | Every catalogue view states it | Keep: on the Data page it is the point |

Expected: about 600 px.

## 6. Reports

Already lean: a builder and a document. One change: the builder's "Close-approach figures from the stored example run (442,786 pairs…)" line repeats the report's own run line; drop it from the builder.

## 7. Across pages

- Small uppercase labels: keep them for field labels and table heads (they carry information), but not for section headings (already done) and not for labels that sit next to a value of the same meaning.
- After this pass, run the clutter script again and record before and after in this file, with screenshots in `snapshots/14-declutter-…/`.

## Order of work (proposed)

1. **Conjunctions** (biggest gain, the core feature).
2. **Overview** (8.9k px page).
3. **Analytics.**
4. **Home** and **Data** (small, quick).
5. **Reports** (one line).

Each step lands with before/after measurements and screenshots, tests and the build passing, and a commit to `ui/design-system-v2`.

## Plan of action

Paths are under `frontend/src/`. Every step ends the same way (the "close-out" below). One commit per step.

### Step 0. Shared pieces (needed by steps 1 and 2)

| Task | Where |
|---|---|
| A `Pager` molecule: "Rows 1 to 25 of 100", Previous / Next, page buttons, keyboard reachable, nothing shown when one page is enough | new `components/molecules/Pager/` |
| A pure `pageOf(rows, page, size)` helper with tests (last page, empty list, page out of range after a filter) | `lib/paging.ts` + `lib/paging.test.ts`, registered in `package.json` |
| A sticky side column style shared by both split layouts (`position: sticky; top` under the app bar; off at ≤1000 px where the card stacks) | `ConjunctionsView.css`, `OverviewView.css` |

### Step 1. Conjunctions

| # | Task | Where |
|---|---|---|
| 1.1 | Search note cut to one line: "Takes about N min for 15,977 objects over D days." The SGP4, step and screening text stays in "How this list is made" | `organisms/ConjunctionControls/ConjunctionControls.tsx` |
| 1.2 | Remove `SavedRunBanner`; the saved-run fact becomes the first caveat, and "Run a fresh search" moves into the caveats callout. Remove the "every event is in the past" caveat when the run is saved (it repeats the same point) | `views/ConjunctionsView/ConjunctionsView.tsx`, `organisms/ResultCaveats/ResultCaveats.tsx` (optional action), delete `organisms/SavedRunBanner/` (ask first) |
| 1.3 | 442,786 once: the tier card note becomes "Grouped by tier; the table lists the most probable." | `ConjunctionsView.tsx` |
| 1.4 | Table shows 25 rows a page using `Pager`; the selected row's page opens when Previous / Next on the card moves past the page's edge | `organisms/ConjunctionTable/ConjunctionTable.tsx`, `ConjunctionsView.tsx` |
| 1.5 | The pair card stays in view beside the table (sticky) | `ConjunctionsView.css` |
| 1.6 | Show the Mahalanobis and hard-body rows only when they have a value; for the saved run, one line says they are computed for a live search (replaces the saved-run paragraph) | `organisms/PairCard/PairCard.tsx` |
| 1.7 | The closing Pc paragraph cut to one line ("A research estimate from an assumed uncertainty; not for manoeuvre decisions."), the long version stays in the page caveats | `PairCard.tsx` |
| 1.8 | Timeline height 300 → 200 px | `organisms/EventTimeline/` |
| 1.9 | The glossary note under the table: keep (it is the only place the four terms are defined), but one line | `ConjunctionsView.tsx` |

Target: about 1,900 px with a pair open (now 4,783), 3 notes (now 6), 442,786 once.

### Step 2. Overview

| # | Task | Where |
|---|---|---|
| 2.1 | Three KPI cards: Objects; TLE age (median as the value, "newest 0.2 d · oldest 89.5 d" as the hint); Median altitude. `KPI_CAPTIONS` updated to match | `views/OverviewView/OverviewView.tsx` |
| 2.2 | The 5,000 limit said once, in the filter bar's count line. Remove it from the Objects hint (`loadedHint`) and from the regime chart note | `OverviewView.tsx`, `organisms/CatalogFilterBar/` |
| 2.3 | `CatalogTable`: "Show next 250" replaced by `Pager` at 50 rows; a filter or sort change goes back to page 1; the selected object's page is shown when it is selected from elsewhere (search, Globe) | `organisms/CatalogTable/CatalogTable.tsx` |
| 2.4 | The object card column stays in view (sticky) | `OverviewView.css` |

Target: about 2,300 px (now 8,873), 5,000 once.

### Step 3. Analytics

| # | Task | Where |
|---|---|---|
| 3.1 | Scope said once in the subtitle; `ChartCard`'s `scope` passed only when a chart covers a different set (partial load, or the server regime count) | `views/AnalyticsView/AnalyticsView.tsx` |
| 3.2 | KPI row: removed (recommended), or four medians; the owner's choice | `AnalyticsView.tsx` |
| 3.3 | Each chart note cut to the one clause that matters: "Derived from perigee, apogee and eccentricity." · "Grouped by first word of the name, not by owner." · "Older sets propagate less accurately." · "Log axis." · "Spikes are constellations: Starlink 53°, sun-synchronous 97°, GEO 0°." · "Log axis; e = 0 cannot be placed (N objects)." · "Brighter = more objects per cell." | `AnalyticsView.tsx` |

Target: about 1,250 px (now 1,507), 15,977 once, notes about half as long.

### Step 4. Home and Data

| # | Task | Where |
|---|---|---|
| 4.1 | Drop the "Catalogued objects" KPI; three cards remain | `lib/homeBoard.ts` (`homeKpis`) + its test, `organisms/HomeKpis/` |
| 4.2 | API state becomes one row of Data quality; the System status section goes (ask before deleting the `SystemStatus` organism) | `organisms/DataQuality/`, `views/HomeView/HomeView.tsx` |
| 4.3 | Data: API facts (base URL, /health, build, /docs) in a "For developers" disclosure, closed by default. The API status row stays visible | `views/DataView/DataView.tsx` |

Target: Home about 1,280 px with every figure once; Data about 600 px.

### Step 5. Reports

| # | Task | Where |
|---|---|---|
| 5.1 | Remove the builder's `source` line (the report's own run line says it) | `organisms/ReportBuilder/ReportBuilder.tsx`, `views/ReportsView/ReportsView.tsx` |

### Step 6. Guard and record

| Task | Where |
|---|---|
| A test that no page renders the same large figure more than twice is not practical from source; instead, re-run `.playwright-mcp/clutter.js` and record before and after in this file | this file |
| Screenshots before and after in `snapshots/14-declutter-2026-11-15/`, listed in `snapshots/README.md` | snapshots |
| `MD/TASKS.md`, `MD/DECISIONS.md` (paging at 25 / 50, scope once) | MD |

### Close-out for every step

1. `npm test` (all pass), contrast check, `npm run build`.
2. In the browser at 360, 820, 1440 and 1920 px, dark and light, plus the API down; no horizontal scroll, the sticky panel never covers the table.
3. Run the clutter script on that page; write the new figures into this file.
4. Commit with only the owner's name, staging files by name; push to `ui/design-system-v2`.

### Asks before or during the work

- Step 3.2: remove the Analytics KPI row (recommended) or keep four medians.
- Steps 1.2 and 4.2 delete two organisms (`SavedRunBanner`, `SystemStatus`): confirm when we get there.

## Results

| Step | Page | Height | Words | Notes | Figures repeated | Shots |
|---|---|---|---|---|---|---|
| 0 + 1 | Conjunctions (saved run, a pair open) | 4,783 → **2,056 px** | 2,040 → **756** | 6 → **5** | 442,786 ×3 → **none** | `snapshots/14-declutter-2026-11-15/after-conjunctions-result.png`, `after-conjunctions-360.png` |
| 2 | Overview (first page; a row selected) | 8,873 → **2,258 px** (2,004 selected) | 2,828 → **653** | 1 | 5,000 ×6 → ×3 (filter line, pager, donut centre) | `after-overview.png`, `after-overview-selected.png` |
| 4.3 | Data | 816 px (folded API; now centred) | | | none | `before-data-1440.png`, `after-data-1440.png`, `after-data-360.png` |

Step 1 notes: the table caption is now "The 100 most probable" (the total stays in the answer only); the tier chart note was dropped as well (it repeated the caption). Checked: the card stays in view while the table scrolls (1440 px), Next from pair 25 turns the table to page 2, no sideways scroll at 360 px where the card stacks under the table. `SavedRunBanner` is no longer rendered; its folder is left in place until the owner confirms deleting it. Not checked yet: light theme and the API down on this page.

Step 2 notes: three KPI cards (TLE age as one card: median, newest and oldest in its hint); 50 rows a page with the object card kept in view; the count line above the table removed (the pager says "1 to 50 of 5,000"). The regime chart is titled "Loaded objects by regime" when only part of the catalogue is loaded, since its scope note was removed.

Data (owner, 2026-11-15: "why everything is moved towards left?"): the cards had been capped at 960 px but not centred, while the title and bars span the window, leaving a 460 px empty band on the right at 1440 px. `PageLayout` gained a `narrow` mode that centres the whole page, title included, in one 960 px column. The API card is now a "For developers" disclosure, closed, with the API state in its summary (plan step 4.3, done early).

Owner requests during step 2 (2026-11-15):
- **API health page** ("rather than a json type of health check prepare a proper page", "on that page give an option for json"): new view `#/health` (`views/HealthView`), opened from Data's "For developers" section, no tab and no hotkey. It shows the answer first (online / not answering, response time measured in this browser, last check in seconds, Check now), then Server (reported status, server time, response time, address) and Catalogue database (objects, last refresh, last Celestrak fetch in words, fetched at, the fetch detail when it failed). The raw JSON is a closed "Raw response (JSON)" section with Copy, Open /health and API docs. `useHealth` now also returns `check` (checkedAt, latencyMs, error) and `recheck`; wording in `lib/health.ts` with tests. Ask ORCA sends "health", "api status" and "system status" to this page.
- **"Compared with the catalog" looked like sliders**: the round accent knob on a rounded groove read as a range input. Now a 1 px hairline with end ticks and a short upright tick in text colour, plus the rank in words ("Higher than 54% of loaded objects"; TLE age says "Older" / "Newer"). `rankWords()` in `lib/percentile.ts`, tested.
- **Regime card too big for one widget**: with nothing selected the side column fell into the single column and the donut stretched across the page; its counts also repeated the regime chips above the table. Removed from Overview; Analytics keeps the regime chart.

| 3 | Analytics | 1,507 → **1,381 px** | 345 → **234** | 7, each one line | 15,977 ×10 → ×2 (subtitle, donut centre) | `after-analytics.png` |

Step 3 (owner chose "remove it"): the KPI row (mean apogee, median perigee, mean period, mean inclination) is gone, and with it the `/api/statistics` request, which fed nothing else. The scope is said once in the subtitle; only the regime donut shows its own scope, and only when it counts the whole catalogue while the other charts use the first loaded rows (that partial case was not exercised in the browser this time). Every chart note is one clause; the heatmap gives its plotted count only when some objects were left out. `SavedRunBanner` deleted (owner: "delete it").

Steps 4 and 5: Home drops the "Catalogued objects" card (three cards, laid out with auto-fit so three or one per row, never two and one) and the System status section; its API row is now the last row of Data quality ("ORCA API: Connected"). The report's headline table drops the same row (its sentence above already gives the count). Reports: the builder's run line is gone once the run is ready; it still speaks while loading and on failure. `SystemStatus` is no longer rendered; its folder is kept until the owner confirms deleting it.

## Before and after (2026-11-15, 1440 px, `.playwright-mcp/clutter-after.js`)

| Page | Height | Words | Notes | Figures repeated |
|---|---|---|---|---|
| Home | 1,476 → **1,362** | 354 → **300** | 0 | 15,977 ×3 → **none** |
| Overview (first page) | 8,873 → **2,004** | 2,828 → **622** | 1 → **0** | 5,000 ×6 → ×2, 15,977 ×2 |
| Conjunctions, idle | 1,047 → **993** | 399 → **358** | 1 | none |
| Conjunctions, a result with a pair open | 4,783 → **2,056** | 2,040 → **745** | 6 → **5** | 442,786 ×3 → **none** |
| Analytics | 1,507 → **1,381** | 345 → **234** | 7 (one line each) | 15,977 ×10 → ×2 |
| Data | 816 → 816 (centred) | 136 → **110** | 3 | none |
| API health (new) | 816 | 83 | 0 | none |
| Reports | 2,391 → **2,362** | 806 → **784** | 0 | 442,786 ×4 → ×3 (inside the report, expected) |

Checked in the browser: 1440 px dark for every page; 360 px for Conjunctions and Data (no sideways scroll); light theme for Overview with an object open and API health; the API blocked on API health (it says "The API is not answering" with the error, and keeps the last good response). Not checked this round: 820 and 1920 px, and the light theme on Home, Analytics and Reports.
