# TASKS.md

Backlog and status tracking. Not a changelog — see `git log` for history and
[DECISIONS.md](DECISIONS.md) for the reasoning behind changes already made.

## Status legend

`[ ]` open · `[~]` in progress · `[x]` done

---

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

## Open — accuracy

- [ ] **Decide how to fix the engine propagator error** (measured 2026-10-03, DECISIONS.md):
      median 297 km at 24 h and 1,277 km at 72 h versus the `sgp4` package, which is more
      than the 100 km screening threshold. Recommended: run `ConjunctionSearch` and
      `ConjunctionDetector` on `SatrecArray` (as `/api/positions` already does) and either
      fix or retire `SGP4Propagator`. Needs a decision, because every conjunction number changes.
- [ ] Split the error measurement by altitude band and eccentricity, and by TLE age.
- [ ] `GET /api/propagate/{id}` still uses the engine propagator and is not labelled as such.

## Open — reliability

- [x] `/api/export/conjunctions` no longer writes to `/tmp` (per-request temp dir, cleaned up, runs off the event loop, UTF-8 files). `tests/test_export.py`.
- [x] Fetch cooldown on `POST /api/update-tles` (429, `ORCA_FETCH_COOLDOWN_S`, default 300 s).
- [x] Leftover `last-30-days` callers moved to `active`; the Streamlit Fetch button used the checked fetch (Streamlit later removed).
- [ ] Decide whether the in-memory `_conjunction_cache` / `_analytics_cache`
      referenced in `api_server.py` (per README.md) should be wired up or
      removed — currently declared but unused.

## Open — verification / testing

- [ ] No automated test suite exists yet. At minimum: unit tests for
      `TLEParser._parse_bstar` (compressed exponential notation is a known
      historical bug source per README.md units contract) and for the
      units-contract boundary between `TLE.inclination` (degrees) and
      `OrbitalElement.i` (radians).
- [ ] No CI configured. Even a minimal "install deps, import every module"
      smoke workflow would have caught the dead Celestrak group and the
      hardcoded path before they shipped.
- [ ] Manually click through all five frontend views (Overview, Globe,
      Conjunctions, Analytics, Data) in a real
      browser — verification so far has been server/log-level (health check,
      absence of tracebacks), not visual/interactive.

## Open — product direction (see PRD.md §9 Open Questions)

- [ ] Decide the intended default demo configuration (catalog size, time
      horizon) balancing realism against conjunction-search latency.
- [ ] Decide if hosted/multi-user deployment is ever in scope. If yes: needs
      auth, a real concurrent-safe datastore (current SQLite-by-direct-import
      model doesn't scale past one writer — ARCHITECTURE.md §3), and
      containerization. If no: worth stating explicitly so future
      contributors don't build toward it by accident.

## Open — housekeeping

- [ ] Confirm `ssa_data.db` and the large demo assets (`demo.gif`, `pre.png`,
      `Video Project 1.mp4`) are appropriately handled in `.gitignore` /
      Git LFS — the video/gif are large binary assets in a plain git repo.
- [ ] `requirements.txt` pins lower bounds only (`>=`) with no upper bounds
      or lockfile — fine for a portfolio project, but worth a `pip freeze`
      snapshot if reproducibility across time becomes a concern.
