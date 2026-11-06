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
