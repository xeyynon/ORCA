# ORCA UI/UX and HCI audit

Date: 2026-11-06. Branch `fix/honest-conjunctions`, commit `de98a8e`.
Scope: the whole React frontend (`frontend/`), against the users named in [intent.md](intent.md).

## 1. How this was done

- Ran the real stack: FastAPI on :8000 with a throwaway credential, Vite dev server on :5173, the real `ssa_data.db` (15,970 objects).
- Drove every view in a Chromium browser at 1440x900, then 390x844 (phone) for Conjunctions and Globe, plus the light theme.
- Ran one full conjunction search end to end (1 day, 15,970 objects: **284 s**, 442,818 approaches under 10 km).
- Measured in the DOM: touch-target sizes, text contrast, landmarks, heading levels, document title, text sizes.
- Read the component source for behaviour a screenshot cannot show (what happens on unmount, what the copy says).

**Not covered** (so do not read silence as a pass): screen-reader pass, keyboard-only walk of the globe canvas, picking an object by clicking in the 3D scene, a real touch device, the Data view's "Fetch active catalog" flow (it writes to the DB, so I did not trigger it), and any behaviour on the deployed Oracle build. The headless browser throttled timers, so the live clock appeared frozen; I did not count that as a bug.

## 2. Who the interface has to serve

From [intent.md](intent.md):

| User | Needs from the UI | The test that matters |
|---|---|---|
| Capstone evaluator, recruiter | Working orbital mechanics, API and UI "in under five minutes" | Time to first convincing result |
| Student or learner | See how screening settings trade volume against missed events; understand the terms | Can they tell what a number means? |
| Downstream developer | The API; the UI is secondary | Links to docs/export |
| The team, in a viva | Every number defensible | Honest copy, no surprises |

The audit is weighted towards the first two. They arrive cold, have little patience, and judge the project on what the screen shows.

## 3. Verdict

**Strong on honesty and structure, weak on time-to-value, narrow screens and plain-language legibility.**

The hard parts are done well: the interface refuses to overclaim, the component system is disciplined, theming and focus states are real. The problems are about what a first-time user experiences in their first five minutes, and about screens that are not a 1440 px desktop.

| Nielsen heuristic | Rating | One-line reason |
|---|---|---|
| Visibility of system status | 4/5 | Honest job progress and "TLE age" everywhere; but the globe's 20-60 s load shows only a spinner and zero counts |
| Match with the real world | 2/5 | Pc, TCA, Mahalanobis, quadrature, TEME, "loaded position subset" with no plain-language layer |
| User control and freedom | 2/5 | Cancel exists, but navigating away silently destroys a 5-minute search |
| Consistency and standards | 4/5 | Tokens, one table, one badge language; chart text is a different size from UI text |
| Error prevention | 4/5 | Input ranges mirror API validation; empty vs failed vs "found nothing" are distinct |
| Recognition over recall | 4/5 | Shortcuts shown in the nav, `?` help, hash routes |
| Flexibility and efficiency | 4/5 | Keyboard shortcuts, CSV/JSON export, `/` for search |
| Aesthetic and minimal design | 3/5 | Beautiful login and globe; the conjunction page front-loads about 850 px of method before any result |
| Help recognise/recover from errors | 4/5 | Specific messages, retry on failure |
| Help and documentation | 3/5 | Everything is disclosed, but at expert depth and expanded by default |

## 4. What to protect (do not "improve" these away)

1. **Honest status copy.** "The API reports no stage or percentage, so only elapsed time is shown." "1 of 100 events are already in the past." "793 long encounters ... can be several times too low." This is the project's differentiator and it is what a viva examiner will respect.
2. **Risk is a dot and a word**, never colour alone ([RiskBadge.tsx](../frontend/src/components/molecules/RiskBadge/RiskBadge.tsx)).
3. **Empty, failed, and "ran and found nothing" are three different screens** ([ConjunctionsView.tsx](../frontend/src/components/views/ConjunctionsView/ConjunctionsView.tsx)).
4. **Token-driven dark and light themes**; the light theme held up in testing. Text contrast measured at or above 4.5:1 almost everywhere (exceptions in F13).
5. **Real focus ring, `prefers-reduced-motion` honoured** in CSS and in the WebGL scene.
6. **Hash routing** (back/forward works) and one-key view switching.
7. **Object detail that explains itself** ("derived from mean motion ... not read from a stored field").

## 5. Findings

Priority: **P0** breaks a core task or the first impression; **P1** misleads or wastes the user's time; **P2** friction and gaps; **P3** polish. Evidence files are in [ux_audit/](ux_audit/).

### P0

**F1. The layout is broken below about 1000 px wide.** At 390 px the app bar's nav tabs, keyboard icon, theme toggle and "Sign out" overlap each other and the page scrolls horizontally ([11-mobile-conj.png](ux_audit/11-mobile-conj.png)). On the Globe the stat panel, time slider and object card pile onto the 3D view and the playback controls are hidden behind them ([18-mobile-globe.png](ux_audit/18-mobile-globe.png)). The object search is `display: none` at 1100 px and below ([ObjectSearch.css:18](../frontend/src/components/organisms/ObjectSearch/ObjectSearch.css)), so tablets and phones lose search entirely. Evaluators open links on phones and laptops in split view; this is the first thing they would see.
*Principle:* responsive design; flexibility. *Fix:* collapse the nav into a bottom tab bar or menu under 900 px, move search into it, make the Globe a full-bleed canvas with a bottom sheet for panels.

**F2. A running search is destroyed when you leave the page, and so are its results.** The search lives in `ConjunctionsView`; its hook aborts on unmount ([useConjunctionSearch.ts:46](../frontend/src/hooks/useConjunctionSearch.ts)). I lost a run by pressing `4` then `3`. Worse, the primary follow-up action, **"Show on globe" on a result, navigates away and discards all 284 seconds of results** — returning shows "No search run yet". No warning at any point.
*Principle:* user control and freedom; error prevention. *Fix:* lift the search into `Workspace` (like the catalog, which already survives view switches) so it keeps running and the results persist. A "search running" pill in the status bar would complete it.

**F3. Time-to-value fails the project's own five-minute promise.** Cold Globe: 20-60 s of "Propagating catalog..." (the filter counts read **0** meanwhile, which reads as "nothing is in orbit"). Conjunction search: 284 s, then the answer is not visible. For an evaluator this is the whole demo.
*Principle:* visibility of status; efficiency. *Fix:* (a) show the Globe immediately and stream objects in, or draw the first frame from a cached propagation; (b) show a dash instead of `0` until counts exist; (c) ship a **precomputed demo result** ("Example: 1-day screening, run 2026-11-06") that opens instantly, labelled as a saved run, with "Run a fresh search" beside it.

### P1

**F4. The answer is buried below the method.** At 1440x900 the first result appears at about y = 860, after a fully expanded five-column method panel (`<details open>`, [ConjunctionMethod.tsx:17](../frontend/src/components/organisms/ConjunctionMethod/ConjunctionMethod.tsx)) and two warning callouts ([06](ux_audit/06-conjunctions.png), [14](ux_audit/14-conj-results.png), [15](ux_audit/15-conj-results-scrolled.png)). The decision-relevant sentence, "0 critical, 29 high out of 442,818 approaches", is a thin bar further down. 376,022 of the 442,818 are NEGLIGIBLE; the page presents them as equal weight.
*Fix:* result headline first ("29 high-risk approaches in the next 24 h; none critical"), method collapsed after the first run, callouts folded into one "Caveats (2)" strip, negligible/low tiers de-emphasised.

**F5. Analytics charts disagree with the rest of the app.** The charts use the 5,000 objects the API returns, which are an alphabetical slice, not a sample. The donut says **LEO 86.3 %**; the Globe's own filter shows 15,102 of 15,970 = **94.6 %**. "Largest constellations" shows Starlink 2,605 of 5,000. The subtitle admits "5,000 of 15,970 (API cap)" but the charts themselves do not carry the caveat ([08-analytics.png](ux_audit/08-analytics.png)). A learner will quote a wrong number.
*Fix:* compute the distributions server-side over the whole catalog (the server statistics call already exists), or draw a uniform sample and say so inside each chart card.

**F6. Expert vocabulary with no plain-language layer.** Pc, TCA, Mahalanobis distance, Foster 2D, quadrature, TEME, "hard-body radius", "1 sigma" appear unexplained. The method block is complete and correct, and unreadable to the student persona. Honesty is not the same as legibility.
*Fix:* a one-sentence "what this means" above each technical block; a hover/focus glossary for the ten core terms (reuse the existing info-icon pattern from the chart cards); keep the full text behind "Details".

**F7. Stale data is displayed but never acted on.** Every row is amber or red ("TLE 29.8 D OLD"), the Data view shows a "27.7 d" badge, and the oldest element set is 80.6 days old. Yet the conjunction forecast is silently built on these, and the Data view has no recommendation. A 30-day-old TLE makes a 24-hour forecast near meaningless; that should be a banner, not 5,000 chips.
*Fix:* one global banner when median age exceeds a threshold ("Forecasts use element sets a median 30 d old. Refresh before trusting them"), linking to Data; drop the per-row chip colour to neutral once the banner exists.

**F8. Copy leaks implementation details and is sometimes wrong.**
- [ObjectCard.tsx:56](../frontend/src/components/organisms/ObjectCard/ObjectCard.tsx) "not in the loaded position subset" (the user does not know there is a subset).
- [DataView.tsx:47](../frontend/src/components/views/DataView/DataView.tsx) "The dashboard and this app read the same SQLite file": the dashboard was removed (see frontend README).
- [UpdateCatalogPanel.tsx:55](../frontend/src/components/organisms/UpdateCatalogPanel/UpdateCatalogPanel.tsx) "about 10,000 objects" while the database holds 15,970.
- [CatalogTable.tsx](../frontend/src/components/organisms/CatalogTable/CatalogTable.tsx) says "search covers only the loaded ones", but the search hook queries the server and only falls back to loaded objects when the server fails.
- "(measured on a laptop)" next to the runtime estimate.

**F9. Placeholder ellipses leak into prose.** Until the method call returns, the controls note reads "propagated with SGP4 every ... s and every approach closer than ... km" ([06-conjunctions.png](ux_audit/06-conjunctions.png)). *Fix:* render a skeleton line, or hide the sentence until the numbers exist.

### P2

**F10. Landmarks and document structure.** No skip link; no `<h1>` anywhere in the workspace (views start at `<h2>`, [SectionHeader.tsx](../frontend/src/components/molecules/SectionHeader/SectionHeader.tsx)); the document title is always "ORCA", so history entries, tabs and screen-reader announcements never say which view you are on. *Fix:* an `<h1>` per view; `document.title = "Conjunctions | ORCA"`; a skip-to-content link.

**F11. Table rows behave like buttons but are not announced as such.** `tr` with `tabIndex=0` and `aria-selected` in a plain table; Enter works, Space does not ([DataTable.tsx](../frontend/src/components/organisms/DataTable/DataTable.tsx)). *Fix:* `role="grid"`/`row` semantics or a real button in the first cell; support Space.

**F12. Touch and hit targets are small.** Measured: nav tabs 30 px high, icon buttons 30x30, "Sign out" 83x24, "Cancel" 53x24, inputs 30 px. All clear the WCAG 2.2 AA minimum (24 px) but fall short of the 44 px guideline for touch; matters once F1 is fixed. Base text is 13 px and some labels render at 8 px.

**F13. A few contrast and state issues.** The disabled primary button ("Searching..." ) measures about 3.3:1, and it is the one control the user is looking at during a 5-minute wait. In the light theme the active nav tab measured 3.15:1 against its tinted pill (my estimate of the background under a translucent fill is approximate, so treat it as a lead, not a measurement). [tokens.css](../frontend/src/styles/tokens.css) says ratios are checked by `scripts/contrast.mjs`, but that script does not exist in the repo; either restore it or fix the comment.

**F14. Chart type scale is out of step with the UI.** The scatter plot's axis text is mono at about 16 px against 13 px UI text, so the chart reads as a different product ([15-conj-results-scrolled.png](ux_audit/15-conj-results-scrolled.png)).

**F15. The Pc scatter has no way to act on a point.** Hover gives the pair name; the component has no click handler ([EventTimeline.tsx](../frontend/src/components/organisms/EventTimeline/EventTimeline.tsx)), so the table is the only way into the detail card.

### P3

- **F16.** "Evaluator access" shows the demo password to every visitor of a public deployment (by design: [README.md](README.md) says it is baked into the bundle). Honest and convenient for evaluators; it also means the login is a front door only, which the Data/README already state. Owner's call; worth one line on the page ("Shared demo account, read-only") if that is true.
- **F17.** The Overview table shows a capped slice with a note below it; there is no filter on the table itself, so finding "all GEO objects" means leaving the page for the Globe filters.
- **F18.** The Globe's colour meaning (by altitude or by type) is only in the filter list; there is no legend on the canvas itself. A `GlobeLegend` organism already exists in the repo but nothing imports it.
- **F19.** Navigation shortcuts `1`-`5` are shown on the tabs, which is good, but they are invisible to touch users and take space the tabs need on small screens.

## 6. Cross-cutting themes

| Theme | Findings |
|---|---|
| **Narrow screens were never designed** | F1, F12, F19 |
| **Long-running work is fragile** | F2, F3 |
| **Truth is complete but not prioritised**: the full caveat is always shown, the one that matters most is not highlighted | F4, F6, F7 |
| **Different parts of the app tell different numbers** | F5, F8 |
| **Accessibility foundations good, structure missing** | F10, F11, F13 |

## 7. Suggested upgrade plan

Ordered by user value per unit of effort. Each phase is independently shippable.

**Phase 1: stop the bleeding (small, high impact)**
F2 lift search state to `Workspace` and add a status-bar "search running" pill; F9 skeletons; F8 copy fixes; F10 titles, `<h1>`, skip link; F3b dash instead of `0` while loading.

**Phase 2: make the first five minutes work**
F4 result-first layout; F3c saved demo result; F7 global stale-data banner; F6 plain-language line plus glossary.

**Phase 3: correctness of what the charts say**
F5 server-side distributions (or labelled uniform sample); F14 chart type scale; F15 click-through from scatter to table.

**Phase 4: responsive and touch**
F1 mobile nav and Globe bottom sheet; F12 44 px targets on coarse pointers (`@media (pointer: coarse)`); F11 table semantics; F13 contrast check (restore the missing `scripts/contrast.mjs` first).

**Phase 5: verify**
Screen-reader pass (NVDA), keyboard-only walk, a real phone, and a re-run of this audit's measurements; add Playwright smoke tests for F1 and F2 so they stay fixed.

Every change must follow [rules.md](rules.md): one component per file, tokens only, no `!important`, and each rejected idea recorded there with a grep.

## 8. Decisions needed before upgrading

1. **Who is the primary user?** The plan above favours the evaluator and learner. If the downstream developer or a mobile-first audience matters more, Phase 4 moves up.
2. **Is a saved demo result acceptable?** It is the fix for F3, but it shows an old run beside a "run fresh" button. It must be labelled clearly to stay consistent with the honesty rule.
3. **Server-side distributions for Analytics (F5)** need a backend change. Is that in scope, or should the frontend sample and label?
4. **The evaluator credential panel (F16):** keep as is for the viva, or hide behind a flag?

## 9. Evidence

Screenshots in [ux_audit/](ux_audit/): [01 login](ux_audit/01-login.png), [02 overview](ux_audit/02-overview.png), [17 object detail](ux_audit/17-overview-detail.png), [05 globe](ux_audit/05-globe-final.png), [14](ux_audit/14-conj-results.png) and [15 conjunction results](ux_audit/15-conj-results-scrolled.png), [08 analytics](ux_audit/08-analytics.png), [09 data](ux_audit/09-data.png), [12 light theme](ux_audit/12-light-conj.png), [11](ux_audit/11-mobile-conj.png) and [18](ux_audit/18-mobile-globe.png) phone.
Note: screenshot 01 was taken before the password was typed, and 14 is a full-page capture of a scroll container, so it cuts off at the viewport; 15 shows the results.

---

## 10. Status after the first upgrade pass (2026-11-06, branch `ui/audit-fixes`)

What was done about each finding, and how it was checked. "Verified" means seen in a real browser or measured; "tested" means a unit or rule test; anything not either is said so.

| # | Finding | Status | How |
|---|---|---|---|
| F1 | Layout broken below ~1000 px | **Fixed** | App bar is two rows under 1100 px; search kept on every width; Globe puts the globe first with its playback bar over its foot. Verified at 390 px (screenshots [04](ux_audit/after-04-mobile-conj.png), [05](ux_audit/after-05-mobile-globe.png)) and no horizontal overflow or clipped tab on all five views by DOM measurement. Not verified: a real phone, the light theme on a phone (the browser window was occluded, so screenshots stopped working; a DOM check passed) |
| F2 | Search destroyed on leaving the view | **Fixed** | State lifted to `Workspace`. Verified: select a point, "Show on globe", return: result and selection intact; a live search keeps running while on another view, shows a "Search running" pill, and its timer stays correct |
| F3 | Time to first result | **Partly** | Skeleton counts instead of `0` on the Globe; honest message while positions compute; a **saved example run** (a real 262 s search, 37 KB, its own chunk) opens the result page instantly and is labelled on every screen. **Not done:** the Globe still takes 20-60 s on first load (needs streaming or a cached first frame, a larger change) |
| F4 | Answer buried under the method | **Fixed** | Answer sentence first ("No critical approaches; 29 high-risk in the next 24 hours"), one caveats box instead of three, method folded after the first run. Verified ([02](ux_audit/after-02-conj-saved.png), [03](ux_audit/after-03-conj-saved-scrolled.png)) |
| F5 | Analytics disagreed with itself | **Fixed for the donut and labelled elsewhere** | Regime donut now uses whole-catalog server counts (LEO 95.0 %, matching the Globe); every other chart says "First 5,000 of 15,970 objects (by name, not a random sample)" in its caption. **Not done:** server-side distributions for the other charts (a backend change) |
| F6 | Jargon with no plain layer | **Fixed in the main places** | Plain paragraph above the method; `GlossaryTerm` (hover and keyboard focus) on SGP4, TLE, Pc, TCA, miss distance. Not every term in the table headers (a focusable tooltip cannot sit inside a sort button) |
| F7 | Stale data not acted on | **Fixed** | One banner with a button to the Data page, dismissible per week of age; row chips are a neutral number. Verified; band logic tested |
| F8 | Copy leaks and errors | **Fixed** | All five lines corrected |
| F9 | `…` placeholders in prose | **Fixed** | "Loading how the search works…" until the numbers arrive |
| F10 | Titles, h1, skip link | **Fixed** | `Conjunctions \| ORCA`; one `h1` per view; skip link; focus moves to the content after a view change. Verified |
| F11 | Table row semantics | **Fixed** | `role="grid"` on selectable tables, Space activates |
| F12 | Small targets | **Fixed for touch** | 44 px (40 small) under `pointer: coarse`. Not measured on a real touch device |
| F13 | Contrast | **Fixed and now enforced** | `npm run contrast` restores the missing script's job: 156 pairs, 7 light-theme pairs were just under 3:1 and were darkened; all pass; a rule test keeps it so |
| F14 | Chart text too large | **Fixed** | Plot capped at 1000 px wide |
| F15 | Scatter points not actionable | **Fixed** | Points are buttons that select the pair (keyboard: Enter or Space). Verified |
| F16 | Evaluator password panel | **Not changed** | Owner's decision |
| F17 | No filter on the Overview table | **Not done** | |
| F18 | Globe legend | **Not done** | `GlobeLegend` is still unused; the filter list carries the colours |
| F19 | Shortcut keys on touch | **Fixed** | Keys hidden on narrow screens; shortcuts button hidden on touch |

**Logo (2026-11-07):** the light theme showed the logo on a dark box, because the one logo file has silver lettering and was put on a dark chip. There is now a second transparent file with dark navy lettering made from the same artwork (`frontend/public/logo-320-light.png`, `logo-640-light.png`); `Brand` renders both and `tokens.css` shows one per theme, so no chip, no filter and no theme logic in the component. Verified in the browser in both themes ([screenshot](ux_audit/after-10-light-logo.png)); the sign-in page stays on the dark artwork because its scene is always dark.

**From the sibling projects' guides** (see `MD/rules.md` sections 10 and 11): rules are now checks (`frontend/src/lib/rules.test.ts`, each mutation-checked: it found four literal colours the earlier manual grep had missed); held keys are ignored; the browser toolbar follows the theme; a missing chunk reloads once instead of blanking the app; the build commit is shown on the Data page.

**Not covered** (same list as before, still true): screen reader, keyboard-only walk of the 3D canvas, a real touch device, text at 1.3x (sizes are in px), the Data page "Fetch" flow.

**Tests:** 116 pass (was 94), `tsc` clean, production build passes, `npm run contrast` 156/156.
