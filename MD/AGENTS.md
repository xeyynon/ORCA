# AGENTS.md

Instructions for AI coding agents (and humans skimming for the fast path)
working in this repository. See [ARCHITECTURE.md](ARCHITECTURE.md) for system
design and [README.md](../README.md) for module-level API detail.

## Project

ORCA — a Python SSA (space situational awareness) platform: TLE ingestion →
SGP4 orbit propagation → conjunction (collision-risk) detection → FastAPI REST
API + React (Vite) frontend. Single SQLite file (`ssa_data.db`) is the only
persistence layer, read through the API.

## Setup

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

## Running

**Always set `PYTHONIOENCODING=utf-8` when launching either process on
Windows** — the parser prints a Unicode `✓` per parsed TLE, which crashes on
Windows' default `cp1252` stdout encoding (see DECISIONS.md). This is not
optional; ingestion silently truncates without it.

```bash
# API — http://127.0.0.1:8000, docs at /docs
PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000

# Frontend — http://127.0.0.1:5173 (proxies /api and /health to :8000)
cd frontend && npm install && npm run dev
```

Populate the database after first launch:

```bash
curl -X POST http://127.0.0.1:8000/api/update-tles
```

This fetches Celestrak's `active` group (~9-11k objects, ~2.7MB) as a
background task — poll `GET /api/statistics` to see when the count updates.
Celestrak will 403 this endpoint if hit repeatedly in a short window; the
smaller `stations` group is a reliable fallback for smoke-testing without
tripping that limit: start the API with `ORCA_TLE_GROUP=stations` (default
`active`). See DECISIONS.md before changing the default.

Deploying: push to `main`. CI runs the Python tests and redeploys the backend;
Vercel redeploys the frontend. See [deployment.md](deployment.md).

## Verifying a change actually works

Do not consider a change to this repo "done" from a passing import or a
type-check alone — actually launch the affected process and hit it:

- **API change** → launch uvicorn, `curl` the affected endpoint, read the
  JSON body.
- **Frontend change** → run `cd frontend && npm run typecheck && npm test`,
  then launch the API and `npm run dev`, load the affected view in a browser
  and check the console. Type-checks do not catch render-time failures.
- **Orbit mechanics / conjunction change** → run against real seeded data
  (`stations` group is enough) and sanity-check output units against the
  Units Contract in ARCHITECTURE.md §7, not just "it didn't throw."
  The engine's accuracy claims are checked by `tests/test_conjunction_engine.py`
  and, against a dense reference, by the benchmark harness (below).

Tests: `.venv/Scripts/python.exe -m unittest discover -s tests` (89 tests) and
`cd frontend && npm run typecheck && npm test` (89 tests). Use the project
`.venv`: it pins the scipy / numpy / sgp4 versions the results were produced with.

## Benchmarks (research)

- `benchmarks/` holds the paper's experiments. Each reads a frozen catalog snapshot
  (`benchmarks/data/catalog_*.tle` + `.json` manifest with sha256) and writes to
  `benchmarks/results/`. Install extras with `pip install -r benchmarks/requirements.txt`.
- "ORCA as built" is measured through `benchmarks/legacy/`, frozen copies of the original
  engine (tag `orca-as-built-2026-10-14`). **Never edit those files**, and never point a
  benchmark at the production modules for the baseline.
- New snapshot + refreshed covariance tables:
  `powershell -ExecutionPolicy Bypass -File benchmarks\refresh_measured.ps1` (at most once a
  day; Celestrak rate-limits). Snapshot `.tle` files are git-ignored; commit only the `.json`.
- Method and results: [research_paper_brief.md](research_paper_brief.md) §10,
  [conjunction_engine_v2.md](conjunction_engine_v2.md), the paper in `paper/`.

## Code conventions (as established in this repo)

- `orbit_mech_engine.py` is the foundation layer: **it must never import
  another project module.** If you find yourself importing `parser_pipeline`
  or `Analytics` there, the change belongs in a different file.
- Prefer editing existing modules over adding new top-level files — the
  module boundaries (parse → propagate → detect → visualize → serve) are
  deliberate and documented in README.md; new functionality almost always
  belongs inside one of the existing six.
- Paths: never hardcode an absolute filesystem path (a prior hardcoded
  developer path in the old Streamlit dashboard broke the app on every other machine — see
  DECISIONS.md). Use `Path(__file__).parent / "..."` or an existing constant
  like `DB_PATH`.
- The conjunction engine's guarantee is `r >= d + v*dt/2` (screen radius vs report
  distance, relative speed and step). If you change `STEP_S` or `REPORT_KM`, keep it,
  and update `method_description()`: the UI shows that text verbatim.
- `SGP4Propagator` raises `ValueError` when SGP4 rejects an element set (e.g. decayed);
  callers must handle it (the API returns 422).
- Keep units exactly as documented in ARCHITECTURE.md §7 (`OrbitalElement.n`
  in rad/s, `OrbitalElement.i` in radians, `TLE.inclination` in degrees).
  Silent unit mismatches between `TLE` and `OrbitalElement` have been a real
  bug source — when touching either, double check which one you're in.

## Before committing

- Don't commit changes to `ssa_data.db` (it's a rebuildable Celestrak cache,
  not source data) — check `.gitignore` covers it, and if not, that's a bug
  to fix, not a file to add.
- Don't reintroduce a hardcoded absolute path or a non-ASCII `print()` on a
  hot ingestion path (both have caused full-stack failures before — see
  DECISIONS.md).
- Commits carry **only the repository owner's identity**. No `Co-Authored-By:`
  trailer for Claude or any AI tool, and no "Generated with …" lines in commit
  messages or PR descriptions, whatever a tool's default suggests. See
  [rules.md](rules.md) §9.

## Where to look

| Question | File |
|---|---|
| "What does module X do, method by method?" | [README.md](../README.md) |
| "How do the pieces fit together / what's the deployment shape?" | [ARCHITECTURE.md](ARCHITECTURE.md) |
| "Why was it built this way? What broke before?" | [DECISIONS.md](DECISIONS.md) |
| "What's left to do?" | [TASKS.md](TASKS.md) |
| "What is this project trying to achieve, for whom?" | [PRD.md](PRD.md) |
| "How must frontend/dashboard UI be built?" (modular components, honest data, tokens) | [rules.md](rules.md) |
