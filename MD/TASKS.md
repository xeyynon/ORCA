# TASKS.md

Backlog and status tracking. Not a changelog — see `git log` for history and
[DECISIONS.md](DECISIONS.md) for the reasoning behind changes already made.

## Status legend

`[ ]` open · `[~]` in progress · `[x]` done

---

## Open: UI/UX polish pass from the 2026-11-15 audit

Source: [ux_audit_2026-11-15.md](ux_audit_2026-11-15.md) (finding numbers in brackets). Order follows the playbook's fix order (spacing, colour, icons, copy, type, layout, details, motion). Each step is fixed as a class, gets a check where one is possible, and leaves before/after screenshots in `snapshots/13-polish-2026-11-15/`.

- [x] **1. Honesty (#1, #2).** Home headline in the past tense with the catalogue date when the data is stale; the close-approach preview says its window and that it has passed, TCAs marked past.
- [x] **2. Status without fills (#3, #11).** `Badge` becomes dot + word (no tinted box): risk, TLE age, LIVE; regime as plain text; Globe chrome elevation by shadow only. Check: rules test bans a filled badge.
- [x] **3. Icons and glyphs (#4, #7).** No circled "i" on footnotes (`FieldNote`, sign-in, Globe); every typed arrow/caret (→ ← › ▲ ▼) becomes an SVG icon. Check: rules test bans typed arrow glyphs in components.
- [x] **4. Copy and numbers (#5, P2).** One `Pc` atom (superscript exponent, true minus) everywhere incl. tier thresholds; thousands separators on Analytics; degree sign attached; "108 objects"; "Succeeded" instead of "ok"; the real API origin instead of "same origin".
- [x] **5. Type (#6, #8, #12).** One page-title size (22 px); a heading on Globe; one h1 on Reports; 11 px floor for labels and badges; section and chart titles in sentence case; no kicker above the Home h1. Checks: every view has exactly one h1; no component font-size under 11 px.
- [x] **6. Layout (P2).** Overview: one count line above the table and "Show next 250"; phone KPIs in two columns. Globe: altitude bands listed once; phone legend collapsed. Conjunctions: method in two columns with a tier table. Analytics: freshness says "all stale" in words when it is one bar; constellation labels fit; constellation bars not in regime colours. Phone tab row gets a fade cue.
- [x] **7. Details (#9).** 24 px hit areas on desktop (sort headers, text links); disabled Globe switches say why; sign-in: real primary button, labelled "Use these details".
- [x] **8. Decoration (#10).** Home glow and kicker removed (step 5); the Home Earth plays its collision once and rests. The sign-in scene stays: approved exception, see DECISIONS.md 2026-11-15.
- [x] **Follow-up round:** risk KPI emphasis, horizon label, phone status bar, Data column, plurals, 320 px tabs (audit §10).
- [x] Home: a connection-lost cue on the first screen when the API stops answering (audit §10): a flat red-dot strip and a dated headline; both clear when the API answers.
- [x] Globe colouring: owner chose a third "Constellation" mode (Starlink, OneWeb, Kuiper, Qianfan, Other; same naming rule as Analytics). Altitude stays the default.
- [x] Globe decluttered (owner, 2026-11-15): one side panel, conjunction-only controls shown only with a conjunction, not-drawn count in the legend line, a remembered "hide panel".
- [ ] Screen-reader pass and a real touch device.
- [ ] Phone Globe: an open conjunction's bottom sheet has Expand but no close, so it cannot be dismissed (found 2026-11-15; owner will check on a phone later).

## Done

- [x] Fix `dashboard.py` hardcoded absolute DB path crashing every page load.
      (DECISIONS.md, 2026-08-18)
- [x] Fix dead Celestrak `last-30-days` group (404) → `active`.
      (DECISIONS.md, 2026-08-18)
- [x] Document Windows `PYTHONIOENCODING=utf-8` requirement for ingestion.
      (DECISIONS.md, AGENTS.md, ARCHITECTURE.md, 2026-08-18)
- [x] Verify API server end-to-end: TLE list, propagation, conjunction search,
      statistics all return real data against a seeded catalog.
- [x] Verify dashboard boots clean (`/_stcore/health` → `ok`) after the DB-path fix.
- [x] Author PRD.md, ARCHITECTURE.md, AGENTS.md, DECISIONS.md, TASKS.md.

- [x] Conjunction search starts at the current time instead of the first TLE epoch
      (DECISIONS.md, 2026-10-03). Regression test in `tests/test_search_start.py`
      (`python -m unittest discover -s tests`).

- [x] A failed Celestrak fetch is reported (`last_fetch` in `/health`, Data view) and no
      longer stamps `last_update`. Non-ASCII prints removed from the parser.
      Streamlit binds to 127.0.0.1. (DECISIONS.md, 2026-10-03)

- [x] Conjunction engine v2 (2026-10-15, branch `fix/honest-conjunctions`, DECISIONS.md):
      - SGP4 everywhere (`SGP4Propagator` is now real SGP4);
      - 20 s gap-free screening;
      - exact TCA;
      - Foster Pc with a measured, ESA-floored uncertainty model;
      - long encounters flagged;
      - an honest Conjunctions page.

      Validated against the benchmark reference. See conjunction_engine_v2.md.
- [x] `GET /api/propagate/{id}` uses SGP4 and returns 422 when SGP4 refuses an element set.
- [x] Benchmark study of the original engine (`benchmarks/`, results in `benchmarks/results/`),
      with the original frozen at tag `orca-as-built-2026-10-14` and in `benchmarks/legacy/`.
- [x] Evaluator access panel on the sign-in page (`VITE_EVALUATOR_*` in `frontend/.env.local`).

## Open — release

- [ ] **Merge `fix/honest-conjunctions` into `main` and push.** This deploys v2. The
      `/api/conjunctions` response changed shape, so the backend and frontend must deploy
      together; one push to `main` does both. Needs the owner's go-ahead.
- [x] Hosted site shows the evaluator login (owner, 2026-11-16): `VITE_EVALUATOR_*` set in Vercel, hosted password reset to match; checked: the panel's details sign in.
- [x] Update the screenshots in `docs/screenshots/` (2026-11-15: all six pages, after the declutter pass).

## Open — accuracy

- [ ] Take a catalog snapshot daily for about a week
      (`powershell -ExecutionPolicy Bypass -File benchmarks\refresh_measured.ps1`). This fills the
      1–5 day gap in the measured uncertainty. Then copy the new bins into
      `CovarianceModel.MEASURED` in `conjunction_detection.py`.
- [ ] Split the error measurement by altitude band, eccentricity and TLE age.
- [ ] Validate screening against the public TraCSS answer key (Auman et al. 2025).
- [ ] Starlink: compare against CelesTrak's operator-derived SupGP elements.
- [ ] Long encounters: a 3D Pc (Coppola 2012) instead of only flagging them.

## Open — paper (paper/, MD/paper_draft.md)

- [ ] Choose the conference; adapt `paper/main.tex` to its template and page rules
      (currently 6 pages, IEEE two-column).
- [ ] Fill in authors' department, university and e-mails (TODO in `main.tex`); confirm the author order.
- [ ] Check the 4 SECONDARY references in a library: Foster & Estes 1992, Alfano & Negron 1993,
      the smart-sieve paper (2002), and COVGEN's pages.
- [ ] Archive the TLE snapshots (`benchmarks/data/*.tle`, git-ignored) somewhere citable, and cite
      their sha256 values.

## Open — reliability

- [x] `/api/export/conjunctions` no longer writes to `/tmp` (per-request temp dir, cleaned up, runs off the event loop, UTF-8 files). `tests/test_export.py`.
- [x] Fetch cooldown on `POST /api/update-tles` (429, `ORCA_FETCH_COOLDOWN_S`, default 300 s).
- [x] Leftover `last-30-days` callers moved to `active`; the Streamlit Fetch button used the checked fetch (Streamlit later removed).
- [ ] Decide whether the in-memory `_conjunction_cache` / `_analytics_cache`
      referenced in `api_server.py` (per README.md) should be wired up or
      removed — currently declared but unused.
- [ ] A conjunction search takes minutes, and Cancel only stops the browser waiting. Consider a
      job endpoint with progress and server-side cancel.

## Open — verification / testing

- [x] Automated tests exist:
      - 89 Python tests (`python -m unittest discover -s tests`): engine, SGP4,
        Pc, auth, export, fetch status, catalog, search window, benchmarks;
      - 89 frontend tests (`cd frontend && npm test`).
- [ ] Still missing: unit tests for `TLEParser._parse_bstar` (compressed
      exponential notation is a known historical bug source) and for the
      units-contract boundary between `TLE.inclination` (degrees) and
      `OrbitalElement.i` (radians).
- [~] CI: `.github/workflows/deploy-backend.yml` runs the Python tests before
      every backend deploy (2026-10-08). Still missing: frontend `npm test` /
      `npm run typecheck` in CI, and a live "fetch `stations`, assert non-empty"
      smoke test.
- [~] Click through all five frontend views in a real browser.
      - Done 2026-10-15: the sign-in page and the Conjunctions view (search,
        table, detail card), driven in headless Chrome. Screenshots caught and
        fixed three UI bugs.
      - Still to do: Overview, Globe, Analytics and Data.

## Open — product direction (see PRD.md §9 Open Questions)

- [ ] Decide the intended default demo configuration (catalog size, time
      horizon) balancing realism against conjunction-search latency.
- [x] Hosted single-operator deployment (2026-10-08): Vercel + Oracle Always
      Free VM + GitHub Actions, at no cost. See deployment.md and DECISIONS.md.
- [ ] Multi-user hosting stays out of scope unless decided otherwise: it would
      need per-user accounts and a concurrent-safe datastore (SQLite by direct
      import has one writer — ARCHITECTURE.md §3).

## Open — hosting

- [ ] Move the backend to an Oracle A1 VM (2 OCPU / 12 GB, free) when
      Hyderabad has capacity, then switch `ORCA_TLE_GROUP` to `active`.
      Steps: deploy/ORACLE.md §7.
- [ ] Bump `actions/checkout` and `actions/setup-python` to Node 24 versions
      (Actions warns that Node 20 is deprecated).
- [ ] Scheduled catalog refresh on the VM (respecting Celestrak's rate limit).
- [ ] Optional: a stable hostname (e.g. DuckDNS) so a VM move does not change
      the API URL baked into the frontend.

## Open — housekeeping

- [x] Large demo assets: `demo.gif` and `Video Project 1.mp4` (with `final.png`) purged from the whole history on 2026-11-15 and git-ignored; `pre.png` remains (owner kept it). `ssa_data.db` still to confirm.
- [ ] `requirements.txt` pins lower bounds only (`>=`) with no upper bounds
      or lockfile — fine for a portfolio project, but worth a `pip freeze`
      snapshot if reproducibility across time becomes a concern.
