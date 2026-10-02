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

## Open — reliability

- [ ] Handle Celestrak rate-limiting on the large `active` group gracefully
      (currently: silent `403` → empty list, logged only server-side, not
      surfaced to the caller of `POST /api/update-tles`). Consider: backoff,
      a smaller/paginated default, or surfacing fetch failures via the
      `/api/statistics` or a dedicated status field.
- [ ] `CelestrackClient.fetch_group` failures are swallowed to `[]` — an empty
      catalog looks identical to "network fine, zero results" from every
      downstream caller. Add a distinguishable failure signal.
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
- [ ] Manually click through all four dashboard pages (Dashboard, Three.js
      Globe, Conjunction Analysis, Analytics, Data Management) in a real
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
