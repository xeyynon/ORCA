# System Architecture

The current, detailed architecture. It extends [ARCHITECTURE.md](ARCHITECTURE.md) with the parts added since: operator authentication and the React frontend. The file name keeps the 2026-09-11 date it was planned under; the content was reconciled with the code on 2026-10-15 (conjunction engine v2).
For per-class detail see [README.md](../README.md). For the units contract see [ARCHITECTURE.md](ARCHITECTURE.md) section 7, which still holds.

## 1. System diagram

```
Celestrak gp.php ──► parser_pipeline.py ──► orbit_mech_engine.py ──► conjunction_detection.py ─┐
                     TLEParser, Client,     OrbitalElement, Kepler,   KD-tree, Brent TCA, Pc   │
                     TLEDatabase (SQLite)   propagator, frames                                  │
                            │                      │                                            ▼
                            │                      └────────────────────► Analytics.py ──► api_server.py  :8000
                            │                                                                  │  (+ auth.py)
                            └─────────────────────────────┐                      ┌─────────────┴────────────┐
                                                          ▼                      ▼                          │
                                                                          frontend/ :5173 (via /api proxy)│
                                                                          React 19 + three.js               │
```

## 2. Import direction

```
orbit_mech_engine.py        foundation, zero project imports
parser_pipeline.py          -> orbit_mech_engine
conjunction_detection.py    -> orbit_mech_engine
Analytics.py                -> orbit_mech_engine, parser_pipeline, conjunction_detection
auth.py                     standard library only
api_server.py               -> parser_pipeline, orbit_mech_engine, conjunction_detection, Analytics, auth
frontend/                   HTTP only. Imports no Python.
```

Invariant: `orbit_mech_engine.py` never imports another project module.

## 3. Runtime topology

| Process | Command | Port | Reads or writes |
|---|---|---|---|
| API | `PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000` | 8000 | `ssa_data.db`, `auth.json` |
| React dev server | `cd frontend && npm run dev` | 5173 | Proxies `/api` and `/health` to :8000 |

**Hosted (since 2026-10-08):**

| Process | Where | Port | Reads or writes |
|---|---|---|---|
| Caddy (HTTPS, Let's Encrypt) | Oracle VM, container | 80, 443 (public) | `caddy-data` volume |
| API (`uvicorn ... --workers 1 --proxy-headers`) | Oracle VM, container | 8000 (internal only) | `/data/ssa_data.db`, `/data/auth.json` on the `orca-data` volume |
| React build | Vercel | HTTPS | Calls the API cross-origin (`VITE_API_BASE`, `ORCA_CORS_ORIGINS`) |

See [deployment.md](deployment.md).

No queue, no shared cache, no coordination beyond SQLite file locking. A built frontend can instead be pointed at a remote API with `VITE_API_BASE` at build time, plus the frontend origin in `ORCA_CORS_ORIGINS` on the API.

## 4. Persistence

| File | What | Notes |
|---|---|---|
| `ssa_data.db` | TLE catalog and a key/value cache table | Rebuildable Celestrak cache. Git-ignored (`*.db`). Schema owned by `TLEDatabase._init_schema()`. No migrations. |
| `auth.json` | scrypt password hash and the token-signing secret | Git-ignored. Path overridable with `ORCA_AUTH_FILE`. |

Paths are overridable with `ORCA_DB_PATH` and `ORCA_AUTH_FILE`. In the hosted container both live in the `/data` volume.

Browser: the frontend keeps the sign-in token via `frontend/src/api/session.ts`. Only `api/` and `hooks/` may touch it.

## 5. Authentication

- **One credential, no user table.** Set with `python auth.py set-password` (prompts) or `--generate` (random, printed once). Minimum 10 characters.
- **Hash:** scrypt (n=2^14, r=8, p=1).
- **Token:** `base64url(payload).HMAC-SHA256`, stateless, 12 h lifetime. The signing secret lives in `auth.json`, so changing the password invalidates every token.
- **Guard:** `require_auth` is a global dependency on the FastAPI app. Public paths: `/`, `/health`, `/api/auth/login`, `/api/auth/status`. `OPTIONS` passes for CORS preflight. With no credential configured every protected route returns 503 and names the setup command (fails closed).
- **Throttle:** `LoginThrottle`, per client address, answers 429 with `Retry-After`.
- **Limits:** sign-out only forgets the token in the browser. A copied token stays valid until it expires or the password changes.
- Tests: `tests/test_auth.py`.

## 6. API surface

| Method | Path | Public? |
|---|---|---|
| GET | `/`, `/health`, `/api/auth/status` | yes |
| POST | `/api/auth/login` | yes |
| GET | `/api/auth/me` | token |
| GET | `/api/tles`, `/api/tle/{id}`, `/api/search` | token |
| POST | `/api/update-tles` | token (background task) |
| GET | `/api/propagate/{id}`, `/api/positions`, `/api/orbit-path/{id}`, `/api/orbital-elements/{id}` | token |
| GET | `/api/conjunctions` (returns `{events, total_events, tier_counts, long_encounters, window_start, window_end, objects, report_km, step_s, runtime_s}`; horizon 1–7 d), `/api/conjunctions/method`, `/api/conjunction-pair/{id1}/{id2}` | token |
| GET | `/api/statistics`, `/api/export/conjunctions` | token |

CORS allows `GET` and `POST` from `ORCA_CORS_ORIGINS` (default: the two Vite dev origins). `/api/positions` accepts at most 50 requested ids (`MAX_REQUESTED_IDS`).

## 7. Frontend structure

See [frontend.md](frontend.md). In one line: typed API client, pure logic in `lib/`, all effects in `hooks/`, three.js only in `globe/EarthScene.ts`, and one folder per component from atoms to views.

## 8. Concurrency

- **API:** single-process uvicorn event loop. `POST /api/update-tles` offloads the fetch to `BackgroundTasks`.
- **Conjunction search:** vectorised in one process (SGP4 via `SatrecArray`, a KD-tree per 20 s step, per-object `sgp4_array` refinement). `/api/conjunctions` is a plain `def`, so it runs in FastAPI's thread pool. About 1.5–2 min per day of horizon for ~16k objects.
- **Frontend:** conjunction search is cancellable. The refresh is polled, since there is no completion event.

## 9. Platform notes

- Windows needs `PYTHONIOENCODING=utf-8` on every process that parses TLEs.
- Never hardcode an absolute path. Use `Path(__file__).parent / ...` or `DB_PATH`.
- `GET /api/export/conjunctions` uses a temp directory per request (it used to write `/tmp`).

## 10. Known gaps

- CI covers the backend only: Python tests gate each backend deploy. Frontend tests do not run in CI.
- One container, one VM, one worker. Single-operator use.
- SQLite by direct import does not scale past one writer.
- Pc depends on an uncertainty model measured from public TLEs; TLEs carry no covariance.
- The hosted copy runs the original engine until this branch is deployed.

See [pain.md](pain.md) and [TASKS.md](TASKS.md).
