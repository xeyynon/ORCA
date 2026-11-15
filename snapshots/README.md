# UI snapshots

Every screenshot taken while auditing and upgrading the ORCA interface, kept so it is clear what changed and when.
Each folder is one milestone; captions say what the picture shows. Pictures were taken in a real browser against the local dev server and the real catalog (15,970 objects).

Rule from here on: each UI milestone adds a folder in the same sitting (`MD/rules.md` §11).

## 01-audit-before-2026-11-06

| File | What it shows |
|---|---|
| [01-login-desktop-dark.png](01-audit-before-2026-11-06/01-login-desktop-dark.png) | Sign-in page, desktop, dark (before the password was typed) |
| [02-overview-desktop-dark.png](01-audit-before-2026-11-06/02-overview-desktop-dark.png) | Overview: KPIs and table with an amber/red age chip on every row |
| [03-globe-loading-desktop-dark.png](01-audit-before-2026-11-06/03-globe-loading-desktop-dark.png) | Globe while positions load: spinner card, every band count reads 0 |
| [04-globe-loaded-desktop-dark.png](01-audit-before-2026-11-06/04-globe-loaded-desktop-dark.png) | Globe once positions arrived |
| [05-conjunctions-idle-desktop-dark.png](01-audit-before-2026-11-06/05-conjunctions-idle-desktop-dark.png) | Conjunctions before a search: "every ... s" placeholders in the prose |
| [06-conjunctions-running-desktop-dark.png](01-audit-before-2026-11-06/06-conjunctions-running-desktop-dark.png) | A search running: honest elapsed time, method panel open |
| [07-conjunctions-after-leaving-desktop-dark.png](01-audit-before-2026-11-06/07-conjunctions-after-leaving-desktop-dark.png) | Back on Conjunctions after pressing 4 then 3: the running search was gone |
| [08-conjunctions-result-top-desktop-dark.png](01-audit-before-2026-11-06/08-conjunctions-result-top-desktop-dark.png) | Result: two warning boxes and the method before any answer (full-page capture of a scroll container, so it is cut) |
| [09-conjunctions-result-scrolled-desktop-dark.png](01-audit-before-2026-11-06/09-conjunctions-result-scrolled-desktop-dark.png) | Result scrolled: risk tiers, Pc scatter with 16 px axis text, the table |
| [10-analytics-desktop-dark.png](01-audit-before-2026-11-06/10-analytics-desktop-dark.png) | Analytics: charts from the first 5,000 objects (LEO 86.3 %, the Globe says 94.6 %) |
| [11-data-desktop-dark.png](01-audit-before-2026-11-06/11-data-desktop-dark.png) | Data page |
| [12-overview-object-detail-desktop-dark.png](01-audit-before-2026-11-06/12-overview-object-detail-desktop-dark.png) | Overview with an object selected |
| [13-conjunctions-light.png](01-audit-before-2026-11-06/13-conjunctions-light.png) | Light theme, search running |
| [14-conjunctions-phone-390.png](01-audit-before-2026-11-06/14-conjunctions-phone-390.png) | Phone 390 px: nav tabs, icons and Sign out overlap |
| [15-globe-phone-390.png](01-audit-before-2026-11-06/15-globe-phone-390.png) | Phone 390 px: panels and the playback bar pile onto the globe |

## 02-upgrade-pass-1-2026-11-06

| File | What it shows |
|---|---|
| [01-conjunctions-idle-desktop-dark.png](02-upgrade-pass-1-2026-11-06/01-conjunctions-idle-desktop-dark.png) | Stale-data banner (first version), glossary terms, "Explore a saved example run" |
| [02-conjunctions-saved-run-desktop-dark.png](02-upgrade-pass-1-2026-11-06/02-conjunctions-saved-run-desktop-dark.png) | Saved example run: labelled, answer sentence first |
| [03-conjunctions-result-scrolled-desktop-dark.png](02-upgrade-pass-1-2026-11-06/03-conjunctions-result-scrolled-desktop-dark.png) | One caveats box, scatter text back to normal size |
| [04-conjunctions-phone-390.png](02-upgrade-pass-1-2026-11-06/04-conjunctions-phone-390.png) | Phone 390 px: two-row app bar, nothing overlaps |
| [05-globe-phone-390.png](02-upgrade-pass-1-2026-11-06/05-globe-phone-390.png) | Phone 390 px: globe first, playback bar over its foot, selection below |
| [06-overview-desktop-dark.png](02-upgrade-pass-1-2026-11-06/06-overview-desktop-dark.png) | Overview: neutral age numbers instead of chips |
| [07-analytics-desktop-dark.png](02-upgrade-pass-1-2026-11-06/07-analytics-desktop-dark.png) | Analytics: scope caption on each chart, regime donut over all 15,970 |
| [08-login-phone-390.png](02-upgrade-pass-1-2026-11-06/08-login-phone-390.png) | Sign-in page on a phone |

## 03-leftovers-menu-logo-2026-11-07

| File | What it shows |
|---|---|
| [01-overview-light-transparent-logo.png](03-leftovers-menu-logo-2026-11-07/01-overview-light-transparent-logo.png) | Light theme: the logo is transparent (dark navy file), no dark chip |
| [02-header-menu-open-desktop-dark.png](03-leftovers-menu-logo-2026-11-07/02-header-menu-open-desktop-dark.png) | Header controls merged into one hamburger menu; Overview filter bar |
| [03-globe-legend-desktop.png](03-leftovers-menu-logo-2026-11-07/03-globe-legend-desktop.png) | Globe legend mounted bottom-left (taken by the Globe worker) |
| [04-globe-legend-phone.png](03-leftovers-menu-logo-2026-11-07/04-globe-legend-phone.png) | Globe legend on a phone (taken by the Globe worker) |
| [05-logo-light-variant-preview.png](03-leftovers-menu-logo-2026-11-07/05-logo-light-variant-preview.png) | The generated dark-navy logo on the light background |

## 04-quiet-notices-2026-11-07

| File | What it shows |
|---|---|
| [01-overview-flat-banner-light.png](04-quiet-notices-2026-11-07/01-overview-flat-banner-light.png) | Stale-data notice as a flat one-line strip |
| [02-conjunctions-quiet-callouts-light.png](04-quiet-notices-2026-11-07/02-conjunctions-quiet-callouts-light.png) | Saved-run note and caveats with no tint or icon |

Not kept: two captures that only show the throttled browser (a stalled frame) and duplicates of the ones above.

## 05-mission-control-2026-11-07

| File | What it shows |
|---|---|
| [01-home-desktop-light.png](05-mission-control-2026-11-07/01-home-desktop-light.png) | Mission control (bento): hero story tile, freshness, conjunctions (saved example labelled), globe entry |
| [02-home-desktop-dark-scrolled.png](05-mission-control-2026-11-07/02-home-desktop-dark-scrolled.png) | Dark theme, lower tiles: orbit regimes, system, New here? with the tour and glossary |
| [03-home-compact-desktop-dark.png](05-mission-control-2026-11-07/03-home-compact-desktop-dark.png) | After "tiles are unnecessarily big": three rows, less padding, smaller story type, smaller globe art; the whole page fits one laptop screen |

## 06-home-hook-2026-11-07

After the owner: "too much clutter; a newcomer has no hook and will leave". The home is rebuilt in story order: hook, how it works, right now.

| File | What it shows |
|---|---|
| [01-home-hook-desktop-dark.png](06-home-hook-2026-11-07/01-home-hook-desktop-dark.png) | The hook: one true sentence as the h1, the pair count from the labelled stored run, two actions, the orbit animation; three steps below |
| [02-home-hook-phone-390-dark.png](06-home-hook-2026-11-07/02-home-hook-phone-390-dark.png) | Phone: animation first, then the sentence and both actions on the first screen (taken before the nav-row fix: tabs now scroll instead of overlapping) |
| [03-home-one-screen-1366x768-dark.png](06-home-hook-2026-11-07/03-home-one-screen-1366x768-dark.png) | After "can we see it all without scrolling": hook, steps and facts on one screen at 1366x768 (measured to fit at 1280x720 to 1920x1080; the animation clipping visible here was fixed after) |

## 07-ask-orca-glass-gestures-2026-11-07

| File | What it shows |
|---|---|
| [01-ask-orca-groq-answer-desktop-dark.png](07-ask-orca-glass-gestures-2026-11-07/01-ask-orca-groq-answer-desktop-dark.png) | Ask ORCA: a why-question answered by Groq (openai/gpt-oss-120b), labelled AI with the may-be-wrong note and the facts it was given |
| [02-pair-prev-next-desktop-dark.png](07-ask-orca-glass-gestures-2026-11-07/02-pair-prev-next-desktop-dark.png) | Conjunction pair detail with Previous / Next and N of M (the button equivalent of the swipe gesture); breadcrumb shows the pair |
| [03-globe-glass-bar-legend-desktop-dark.png](07-ask-orca-glass-gestures-2026-11-07/03-globe-glass-bar-legend-desktop-dark.png) | Globe: glass only on the playback bar and the legend, data panels solid |
| [04-globe-desktop-light.png](07-ask-orca-glass-gestures-2026-11-07/04-globe-desktop-light.png) | Globe in the light theme (glass alpha raised to 0.99 there for contrast) |
| [05-globe-bottom-sheet-collapsed-phone.png](07-ask-orca-glass-gestures-2026-11-07/05-globe-bottom-sheet-collapsed-phone.png) | Phone: selection details in a bottom sheet, collapsed |
| [06-globe-bottom-sheet-expanded-phone.png](07-ask-orca-glass-gestures-2026-11-07/06-globe-bottom-sheet-expanded-phone.png) | Phone: the sheet dragged up (a button does the same), playback bar still reachable |

## 08-top-bar-2026-11-07

The owner's three-section top bar: logo left, views centred, search and utilities right.

| File | What it shows |
|---|---|
| [01-top-bar-desktop-dark.png](08-top-bar-2026-11-07/01-top-bar-desktop-dark.png) | Logo alone at the left; six icon+label views centred (offset 0 px measured), blue underline on the active one; search, notifications (1 real notice), help, account at the right. Conjunctions icon replaced after this shot |
| [02-search-open-before-fix.png](08-top-bar-2026-11-07/02-search-open-before-fix.png) | Search open, BEFORE the fix: the field covered the Data tab and the results drew behind the hero. Fixed: the field is capped to the right section and the bar is layered above the page (measured clear of the nav at 1180-1920 px) |
| [03-top-bar-phone-390.png](08-top-bar-2026-11-07/03-top-bar-phone-390.png) | Phone: logo and four icons on the first row, views with icons scroll on the second |
| [04-sketch-capsules-dark.png](08-top-bar-2026-11-07/04-sketch-capsules-dark.png) | Rebuilt to the owner's sketch: logo capsule on the left edge, views hanging from the top, search + hamburger capsule on the right edge; one 28 px centreline measured |
| [05-hamburger-open.png](08-top-bar-2026-11-07/05-hamburger-open.png) | The one hamburger: signed in as, notifications (1 real), help (Ask ORCA, shortcuts, tour), theme, sign out |
| [06-search-capsule.png](08-top-bar-2026-11-07/06-search-capsule.png) | Search opens as a capsule of the same shape with a borderless field, growing left, clear of the views |
| [07-bar-light.png](08-top-bar-2026-11-07/07-bar-light.png) | Light theme: three white shapes on the grey page (ring on the search icon is focus returning after Esc) |
| [08-bar-phone-390.png](08-top-bar-2026-11-07/08-bar-phone-390.png) | Phone: both capsules on the first row, the views as a scrolling band below |

## 09-home-page-2026-11-07

| File | What it shows |
|---|---|
| [01-home-no-home-tab-1440.png](09-home-page-2026-11-07/01-home-no-home-tab-1440.png) | No Home tab: five views in the bar, the logo goes home. The Earth is centred in the hero (0 px off, measured at 1280x720 to 1920x1080 and on a phone); the three sections share the same edges (130 to 1310 px) |
| [02-home-1366x768.png](09-home-page-2026-11-07/02-home-1366x768.png) | 1366x768: still one screen, Earth centred |

## 10-home-redesign-2026-11-07

Second pass on the home page: the hero is the page's front (MD/design_system_v2.md §5.1).

| File | What it shows |
|---|---|
| [01-before-1440.png](10-home-redesign-2026-11-07/01-before-1440.png) | BEFORE: three look-alike cards, a 240 px Earth in a half-empty column, small buttons, an empty band at the bottom |
| [02-after-1440x900.png](10-home-redesign-2026-11-07/02-after-1440x900.png) | AFTER: the hero on the page itself, a 400 px Earth on a glow and orbit ring, 42 px actions, three big live figures, a light three-step strip, one line of fine print; one screen |
| [03-after-1920x1080.png](10-home-redesign-2026-11-07/03-after-1920x1080.png) | 1080p: the Earth drawn at 480 px, the group centred in the height (106 px above and below, measured) |
| [04-after-1280x720.png](10-home-redesign-2026-11-07/04-after-1280x720.png) | 1280x720: still one screen, no scroll (measured) |
| [05-after-light.png](10-home-redesign-2026-11-07/05-after-light.png) | Light theme |
| [06-after-phone-390.png](10-home-redesign-2026-11-07/06-after-phone-390.png) | Phone: full-width actions, the figures as rows (figure left, words right), the steps stacked |
| [07-stat-hover.png](10-home-redesign-2026-11-07/07-stat-hover.png) | Hovering a figure: a neutral state layer and an arrow, the whole figure is the button to its view |

## 11-command-centre-home-2026-11-07

The owner's "Space Command Centre" brief (MD/ORCA_Homepage_Redesign_Context.md), built as written with the number kept as the headline (MD/design_system_v2.md §5.2).

| File | What it shows |
|---|---|
| [01-hero-kpis-1440.png](11-command-centre-home-2026-11-07/01-hero-kpis-1440.png) | Mission overview (60/40, medium Earth, Explore Globe / View Conjunctions, data snapshot line) and the four KPI cards, each naming its run |
| [02-approaches-panels-status-1440.png](11-command-centre-home-2026-11-07/02-approaches-panels-status-1440.png) | The five worst approaches from the stored example run (real rows, provenance under the table), orbit regimes beside data quality, system status |
| [03-1920.png](11-command-centre-home-2026-11-07/03-1920.png) | 1080p: the Earth drawn at 400 px |
| [04-phone-top.png](11-command-centre-home-2026-11-07/04-phone-top.png) | Phone: text first, then a smaller Earth (spec §7) |
| [05-phone-kpis-table.png](11-command-centre-home-2026-11-07/05-phone-kpis-table.png) | Phone: KPIs in two columns; the table scrolls inside its own box, the page does not |
| [06-phone-panels.png](11-command-centre-home-2026-11-07/06-phone-panels.png) | Phone: the two panels stacked |
| [07-light-1440.png](11-command-centre-home-2026-11-07/07-light-1440.png) | Light theme, top |
| [08-light-lower.png](11-command-centre-home-2026-11-07/08-light-lower.png) | Light theme: table, panels, status |

## 12-reports-2026-11-07

The Reports view (MD/design_system_v2.md §6).

| File | What it shows |
|---|---|
| [01-reports-1440.png](12-reports-2026-11-07/01-reports-1440.png) | Six views in the bar (nav still centred, 0 px off); the builder on the left, the A4 preview on the right |
| [02-pair-analysis-preview.png](12-reports-2026-11-07/02-pair-analysis-preview.png) | The single pair analysis in the preview |
| [03-phone-builder.png](12-reports-2026-11-07/03-phone-builder.png) | Phone: the builder first |
| [04-phone-preview.png](12-reports-2026-11-07/04-phone-preview.png) | Phone: the preview keeps its paper width and scrolls sideways in its own frame; the page does not |
| [05-reports-light.png](12-reports-2026-11-07/05-reports-light.png) | Light theme: the paper is the same white in both themes |
| [06-sample-report.pdf](12-reports-2026-11-07/06-sample-report.pdf) | A generated report (all four sections, stored example run): 3 A4 pages, each with the marking and a page number. (The copy pushed before 2026-11-07 21:15 was mistakenly the screen layout: the test browser was left forced to screen media.) |
| [07-header-marking.png](12-reports-2026-11-07/07-header-marking.png) | The report opens with its handling marking, EDUCATIONAL USE ONLY · NOT FOR OPERATIONAL DECISIONS, in centred spaced capitals, the way official documents mark their use. No box, no tint, no side stripe (rules.md §11.21) |
| [08-printed-page-2.png](12-reports-2026-11-07/08-printed-page-2.png) | A printed page: the marking at the head of every page, the table header repeated after a page break, "Page 2 of 3" at the foot |

## 13-polish-2026-11-15

After the 2026-11-15 audit's polish pass (MD/ux_audit_2026-11-15.md §9). The "before" set is MD/ux_audit/2026-11-15/.

| File | What it shows |
|---|---|
| [01-home-1440.png](13-polish-2026-11-15/01-home-1440.png) | Headline dated and in the past tense on the stale catalogue; no kicker, no glow |
| [02-overview-1440.png](13-polish-2026-11-15/02-overview-1440.png) | 22 px page title; regime as plain text; the count line above the table |
| [03-analytics-1440.png](13-polish-2026-11-15/03-analytics-1440.png) | Chart titles as headings with visible notes; "2,211 km", "61.6°"; one-band freshness said in words; neutral constellation bars |
| [04-conjunctions-1440.png](13-polish-2026-11-15/04-conjunctions-1440.png) | No info icon on notes; the method in two columns |
| [05-data-1440.png](13-polish-2026-11-15/05-data-1440.png) | "TLE 36.6 d old" as dot + word; "Succeeded"; the real API origin |
| [06-globe-1440.png](13-polish-2026-11-15/06-globe-1440.png) | Colour key only in the side panels; the disabled switch says why; "Live" as dot + word |
| [07-overview-390.png](13-polish-2026-11-15/07-overview-390.png) | Phone: all six tabs fit (inactive icon-only); KPIs in two columns |
| [08-globe-390.png](13-polish-2026-11-15/08-globe-390.png) | Phone: compact colour key over the globe |
| [09-home-approaches-1440.png](13-polish-2026-11-15/09-home-approaches-1440.png) | The run window and "That window ended 7 days ago"; TCAs marked past; Pc as 2.83 × 10⁻⁵; risk as dot + word |
| [10-signin-1440.png](13-polish-2026-11-15/10-signin-1440.png) | Sign-in keeps its animated debris scene and glass card (owner-approved exception, DECISIONS.md 2026-11-15); the disabled button says why; "Use these details" replaces the icon on the divider |
| [11-signin-390.png](13-polish-2026-11-15/11-signin-390.png) | The same on a phone |
| [12-ask-button-1440.png](13-polish-2026-11-15/12-ask-button-1440.png) | Ask ORCA up front: a labelled button beside search (owner, 2026-11-15), no longer a menu row; pressed while the panel is open |
| [13-ask-button-390.png](13-polish-2026-11-15/13-ask-button-390.png) | Phone: the same as a 44 px icon button |
| [14-home-api-down.png](13-polish-2026-11-15/14-home-api-down.png) | API down (requests blocked in a test tab): Home says so on its first screen and the headline is dated, not "right now"; both clear by themselves when the API answers |
| [15-globe-constellation-1440.png](13-polish-2026-11-15/15-globe-constellation-1440.png) | Globe coloured by constellation (owner's choice): Starlink, OneWeb, Kuiper, Qianfan, Other, keyed in the legend |
| [16-globe-decluttered-1440.png](13-polish-2026-11-15/16-globe-decluttered-1440.png) | Globe decluttered (owner: "too congested"): one quiet side panel instead of three cards; conjunction-only controls appear only with a conjunction; the not-drawn count joins the drawing line |
| [17-globe-panel-hidden-1440.png](13-polish-2026-11-15/17-globe-panel-hidden-1440.png) | The side panel hidden ("‹" on the panel, "› Panel" to bring it back): the globe gets the whole width |
| [18-globe-legend-right-1440.png](13-polish-2026-11-15/18-globe-legend-right-1440.png) | The drawing line moved right (owner): stacked just above the playback bar, same right edge |
| [19-globe-details-above-foot.png](13-polish-2026-11-15/19-globe-details-above-foot.png) | Fix: selection details stop above the drawing line and playback bar at any height (the stack is measured), instead of running under them |
| [22-statusbar-1440.png](13-polish-2026-11-15/22-statusbar-1440.png) | Status bar: health on the left (API, data age as the median, refreshed-ago; one click opens Data; no repeated object count), camera and clock on the right |
| [23-globe-no-breadcrumbs-1440.png](13-polish-2026-11-15/23-globe-no-breadcrumbs-1440.png) | No breadcrumb strip (owner): the conjunction card already names the pair and closes it; the card fits without scrolling |
| [21-globe-conjunction-no-scroll-1440.png](13-polish-2026-11-15/21-globe-conjunction-no-scroll-1440.png) | Conjunction card without scrolling (owner): one card instead of two, facts in two columns, the reason in place of a greyed button, the legend in rows; measured to fit at 1920x1080, 1440x900, 1366x768 and 1280x720 |
| [20-globe-conjunction-1280x720.png](13-polish-2026-11-15/20-globe-conjunction-1280x720.png) | The same at 1280x720 |
| [24-globe-floating-statusbar-1440.png](13-polish-2026-11-15/24-globe-floating-statusbar-1440.png) | All status readings in one line on the left; on the Globe the bar floats at the bottom left and the legend and playback bar drop into the freed bottom-right corner (owner) |
| [25-globe-controls-hidden-1440.png](13-polish-2026-11-15/25-globe-controls-hidden-1440.png) | Legend and playback hidden (owner): a pill keeps the simulated time and Live / Paused / Playing on screen; click it to bring them back |
| [26-globe-controls-shown-1440.png](13-polish-2026-11-15/26-globe-controls-shown-1440.png) | Shown: the hide control ("⌄") at the top right of the legend and playback stack |
| [27-globe-under-topbar-1440.png](13-polish-2026-11-15/27-globe-under-topbar-1440.png) | No band behind the top bar on the Globe (owner): the globe runs under it and the three capsules float over space |

## 14-declutter-2026-11-15

Every page after the declutter pass (`MD/declutter_plan_2026-11-15.md`); the "before" shots are in `MD/ux_audit/2026-11-15-declutter/`. All 1440 px, dark, unless named.

| File | What it shows |
|---|---|
| [after-home.png](14-declutter-2026-11-15/after-home.png) | Three KPI cards; API state as the last row of Data quality; no System status section |
| [after-overview.png](14-declutter-2026-11-15/after-overview.png) | Three KPI cards, 50 rows a page, no regime donut |
| [after-overview-selected.png](14-declutter-2026-11-15/after-overview-selected.png) | An object open: the card column stays in view |
| [after-overview-light.png](14-declutter-2026-11-15/after-overview-light.png) | Light theme; "Compared with the catalog" as a read-only line with the rank in words |
| [after-object-standing.png](14-declutter-2026-11-15/after-object-standing.png) | The comparison close up (was slider knobs) |
| [after-conjunctions-idle.png](14-declutter-2026-11-15/after-conjunctions-idle.png) | Before a search: one-line run-time note |
| [after-conjunctions-result.png](14-declutter-2026-11-15/after-conjunctions-result.png) | Saved run, a pair open: caveats hold the saved-run note, 25 rows a page, the pair card beside the table |
| [after-conjunctions-360.png](14-declutter-2026-11-15/after-conjunctions-360.png) | 360 px: the pager and the card stacked under the table |
| [after-analytics.png](14-declutter-2026-11-15/after-analytics.png) | No KPI row; scope in the subtitle only; one-line notes |
| [before-data-1440.png](14-declutter-2026-11-15/before-data-1440.png) | Data before: cards hugging the left (owner) |
| [after-data-1440.png](14-declutter-2026-11-15/after-data-1440.png) | Data centred with its title; API under "For developers" |
| [after-data-360.png](14-declutter-2026-11-15/after-data-360.png) | Data at 360 px |
| [after-health.png](14-declutter-2026-11-15/after-health.png) | The API health page (owner: a page instead of raw JSON) |
| [health-1440.png](14-declutter-2026-11-15/health-1440.png) | The same with "Raw response (JSON)" open: copy, open /health, API docs |
| [after-health-light.png](14-declutter-2026-11-15/after-health-light.png) | Light theme |
| [after-health-offline.png](14-declutter-2026-11-15/after-health-offline.png) | The API blocked: "The API is not answering", the error, the last good response kept |
| [after-reports.png](14-declutter-2026-11-15/after-reports.png) | Reports: the builder no longer repeats the run line |
