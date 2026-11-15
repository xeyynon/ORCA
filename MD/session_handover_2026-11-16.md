# Session handover, 2026-11-15 to 2026-11-16

Where the work stands, what is open, and what to watch for. Details live in the files linked from each line.

## State of the branches (2026-11-16)

| Branch | State |
|---|---|
| `main` | Everything up to pull request #7 (design system v2, the audit and declutter pass, the API health page). |
| `ui/design-system-v2` | Pushed. In PR #9, mergeable: the README back at the root, `.gitignore` for the purged files, the smaller status bar, Vercel Analytics. These notes are committed locally and join PR #9 on the next push. |
| `fix/bug-sweep-2026-10-20` | Pushed with `main` merged in (conflicts resolved). In PR #8, mergeable. 133 Python and 242 frontend tests passed on the merge. |
| `frontendimprovements` | PR #3, old and unreviewed. |

Every commit ID changed on 2026-11-15 (history purge, below). IDs quoted in notes written before then no longer resolve.

## Done this session

- **Declutter pass on every page** ([declutter_plan_2026-11-15.md](declutter_plan_2026-11-15.md)): Conjunctions 4,783 to 2,056 px (25 rows a page, pair card beside the table), Overview 8,873 to 2,004 px (three KPI cards, 50 rows a page), Analytics without its KPI row and with the scope said once, Home with three KPI cards and the API state folded into Data quality, Data centred with developer details folded.
- **API health page** (`#/health`, opened from Data): the answer first, server and database facts in words, the raw JSON folded with Copy and Open.
- **Catalogue comparison** drawn as a read-only line with the rank in words (it looked like slider knobs).
- **Status bar** 22 px tall (was 28) with 11 px values, on every page.
- **Removed:** `SavedRunBanner`, `SystemStatus`, the Overview regime donut; earlier `Breadcrumbs`, `BentoGrid`, `BentoTile`.
- **README** back at the repository root so GitHub shows it; preview of six pages; report figures retaken from a live search (`snapshots/14-report-figures-2026-11-15/`).
- **History purge:** `final.png`, `demo.gif`, `Video Project 1.mp4` removed from every branch and the tag, force-pushed (DECISIONS.md). Backup bundle and the files are outside the repo, in `../ORCA-backup-before-purge-2026-11-15.bundle` and `../ORCA-removed-files/`.
- **Hosted site:** the evaluator login panel is live and its details sign in ([deployment.md](deployment.md), last section). The hosted `admin` password was reset on the VM for this, so it is public by design.
- **Vercel Web Analytics** added (`frontend/src/PageAnalytics.tsx`); it counts once it reaches `main` and Analytics is enabled in the Vercel project.

## Open, in order

1. Merge PR #9 and PR #8 (owner's call). After #9, enable Analytics in Vercel (project `orca` > Analytics).
2. **The hosted site shows 19 objects** because the VM fetches Celestrak's `stations` group (`ORCA_TLE_GROUP=stations` in `deploy/.env` on the VM, chosen for the 1 GB VM). The full catalogue means `active` on this VM (slow, conjunction searches very long) or the free A1 VM ([deployment.md](deployment.md), limits).
3. **Phone Globe:** an open conjunction's bottom sheet cannot be dismissed (TASKS.md).
4. Not checked after the declutter pass: 820 and 1920 px, the light theme on Home, Analytics and Reports, the Analytics view when only part of the catalogue loads.
5. The Word reports (`ORCA Final Report.docx`, `Fina Report ORCA.docx`) still hold the old figures; the new ones are in `snapshots/14-report-figures-2026-11-15/`.
6. GitHub can still serve the purged files through the old pull-request pages until GitHub Support clears them; the upstream `lalit2121/STELLA…` repository still has the video and GIF.
7. The VM says "System restart required" (pending Ubuntu updates). A restart takes the hosted API offline for a minute or two; do it on purpose.
8. `npm audit` reports issues in the frontend's dependencies; not looked at.

## Watch out for

- A Vercel redeploy after changing a variable must untick **"Use project's Ignore Build Step"**, or the build is skipped and the variable never reaches the site. Vercel also asks for the two-factor code.
- `auth.py set-password` runs **on the VM**, inside the container (`ssh -i ~/.ssh/orca_oracle ubuntu@129.159.230.127`, then `cd ~/ORCA/deploy && sudo docker compose exec orca python auth.py set-password`). Run on Windows it fails.
- `ORCA_COMPLETE_MASTER.md` carries an owner edit (the faculty guide's name, "Ashish Kumar Dalai") that was committed with this session's notes.
