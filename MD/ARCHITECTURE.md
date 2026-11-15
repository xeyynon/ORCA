# ORCA — Architecture

This document describes the system as it actually runs today, including the
seams that matter for anyone modifying or operating it. For the module list see
[README.md](../README.md#architecture), and for per-class detail the module docstrings.
The conjunction engine (v2, 2026-10-15) is described and validated in
[conjunction_engine_v2.md](conjunction_engine_v2.md).

## 1. System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCE                               │
│              Celestrak TLE feeds (HTTP, gp.php)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    parser_pipeline.py                            │
│  TLEParser · CelestrackClient · TLEDatabase (SQLite)              │
│  Outputs: TLE dataclass objects, ssa_data.db                      │
└────────────────────────────┬────────────────────────────────────┘
                             │  TLE.to_orbital_element()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   orbit_mech_engine.py  (foundation layer)        │
│  OrbitalElement · KeplerSolver · SGP4Propagator (real SGP4)       │
│  CoordinateTransform (ECI ↔ ECEF ↔ Geographic)                   │
└──────────┬──────────────────────────────────────────────────────┘
           │ StateVector streams                  │ OrbitalElement
           ▼                                      ▼
┌──────────────────────┐            ┌─────────────────────────────┐
│ conjunction_          │            │       Analytics.py           │
│ detection.py          │            │  OrbitalAnalytics             │
│ KD-tree every 20 s,   │            │  OrbitalVisualizer / Risk-    │
│ exact TCA, Foster Pc  │            │  Visualizer / ExportUtils     │
└──────────┬────────────┘            └───────────────┬──────────────┘
           │                                          │
           └──────────────────┬──────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐        ┌────────────────────┐
                    │  api_server.py    │ ◄───── │ frontend/ (React)   │
                    │  FastAPI/Uvicorn   │  HTTP  │ Vite, :5173         │
                    │  :8000, /docs       │        └────────────────────┘
                    └──────────────────┘
```

## 2. Import / Dependency Direction

```
orbit_mech_engine.py        ← foundation, zero internal imports
parser_pipeline.py          → orbit_mech_engine
conjunction_detection.py    → orbit_mech_engine
Analytics.py                → orbit_mech_engine, parser_pipeline, conjunction_detection
api_server.py                → parser_pipeline, orbit_mech_engine, conjunction_detection, Analytics
frontend/                   → api_server over HTTP only
benchmarks/                 → parser_pipeline, and benchmarks/legacy/ (frozen copies of the original
                              conjunction_detection.py and orbit_mech_engine.py, tag orca-as-built-2026-10-14)
```

The benchmarks measure "ORCA as built" through `benchmarks/legacy/`, never through the production modules, so fixing production cannot move the paper's baseline. Nothing in production imports `benchmarks/`.

**Invariant:** `orbit_mech_engine.py` must never import another project module.
It is the layer everything else is built on; a cycle here breaks the whole
dependency graph.

## 3. Runtime Topology

One backend process owns the SQLite file (`ssa_data.db`); the React frontend
talks to it over HTTP only:

| Process | Command | Port | State |
|---|---|---|---|
| API server | `uvicorn api_server:app --port 8000` | 8000 | Reads/writes `ssa_data.db` |
| Frontend (dev) | `cd frontend && npm run dev` | 5173 | Proxies `/api` and `/health` to :8000; no database access |

There is no message queue and no shared cache. SQLite's file-level locking is
fine at demo/single-user scale; it will need a shared cache or a real DB engine
if the API ever runs more than one worker/replica (see PRD §9, TASKS.md).

## 4. Persistence

- **Engine**: SQLite, single file `ssa_data.db` at the project root.
- **Schema owner**: `parser_pipeline.TLEDatabase._init_schema()`.
- **Write pattern**: `INSERT OR REPLACE` keyed by NORAD catalog ID — a TLE
  refresh is a full upsert of the fetched group, not an append-only log.
- **Freshness tracking**: a key/value `cache` table (`set_cache`/`get_cache`/
  `cache_is_fresh`) records when the catalog was last updated.
- No migrations framework — schema changes are made by editing
  `_init_schema()` directly, which is safe only because this is a
  disposable/rebuildable cache of Celestrak data, not a system of record.

## 5. External Dependencies

| Dependency | Used for | Failure mode if unreachable |
|---|---|---|
| `https://celestrak.org/NORAD/elements/gp.php` | Live TLE catalog | `CelestrackClient.fetch_group_checked` returns a `FetchResult` (`ok`, `empty`, `rate_limited`, `not_found`, `http_error` or `network_error`), surfaced as `last_fetch` in `/health` and in the Data view. A failed fetch leaves the catalog unchanged. See DECISIONS.md for the rate limiting observed under repeated requests. |
| `sgp4` (PyPI) | All orbit propagation: `SGP4Propagator`, the conjunction engine, the globe | Hard dependency; no fallback. |
| three.js (bundled by Vite) | 3D globe | Part of the built bundle; no runtime fetch. |

## 6. Concurrency Model

- **API server**: standard single-process `uvicorn`/FastAPI async event loop.
  `POST /api/update-tles` offloads the Celestrak fetch to `BackgroundTasks` so
  the HTTP response returns immediately ("update started") while ingestion
  continues async — callers must poll `/api/statistics` or `/api/tles` to
  observe completion, there is no completion webhook/event.
- **Conjunction search** (engine v2): vectorised in one process.
  - SGP4 is run in batches (`SatrecArray`) of 120 grid steps.
  - A KD-tree runs per step.
  - The exact TCA refinement is batched per object (`Satrec.sgp4_array`).
  - Pc is vectorised.

  `/api/conjunctions` is a plain `def`, so FastAPI runs it in its thread pool and `/health` stays responsive during a search. The `parallel`, `use_processes` and `max_workers` arguments are accepted for compatibility and ignored. A full-catalog search takes about 1.5–2 min per day of horizon; Cancel in the UI stops the browser waiting, not the server.
- **Frontend**: conjunction search is cancellable on the client; the catalog
  refresh is polled through `/health` (there is no completion event).

## 7. Units Contract

This has been a real bug source (per README) and is restated here because it
crosses every module boundary in the system:

| Quantity | Internal unit | Note |
|---|---|---|
| `n` (mean motion), `OrbitalElement` | rad/s | `sgp4` returns `no_kozai` in rad/min — always divide by 60 when converting. |
| Position `r` | km, ECI frame | |
| Velocity `v` | km/s, ECI frame | |
| Inclination, `OrbitalElement` | radians | Convert to degrees only at API/display boundary. |
| Inclination, `TLE` dataclass | degrees | Raw from TLE Line 2 — **different unit than `OrbitalElement`, same physical quantity.** |

## 8. Platform Notes

- **Windows console encoding**: parsing prints a Unicode checkmark (`✓`) per
  successfully parsed TLE. Python's default stdout encoding on Windows is
  `cp1252`, which cannot encode that character and crashes the process mid-parse
  (observed: `UnicodeEncodeError` inside a FastAPI `BackgroundTasks` worker,
  silently truncating catalog ingestion). Any process launch on Windows must
  set `PYTHONIOENCODING=utf-8` (or the code must stop printing non-ASCII to
  stdout). See DECISIONS.md.
- **Path portability**: never hardcode an absolute path; resolve files relative
  to the module (`Path(__file__).parent / ...`). A hardcoded developer-machine
  path in the old Streamlit dashboard once crashed every page on any other
  machine; see DECISIONS.md.

## 9. Deployment Shape (current)

Two shapes, both single-operator with one file-based database:

- **Local development:** one API process plus the Vite dev server.
- **Hosted (since 2026-10-08):** the React build on Vercel (https://orca-vitap.vercel.app), and the API in Docker
  behind Caddy (HTTPS) on an Oracle Cloud Always Free VM. GitHub Actions redeploys the backend on every push to
  `main`, and Vercel redeploys the frontend.

Still one API worker and one SQLite file, so no horizontal scaling. Multi-user
accounts remain out of scope. Details: [deployment.md](deployment.md).
