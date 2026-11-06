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
