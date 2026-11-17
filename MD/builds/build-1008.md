# Build 1008 (2026-11-17)

Commit `43c2d06` on `main`, from PR #11 (wording by Shaik Saifuddin) with the owner's review fixes.

## What changed (user-visible)
- New wording on every page: Home, the tour, Overview, Globe, Conjunctions, Analytics, Data, Reports, sign-in, API health, the menu, notifications and the term tooltips.
- New wording in generated text: result headlines, the notes under each result (live and saved runs), Ask ORCA replies, summary lines and the PDF report. Dates in long form ("November 6th, 2026 at 18:23"), the search horizon written out ("one (1) day").
- The method notes served by `/api/conjunctions/method`, and the optional AI prompt, use the same wording.
- The collision-probability note now says how Pc is computed: 32-point Gauss-Legendre when the disc is small against the uncertainty, adaptive quadrature otherwise. The earlier text said "closed-form", which the engine never used.
- Ask ORCA and the glossary explain nine more terms: conjunction, report distance, relative velocity, risk tier, screening, epoch, NORAD ID, CelesTrak, orbit regime. Count and data-age questions that name a term still get the live figure ("what is the tle age?" no longer returns the TLE definition).
- Tour cards have at most three sentences each.
- The data-age note counts from each TLE's epoch and stays true for the median it shows ("no more than 3 days" for a 2.4-day median).

## Why
PR #11 rewrote the app's text without changing any figure. The review found a method note that did not match the code, a weakened tour test, and a data-age sentence that could be false after rounding; the owner chose the fixes and kept the wording style.

## Verified how
- On the exact tree pushed: frontend 246/246 tests, type check and production build; backend 134/134 tests.
- No number or threshold changed: the numbers on removed and added lines were compared file by file.
- Backend deploy (GitHub Actions run 44066819703): tests, deploy and health check passed. Vercel reported the frontend deployment complete, and https://orca-vitap.vercel.app answered HTTP 200.

## Not verified
- The new text was not viewed in a browser, on desktop or phone (PR #11 asked to check the Globe clock line and the taller tour cards on a phone).
- The new method note was not read back from the hosted API (it needs a sign-in).

## Next
- Look at the Globe playback bar and the tour on a phone.
- The local branch `ui/design-system-v2` is behind `main`; bring it up to date before further UI work.

## Files
74 files changed, 530 insertions, 429 deletions: `assistant.py`, `conjunction_detection.py`, 45 components (2 molecules, 34 organisms, 9 views), 1 hook and 26 files in `frontend/src/lib` (helpers and their tests). Full list: `git diff --stat 34e0032 43c2d06`.
