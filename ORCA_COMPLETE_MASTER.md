# ORCA: Complete Master Document

> One file that consolidates all 29 ORCA markdown documents: purpose, architecture, data flow, the conjunction engine, API, frontend, deployment, research results, risks, decisions, backlog and open issues.
> Sources are the repository's `MD/` set as read on 2026-10-27. State of the code described here: 2026-10-15, branch `fix/honest-conjunctions` (conjunction engine v2).
> **Rule when documents disagree: trust the code first, then ORCA_MASTER.md.** Section 20 lists the disagreements found between the source files.

---

## Contents

1. What ORCA is
2. Timeline
3. Why it exists: problem, users, principles, scope
4. Architecture
5. Data flow
6. Conjunction engine v2
7. The risk model
8. API reference
9. Frontend
10. Deployment and operations
11. Working in the repo: setup, run, verify, conventions, commits
12. Research study and paper
13. Literature and prior work
14. Risk register (what can break)
15. Decision log
16. Tried and failed / tried and implemented
17. Backlog
18. Capstone proposal and team
19. ML status
20. Known inconsistencies between source documents
21. Glossary
22. Source document map

---

## 1. What ORCA is

An open-source Space Situational Awareness (SSA) platform, built as a capstone project with an associated research paper. It goes from raw TLE text to a ranked list of conjunctions (close approaches between two orbiting objects):

```
Celestrak TLEs -> SQLite -> SGP4 -> screen (KD-tree, every 20 s) -> exact TCA -> Foster Pc + risk tier -> API -> React app
```

- **Stack:** Python (FastAPI, SciPy, sgp4), SQLite, React 19 + TypeScript + Vite 8 + three.js.
- **Licence:** Apache 2.0. Free and open throughout: no STK, no paid keys.
- **Hosted copy:** https://orca-vitap.vercel.app (frontend on Vercel, API on an Oracle Cloud Always Free VM). It still runs the original engine until v2 is merged.
- **Contact:** suryapratik12@gmail.com.
- **Not an operational system.** Output must not drive manoeuvre decisions. NASA's handbook does not recommend TLE-based conjunction assessment because TLE accuracy is not sufficient.

**Core idea: screening is not risk assessment.** Screening is a cheap filter (which pairs could come close?). Analysis is the expensive step (when, how close, how fast, how likely?). A pair that passes screening is a hypothesis. ORCA keeps the two stages separate in code, API and UI.

---

## 2. Timeline

| Date | Event |
|---|---|
| 2026-08-11 / 18 | Literature review (Pass B) and capstone proposal produced. Dead `last-30-days` Celestrak group fixed to `active`; hardcoded dashboard path fixed; Windows encoding issue documented; Celestrak 403 on repeated `active` requests observed. |
| 2026-09-11 | System architecture document planned (file name keeps this date). |
| 2026-10-03 | Search window fixed to start at "now"; fetch failures reported instead of swallowed; export endpoint fixed; Streamlit dashboard removed (React is the only front end); propagator error measured (297 km median at 24 h). |
| 2026-10-08 | Hosted on free tiers (Vercel + Oracle VM + GitHub Actions). Ampere A1 unavailable, so an AMD micro VM is used. Commit `d9e0690` pushed with an AI co-author trailer, amended and force-pushed as `a520f7e`; rules §9 added. |
| 2026-10-14 | Benchmark study of the original engine. Original frozen at tag `orca-as-built-2026-10-14` (eb53f1c) and in `benchmarks/legacy/`. Literature verified. Three TLE snapshots taken. |
| 2026-10-15 | Conjunction engine v2 built and validated. Evaluator access panel added. All MD documents reconciled with v2. Headless-Chrome checks fixed three UI bugs. Sonawane 2026 and Medhin & Servadio 2026 read in full. |
| Open | Merge `fix/honest-conjunctions` into `main` and push (needs owner's go-ahead). |

---

## 3. Why it exists

### 3.1 The problem
LEO is crowded with active satellites, spent rocket bodies and debris. Operators decide, often daily, whether a predicted close approach justifies a manoeuvre, so they must tell a hazardous encounter from a merely close one. Professional tools (STK, commercial SaaS, government systems) are expensive or closed. Public services such as CelesTrak SOCRATES are one-vs-all and run on commercial tooling. There was no small, inspectable, freely runnable reference going from raw TLE text to "the conjunctions that matter this week".

### 3.2 Users

| Who | What they need |
|---|---|
| Capstone evaluator, recruiter | Working orbital mechanics, a real API and a real UI in under five minutes |
| Student or learner | Short Python modules mapping to textbook astrodynamics |
| Downstream developer | A REST API for propagated states and conjunctions without standing up SGP4 |
| The team (four students, one faculty guide) | An achievable project, defensible in a viva, tied to a research paper |

### 3.3 Design principles
1. **Free and open.** No paid keys, licences or services for core function.
2. **Local first.** One machine, one SQLite file.
3. **Readable end to end.** One engineer can explain every module. Extend existing modules before adding top-level files.
4. **Honest data.** TLE age beside every object, the propagator named, "not loaded" vs "ran and found nothing" vs "request failed" kept distinct, limits stated next to the numbers they qualify.
5. **Units are a contract.** The same quantity has different units in different layers, and that caused bugs.
6. **Fail loud, not silent.** The worst past bugs were silent (empty catalog from a dead group; ingestion truncated by a console-encoding crash).
7. **Keep the foundation pure.** `orbit_mech_engine.py` never imports another project module.
8. **The API is the security boundary.** The login screen is only the front door.

### 3.3 Goals (PRD)
G1 ingest live TLEs; G2 propagate with SGP4 as the authority; G3 screen the catalog in better than quadratic time without missing approaches under the report distance and rank by Foster 2D Pc; G4 expose a documented REST API; G5 visualize (3D globe, risk tables, analytics); G6 be readable end to end for portfolio and education.

### 3.4 Non-goals / outside the boundary

| Not in scope | Why |
|---|---|
| Operational collision warning or manoeuvre planning | TLEs carry no covariance and are kilometres off within days |
| High-fidelity propagation (numerical integrator, SRP, detailed atmosphere) | Out of scope in PRD and proposal |
| Operational or restricted ephemerides (Space-Track CDMs, operator data) | Public data only |
| Orbit determination and real covariance | No tracking data upstream; uncertainty is estimated from successive TLEs |
| Multi-user accounts and roles | One operator credential |
| Multi-tenant hosting | A single-operator hosted copy exists |
| Mobile app | Desktop browser only |
| Machine learning | None in the system |
| A new screening algorithm | The contribution is an accounting of where accuracy is lost in established methods |

### 3.5 Functional and non-functional requirements (PRD)
Must: parse 3-line TLEs including BSTAR notation; upsert into SQLite by NORAD id; propagate any stored object 0–168 h ahead; search the catalog for conjunctions over 1–7 days (every approach under 10 km), classify into five tiers; expose catalog statistics; export CSV/JSON; visualize orbits on a 3D globe with orbit paths and time scrub; trigger a Celestrak refresh from the UI.
Non-functional: runs free; local-first; KD-tree screening, not O(N²); cross-platform (Windows, macOS, Linux); every fetch/parse/insert step logs enough to diagnose a silent-empty-catalog failure.
Success metrics: fresh clone to running API + frontend with live data in under 10 minutes; `POST /api/update-tles` on `active` succeeds with matching count; a plausible conjunction result end to end; all five views load without an unhandled exception.

---

## 4. Architecture

### 4.1 System diagram

```
Celestrak gp.php --> parser_pipeline.py --> orbit_mech_engine.py --> conjunction_detection.py --+
                     TLEParser, Client,      OrbitalElement, Kepler,   KD-tree, TCA, Foster Pc    |
                     TLEDatabase (SQLite)    SGP4Propagator, frames                               v
                            |                      +-----------------> Analytics.py --> api_server.py :8000 (+ auth.py)
                            |                                                                 |
                            +----------------------------------------------------------> frontend/ :5173
                                                                                         React 19 + three.js
```

### 4.2 Modules

| File | Role |
|---|---|
| `parser_pipeline.py` | `TLEParser` (BSTAR decoding), `CelestrackClient` (`fetch_group`, `fetch_group_checked`), `TLEDatabase` (SQLite, key/value cache table) |
| `orbit_mech_engine.py` | Foundation layer, zero project imports. `OrbitalElement`, Kepler solver, `SGP4Propagator` (real SGP4 via `satrec_from_elements`), `TwoBodyDragPropagator` (old model, comparison only), `CoordinateTransform` (ECI/ECEF/geographic) |
| `conjunction_detection.py` | `ConjunctionDetector` (one pair), `ConjunctionSearch` (catalog), `CovarianceModel`, `collision_probability`, `method_description()` |
| `Analytics.py` | Catalog statistics, Plotly figures, export helpers |
| `auth.py` | Single-operator login: scrypt hash, HMAC-SHA256 stateless token, `LoginThrottle` |
| `api_server.py` | FastAPI app on :8000 |
| `frontend/` | React + TypeScript + Vite + three.js, the only front end |
| `benchmarks/` | Research experiments; `benchmarks/legacy/` holds frozen copies of the original engine |
| `paper/` | IEEE paper (`main.tex`, `references.bib`, figures, `main.pdf`) |

### 4.3 Import direction

```
orbit_mech_engine.py        foundation, zero project imports
parser_pipeline.py          -> orbit_mech_engine
conjunction_detection.py    -> orbit_mech_engine
Analytics.py                -> orbit_mech_engine, parser_pipeline, conjunction_detection
auth.py                     standard library only
api_server.py               -> parser_pipeline, orbit_mech_engine, conjunction_detection, Analytics, auth
frontend/                   HTTP only
benchmarks/                 -> parser_pipeline, benchmarks/legacy/ (frozen)
```

Nothing in production imports `benchmarks/`. The paper's baseline is measured through `benchmarks/legacy/`, so fixing production cannot move it.

### 4.4 Runtime topology

| Process | Command | Port | Reads / writes |
|---|---|---|---|
| API | `PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000` | 8000 | `ssa_data.db`, `auth.json` |
| Frontend (dev) | `cd frontend && npm run dev` | 5173 | Proxies `/api` and `/health` to :8000 |

No message queue, no shared cache. SQLite file locking is fine at single-user scale and would need a shared cache or real DB for more than one worker.

### 4.5 Persistence

| File | What | Notes |
|---|---|---|
| `ssa_data.db` | TLE catalog + key/value cache (`set_cache`/`get_cache`/`cache_is_fresh`) | Rebuildable Celestrak cache, git-ignored. Schema owned by `TLEDatabase._init_schema()`. No migrations. `INSERT OR REPLACE` by NORAD id, so a refresh is a full upsert |
| `auth.json` | scrypt hash + token-signing secret | Git-ignored. Overridable with `ORCA_AUTH_FILE` |

In the hosted container both live on the `/data` volume (`ORCA_DB_PATH`, `ORCA_AUTH_FILE`).

### 4.6 Authentication
- One credential, no user table. `python auth.py set-password` (prompts) or `--generate`. Minimum 10 characters. Default user `admin`.
- Hash: scrypt (n=2^14, r=8, p=1). Token: `base64url(payload).HMAC-SHA256`, stateless, 12 h lifetime.
- Changing the password rotates the signing secret, so every old token dies.
- Guard: `require_auth` global dependency. Public paths: `/`, `/health`, `/api/auth/login`, `/api/auth/status`. `OPTIONS` passes for CORS preflight. With no credential configured every protected route returns **503** and names the setup command (fails closed).
- `LoginThrottle` per client address answers **429** with `Retry-After`. One message for wrong user and wrong password.
- Limit: sign-out only forgets the token in the browser. A copied token works until it expires or the password changes.

### 4.7 Concurrency
- `POST /api/update-tles` offloads the Celestrak fetch to `BackgroundTasks`: it returns "update started" immediately and there is **no completion event**; poll `/health` or `/api/statistics`.
- Conjunction search (engine v2) is vectorised in one process: SGP4 in `SatrecArray` batches of 120 grid steps, a KD-tree per step, TCA refinement batched per object with `Satrec.sgp4_array`, vectorised Pc. `/api/conjunctions` is a plain `def`, so FastAPI runs it in its thread pool and `/health` stays responsive. `parallel`, `use_processes` and `max_workers` are accepted and ignored.
- Cancel in the UI stops the browser waiting, not the server.

### 4.8 Units contract (a real past bug source)

| Quantity | Internal unit | Note |
|---|---|---|
| `OrbitalElement.n` (mean motion) | rad/s | `sgp4` returns `no_kozai` in rad/min: divide by 60 |
| Position `r` | km, ECI | |
| Velocity `v` | km/s, ECI | |
| `OrbitalElement.i` | radians | Convert to degrees only at API/display boundary |
| `TLE.inclination` | degrees | Raw from TLE line 2. Same quantity, different unit from `OrbitalElement.i` |

### 4.9 Platform notes
- **Windows console encoding:** the parser once printed a Unicode check mark per TLE; cp1252 crashed inside a background task and silently truncated ingestion. The prints were removed on 2026-10-03, but `PYTHONIOENCODING=utf-8` is still required on every launch and set in the Docker image.
- **Paths:** never hardcode an absolute path. Use `Path(__file__).parent / ...` or `DB_PATH`.
- `GET /api/export/conjunctions` uses a per-request temp directory (it used to write `/tmp`).

### 4.10 External dependencies

| Dependency | Use | Failure mode |
|---|---|---|
| `https://celestrak.org/NORAD/elements/gp.php` | Live TLE catalog | `fetch_group_checked` returns `ok / empty / rate_limited / not_found / http_error / network_error`, shown as `last_fetch` in `/health` and the Data view. A failed fetch leaves the catalog and `last_update` unchanged |
| `sgp4` (PyPI, `>=2.23`, 2.27 used) | All propagation | Hard dependency, no fallback |
| three.js (bundled by Vite) | 3D globe | Part of the build, no runtime fetch |

### 4.11 Quality boundary: what output can be trusted for (descending confidence)
1. Catalog contents and TLE age (direct from Celestrak).
2. Orbital elements and regime statistics (arithmetic on TLE fields).
3. Position now and a few hours ahead (SGP4, as good as the TLE: about a kilometre at epoch, growing by kilometres per day).
4. Which pairs are close according to the TLEs (gap-free screening for misses under 10 km).
5. Miss distance and TCA (exact for the TLEs, but the TLEs are uncertain).
6. Pc and tier (conditional on the uncertainty model; long encounters may be understated). **Do not read item 6 as a probability.**

### 4.12 Trust boundaries

| Boundary | Trust level | Control |
|---|---|---|
| Celestrak to ORCA | Untrusted, can fail or refuse | Parser skips bad records; failures are classified |
| Browser to API | Untrusted | Bearer token on every route except four public ones; fails closed; CORS allow-list; login throttle |
| API to SQLite | Trusted, same machine | Local file |
| Secrets | `auth.json` | Git-ignored; password change rotates the secret |

---

## 5. Data flow

### 5.1 Stage by stage

| # | Stage | In | Out | Where | Failure behaviour |
|---|---|---|---|---|---|
| 1 | Fetch | group name (default `active`) | raw 3-line TLE text | `CelestrackClient.fetch_group_checked` | Outcome classified; catalog unchanged on failure |
| 2 | Parse | text | `TLE` objects | `TLEParser` | Bad records skipped |
| 3 | Store | `TLE` list | rows in `ssa_data.db` | `TLEDatabase` | Upsert by NORAD id |
| 4 | Convert | `TLE` | `OrbitalElement` | `TLE.to_orbital_element()` | Unit boundary: degrees to radians, mean motion to rad/s |
| 5 | Propagate | element + time | state vector (TEME, km, km/s) | `SGP4Propagator` | `ValueError` if SGP4 refuses (e.g. decayed); such objects are parked out of the screen; API returns 422 |
| 6 | Screen | catalog + horizon | grid minima | `conjunction_detection._screen` | Gap-free for misses under 10 km; approaches in the first or last 20 s of the window are skipped |
| 7 | Refine | grid minimum | TCA, miss distance, relative velocity | `_refine_exact` | Exact SGP4 states; median 0.5 mm from the dense reference |
| 8 | Assess | event | Pc, tier, uncertainty, long-encounter flag | `_build_events`, `collision_probability` | Pc is conditional on `CovarianceModel` |
| 9 | Serve | any of the above | JSON | `api_server.py` | Every route except the public four needs a bearer token |
| 10 | Show | JSON | views | `frontend/src/` | Distinguishes not loaded, empty result, failure |

### 5.2 Refresh flow
1. Frontend sends `POST /api/update-tles` with the token.
2. API returns at once and runs the fetch as a background task.
3. No completion event: the frontend polls `/health` (object count, last refresh time).
4. If Celestrak refuses (403 after repeated `active` requests), the count never changes. `last_fetch` now records the outcome. A cooldown (`ORCA_FETCH_COOLDOWN_S`, default 300 s) returns 429 with `Retry-After`; the stamp is written when the fetch starts, so double clicks are caught.

### 5.3 Conjunction search flow
1. On load the Conjunctions view fetches `GET /api/conjunctions/method` and shows the method and limits.
2. `GET /api/conjunctions?time_horizon_days=&limit=` (1–7 days). Cancellable client-side; the server still finishes.
3. `ConjunctionSearch.search_catalog(..., top=limit)` starts at now, records `last_window`, returns the `limit` most probable events, and `last_stats` counts everything found.
4. The frontend shows "Top N of M" and tier counts over all M; flags past events and long encounters.
5. Pair detail: `GET /api/conjunction-pair/{id1}/{id2}`, the same engine over 7 days.
6. CSV/JSON export happens in the browser.

Measured on a laptop, full catalog (15,970 objects): a 1-day search takes ~1.5–2 min and finds ~426,000 approaches under 10 km. The original engine took ~20 s and reported ~0.1 % of them.

---

## 6. Conjunction engine v2 (2026-10-15)

### 6.1 Why: the original engine's measured faults

| Stage | ORCA as built | Measured effect |
|---|---|---|
| Propagation | `SGP4Propagator` was two-body + drag, no J2 | ~300 km from SGP4 after 24 h (12–17 km already at epoch) |
| Screening | Positions every 1 h (UI default 2 h), 100 km radius | ~1 % of encounters under 10 km caught during their pass |
| Refinement | One bounded Brent search over ±6 h | Found the right approach for 5–6 % of pairs |
| Collision probability | Formula off by exactly 1/α² | Every CRITICAL/HIGH label came from the formula, not the encounter |
| Uncertainty | Isotropic 0.5 km + 2 km/day | ~3× too wide in-track and ~35× too wide radially for fresh TLEs |
| End to end | | ~0.1 % of close approaches under 10 km reported |

The original is tagged `orca-as-built-2026-10-14` (eb53f1c) and copied verbatim into `benchmarks/legacy/`.

### 6.2 What it does now (`conjunction_detection.py`)
1. **Propagation:** real SGP4 (`satrec_from_elements`, the same `sgp4init` call as `twoline2rv`).
2. **Screening:** every object every `STEP_S` = 20 s. A `cKDTree` finds pairs within R = `REPORT_KM` (10 km) + v_max × 10 s, where v_max is twice the fastest perigee speed in the catalog (about 167–211 km in practice). The guarantee is **r ≥ d + v·Δt/2**, so no approach closer than 10 km can fall between steps.
3. **Closest approach:** a parabola through d² at the three samples around each grid minimum gives the time (d² is exactly quadratic for straight-line motion). Exact SGP4 states are then computed at that time with one range-rate correction. The miss distance is re-propagated, not read off the parabola's minimum value (that was off by a median of 63 m).
4. **Pc:** Foster's 2D integral in the encounter plane, vectorised with 32-point Gauss–Legendre on the principal axes; adaptive quadrature when the hard-body radius is not small relative to σ.
5. **Uncertainty:** per-object radial/in-track/cross-track σ by TLE age, from `CovarianceModel`. Measured from successive public TLEs (LEO, three snapshots on 2026-10-14), Starlink kept separate, interpolated in log-log space, and floored at ESA's at-epoch LEO values 0.102 / 0.471 / 0.126 km (Flohrer et al. 2009).
6. **Tiers:** thresholds unchanged (see §7).
7. **Long encounters:** relative speed under 0.1 km/s are flagged; only the closest approach per pair is kept.

If you change `STEP_S` or `REPORT_KM`, keep the guarantee and update `method_description()`, because the UI shows that text verbatim.

### 6.3 Validation
- **Against the dense reference** (3 seeds, 2,000 objects, 24 h): every encounter under 10 km found, except slow pairs deduplicated by design and one at the very first grid step. No extra events. Miss distances agree to a median of 0.5 mm (max 6 cm), TCAs to a median of 0.5 ms.
- `SGP4Propagator` vs `Satrec.twoline2rv`: under 1 mm from 0 to 168 h.
- Vectorised Pc vs adaptive quadrature: agreement to 5 decimal places, including misses many σ away.
- Tests in `tests/test_conjunction_engine.py`: planted fast crossing, planted slow encounter, pair vs catalog agreement, Pc accuracy, uncertainty floor and growth, tiers.
- Full catalog (15,970 objects, next 24 h): 426,421 approaches under 10 km in ~1.5–2 min. Tiers: 30 HIGH, 803 MEDIUM, ~58,800 LOW, ~366,800 NEGLIGIBLE; 415 long encounters.

### 6.4 API and UI changes
- `/api/conjunctions` returns an object `{events, total_events, tier_counts, long_encounters, window_start, window_end, objects, report_km, step_s, runtime_s}` instead of a list. Horizon 1–7 days, default 1 (was 1–30). `search_step_hours` accepted and ignored. Each event gains `tle_age_days`, `uncertainty_km`, `long_encounter`.
- New `/api/conjunctions/method`.
- `/api/propagate` is real SGP4 and returns 422 when SGP4 refuses an element set.
- `/api/export/conjunctions`: 1-day horizon, top 10,000 events.
- Conjunctions view: step control removed; runtime estimate; "How this list is made, and what it cannot tell you" panel from the API; tier counts over every approach found; headline "Top N of M"; uncertainty and TLE-age columns; "Long" badge; honest probability note; the pair card says when its closest approach in the next 7 days is a different pass.
- **Deploy backend and frontend together**, or the live UI breaks.

### 6.5 Still true and stated in the UI
- TLEs carry no covariance; every Pc and tier is conditional on the uncertainty model.
- NASA does not recommend TLE-based conjunction assessment for operations.
- The uncertainty was measured from one day of snapshots and only for LEO. TLE-to-TLE comparison underestimates error near epoch, which is why the ESA floor exists.
- Runtime is minutes, not seconds.

### 6.6 Alternatives rejected
Keeping the hourly screen with a bigger radius (~29,000 km needed to be gap-free); swept-volume screening (George 2011; Budianto-Ho 2014: more code for the same guarantee); Monte Carlo Pc (~10⁸ samples at Pc ≈ 10⁻⁶).

---

## 7. The risk model

### 7.1 Tiers

| Tier | Pc |
|---|---|
| CRITICAL | > 1×10⁻⁴ |
| HIGH | > 1×10⁻⁵ |
| MEDIUM | > 1×10⁻⁶ |
| LOW | > 1×10⁻⁷ |
| NEGLIGIBLE | otherwise |

The 1e-4 boundary is sourced: NASA CA Handbook (NASA/SP-20205011318, 2020) best practice 6.3.B recommends mitigation above 1E-04; ESA (Merz et al. 2019) calls 1/10,000 a "quasi-standard". The lower boundaries are ORCA's own.

### 7.2 Hard-body radius
Looked up by name keyword: Starlink 5.65 m, OneWeb 4.0 m, Iridium 3.9 m, CubeSat 0.5 m, debris 0.1 m, anything else 3.0 m. These are ORCA's assumptions; a large body whose name has no keyword is underestimated (risk P8).

### 7.3 Why the covariance dominates
TLEs carry no covariance, so Pc rests on an outside uncertainty model. On the same encounters:
- ORCA's isotropic σ: 0 HIGH.
- Assumed elongated shape (B_ric): ~470–580 HIGH per 2,000 objects per day.
- Measured TLE-to-TLE covariance: 0–3 HIGH; about half of encounters NEGLIGIBLE.
- Measured and ESA-floored: 0–4 HIGH.

**In a TLE pipeline the covariance model, not the encounter geometry, decides the tier.** A tool should state its covariance model next to every tier.

### 7.4 Measured TLE error (SGP4 TLE-to-TLE, LEO, robust σ radial / in-track / cross-track, km)

| Horizon (median) | Non-Starlink | n | Starlink | n |
|---|---|---|---|---|
| 0.33 d | 0.014 / 0.16 / 0.014 | 3,196 | 0.11 / 2.66 / 0.079 | 3,473 |
| 0.7 d | 0.030 / 0.31 / 0.044 | 770 | 0.15 / 7.26 / 0.11 | 4,721 |
| 1.05 d | n = 39, not used | | 0.28 / 20.3 / 0.13 | 183 |
| 6.3 d | 0.14 / 14.6 / 0.21 | 8,350 | 3.92 / 172 / 0.49 | 17,961 |

Growth is strongly non-linear (a straight-line fit was rejected). Along-track is ~100× radial; Starlink is ~15× worse in-track. Non-Starlink objects have no usable 1–5 day bin, so the model interpolates across 0.7 to 6.3 days.

### 7.5 Long encounters
Below 0.1 km/s the straight-line (short-encounter) assumption fails. With an elongated covariance the 2D Pc can be about 6× too low. A 3D Pc (Coppola 2012) is future work.

---

## 8. API reference

Interactive docs at `/docs` (Swagger) and `/redoc`. Every route except `/`, `/health`, `/api/auth/login`, `/api/auth/status` needs `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/`, `/health` | Status, stored object count, last refresh time, `database.last_fetch` |
| GET | `/api/auth/status`; POST `/api/auth/login`; GET `/api/auth/me` | Auth. Login errors: 401 wrong credential, 429 throttled (with `Retry-After`), 503 not configured |
| GET | `/api/tles` | List TLEs (`limit` up to 5000) |
| GET | `/api/tle/{norad_id}` | One TLE |
| GET | `/api/search` | Catalog search |
| POST | `/api/update-tles` | Background Celestrak fetch (429 inside cooldown) |
| GET | `/api/propagate/{norad_id}` | SGP4 state `hours_ahead` (0–168) after the TLE epoch; 422 if SGP4 refuses |
| GET | `/api/positions` | Bulk positions at now + `hours_offset`; at most 50 requested ids |
| GET | `/api/orbit-path/{norad_id}` | One period of ECI positions |
| GET | `/api/orbital-elements/{norad_id}` | Keplerian elements (angles in degrees) |
| GET | `/api/conjunctions` | Catalog search (see §6.4). 1–7 days, default 1 |
| GET | `/api/conjunctions/method` | Method and limits text |
| GET | `/api/conjunction-pair/{id1}/{id2}` | Pair's closest approach under 10 km in the next 7 days, or `no_risk` |
| GET | `/api/statistics` | Apogee, perigee, period, inclination summary |
| GET | `/api/export/conjunctions` | `format=json|csv`, 1-day horizon, top 10,000 events |

CORS allows GET and POST from `ORCA_CORS_ORIGINS` (default: the two Vite dev origins). `_conjunction_cache` and `_analytics_cache` in `api_server.py` are declared but unused (dead scaffolding; decide to wire up or remove).

**Changing the API:** update `api/types.ts` and `api/endpoints.ts` from a real response; keep unit suffixes on field names (`min_distance_km`, `alt_km`, `period_hours`); a new route is protected by default (add to `PUBLIC_PATHS` only if it must be open; `tests/test_auth.py` checks); launch the API, call the route, read the JSON, then load the view.

---

## 9. Frontend

### 9.1 Stack and layout
React 19, TypeScript, Vite 8, three.js (`^0.186.1`). No UI framework, router, state library, chart library or CSS framework. Tests use Node's built-in runner through `tsx`.

```
src/
  main.tsx, App.tsx, Workspace.tsx/.css
  api/        auth.ts, client.ts, endpoints.ts, session.ts, types.ts
  lib/        pure logic and tests (units, risk, time, histogram, coordinates, CSV...)
  hooks/      every fetch, poll and effect
  globe/      EarthScene.ts, earthTexture.ts (the only code touching three.js)
  components/ atoms/ molecules/ organisms/ views/   one folder per component
  styles/     tokens.css (dark + light), base.css
```

### 9.2 Component inventory
- **Atoms (15):** Badge, Button, Divider, Dot, Icon, IconButton, Kbd, Label, Mono, SheetHandle, Skeleton, Spinner, Swatch, Switch, Unit.
- **Molecules (45):** ArrowLink, AskButton, BlockHeader, Brand, Callout, ChatComposer, ChatMessage, CheckboxRow, CopyButton, CredentialRow, EmptyState, FactRow, FieldNote, FineOnly, GlobeTooltip, GlossaryTerm, Kpi, LegendItem, LoadingMark, MenuItem, NavTab, NoticeRow, NumberField, Pager, Panel, PrevNextNav, QuickReplyChips, RangeMarker, RiskBadge, SearchField, SearchResultItem, SectionHeader, SegmentedControl, SelectField, ShortcutRow, SkipLink, SortHeader, StatusField, StatusIndicator, StepDots, TextField, ThemeToggle, TleAgeChip, ToggleChip, ValueUnit.
- **Organisms (60):** AppBar, AppMenu, ApproachPreview, AskOrcaPanel, BarList, BottomSheet, CameraCard, CatalogFilterBar, CatalogSummaryCard, CatalogTable, ChartCard, ChartLegend, ChunkErrorBoundary, ConjunctionCard, ConjunctionControls, ConjunctionMethod, ConjunctionTable, DataQuality, DataStatusCard, DataTable, DebrisBackdrop, DonutChart, EvaluatorAccess, EventTimeline, FiltersCard, GlobeCanvas, GlobeLegend, HeatmapChart, Histogram, HomeHero, HomeKpis, JobProgress, KpiRow, LoginForm, MethodNote, Modal, ObjectCard, ObjectSearch, ObjectStanding, OrbitDistribution, PageLayout, PairCard, PlaybackBar, PopoverMenu, PrimaryNav, RegimeBreakdown, ReportBuilder, ReportDocument, ResultAnswer, ResultCaveats, RiskSummaryBar, SearchPopover, ShortcutsHelp, StaleDataBanner, StatusBar, TimeScrubber, TourCard, TourOverlay, UpdateCatalogPanel, ViewOptionsCard.
- **Views (10):** AnalyticsView, ConjunctionsView, DataView, GlobeView, HealthView, HomeView, LoadingScreen, LoginView, OverviewView, ReportsView.

### 9.3 Layer rules

| Layer | May | May not |
|---|---|---|
| atoms, molecules | Render props | Fetch, touch storage, import fetching hooks |
| organisms | Compose, hold local UI state | Call `fetch` |
| views | Wire hooks to organisms | Contain raw styling values |
| `hooks/` | Fetch, poll, subscribe, call `api/` | Render |
| `api/` | Only place that calls the backend | Be imported by presentational components |
| `lib/` | Pure functions | Touch DOM or network |
| `globe/EarthScene.ts` | Own the three.js scene (`mount / update / dispose`) | Be imported outside `GlobeCanvas` |

### 9.4 Views and keys

| Key | View | Shows |
|---|---|---|
| `1` | Overview | Catalog KPIs, sortable table, object detail, regime breakdown |
| `2` | Globe | three.js Earth, every object, orbit paths, time scrub up to +7 days |
| `3` | Conjunctions | Method panel, cancellable 1–7 day search, "Top N of M" with tier counts over all M, uncertainty and TLE age, Long badges, pair detail, event timeline, CSV/JSON export |
| `4` | Analytics | Server statistics plus histograms, density heatmap, bar lists and donut charts derived in the browser |
| `5` | Data | Catalog freshness and Celestrak refresh with progress |

Shortcuts: `/` focus search, `T` theme, `?` help, `Esc` back one step. One window listener in `hooks/useKeyboardShortcuts.ts`. Never fire while typing; ignore Ctrl/Meta/Alt chords; `SHORTCUT_GROUPS` is the single list the help panel renders.

### 9.5 Hooks
`useAsync`, `useSession`, `useHealth` (polls `/health`), `useCatalogUpdate`, `useConjunctionSearch` (cancellable, holds the whole result), `usePairAssessment`, `useClipboard`, `usePositions`, `useOrbitPaths`, `useTleById`, `useObjectSearch`, `useHashView` (view in URL hash, no router), `useKeyboardShortcuts`, `useTheme`, `useNow`, `useElapsed`.

### 9.6 Rulebook (rules.md)

**Everything is a component.** One component per file, one folder per component (`components/<level>/<Name>/<Name>.tsx` + `<Name>.css`), no barrel files, no file exports two components. Props in, UI out; presentational code never fetches or reads storage (exception: a host component such as `GlobeCanvas` that owns a third-party renderer). Props are typed and minimal. A component owns its own CSS; no `!important`; variants are props. No cross-level shortcuts. Pure logic in `lib/` with tests. Composition over configuration.

Audits (the second and third must return nothing):
```
find frontend/src/components -name "*.tsx" | xargs wc -l | sort -rn | head
grep -rnE "fetch\(|apiFetch|localStorage|sessionStorage" frontend/src/components
grep -rcE "^export (default )?function [A-Z]" frontend/src/components | grep -v ":[01]$"
```

**Honest data.**
- Show only what the data supports; an em dash beats an estimate.
- Read every label (propagator, TLE age, units) from the data.
- Four kinds of empty, each looking different: idle, awaiting data, not applicable (with reason), ran and found nothing (a neutral result, not an error).
- A failed request is not an empty result.
- State limits where the number is, not only in a footer.
- Caps are stated ("showing 500 of 9,812").
- Refuse impossible work before doing it.

**Units.** Every unit shown through the `Unit` atom; convert once at the boundary in `lib`; keep suffixes in TypeScript types.

**Tokens and themes.**
- Every colour is a CSS custom property in `tokens.css`; dark and light redefine the same names.
- No literal colours in component CSS (`grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" frontend/src/components` must return nothing).
- `--risk-*` for marks, `--risk-*-ink` for text (≥ 4.5:1 contrast); `readToken()` in `lib/tokens.ts` for three.js.
- Categorical `--cat-1..5`, sequential `--heat-0..2`. Status colours only for real status (TLE freshness, conjunction risk). Never colour alone.
- Chart choice by data: donut for ≤ 5 parts of a whole, bar for many categories, histogram for one distribution (log axis when spanning orders of magnitude), heatmap for two numbers over thousands of objects, time scatter on a log y axis coloured by tier for events. Anything not placeable on an axis is counted and stated.
- Numbers monospaced with tabular figures (`Mono`).

**State.** User preferences live in `App`; derived or transient state stays local; key a view by the record it shows; one home per fact; shared chrome is one component; long jobs show progress and can be cancelled; third-party renderers sit behind one interface; every effect returns its cleanup and async callbacks check they are current.

**Accessibility.** Real buttons and inputs, `:focus-visible` rings, ARIA only where valid, respect `prefers-reduced-motion` in CSS and in the three.js loop, do not block browser zoom.

**Process.** No new runtime dependency without approval (`react`, `react-dom`, `three` only). Run `npm run build` (type-checks) and look at it in a real browser. Update `api/types.ts` from a real response. Pure logic gets a test; reintroduce the bug once to see it fail. Add rejected design elements to rules.md with a grep that enforces them.

### 9.7 What the UI is honest about
TLE age chip next to every object; propagator named in `MethodNote` from the API; three kinds of "nothing"; past events flagged; method and limits above results; Pc carries its condition (1σ uncertainty, TLE age); totals not truncated; long encounters badged; units rendered by `Unit`/`ValueUnit`.

### 9.8 Auth in the client
`LoginView`/`LoginForm` post to `/api/auth/login`. `EvaluatorAccess` shows a shared demo credential (copy buttons, masked password, one-click fill) only if both `VITE_EVALUATOR_USERNAME` and `VITE_EVALUATOR_PASSWORD` are set at build time; anything set there is public in the bundle. `api/session.ts` stores the token, `api/client.ts` attaches it and returns the user to login on 401. `lib/authErrors.ts` maps 401/429/503 to plain messages.

### 9.9 Frontend ↔ backend contract
- Dev: Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`. Built bundle: set `VITE_API_BASE` and list the frontend origin in `ORCA_CORS_ORIGINS`.
- A 401 on a call that carried a token means the session ended; the client clears the token.
- Frontend relies on: refresh returns at once (poll `/health`); failed fetch recorded as `database.last_fetch`; search starts at now (flag past events); `/api/conjunctions` returns an object; method text from `/api/conjunctions/method`; per-event `uncertainty_km`, `tle_age_days`, `long_encounter`; propagator name in the response; `/api/positions` max 50 ids.
- Open items: a completion event or status field for the refresh task; component or browser tests (only `src/lib` is tested).

### 9.10 Tests and adding a piece
`npm test` runs every `src/lib/*.test.ts` (89 tests). No component tests. Visual checks were done with headless Chrome on 2026-10-15 and are not automated. To add a UI piece: pick the lowest level that fits; one component per file with its CSS and no raw colours; logic in `lib/` with a test, effects in `hooks/`, backend calls in `api/`; check both themes and the keyboard.

---

## 10. Deployment and operations

### 10.1 Where it runs (since 2026-10-08, cost ₹0)

| Part | Host | Address | Deployed by |
|---|---|---|---|
| Frontend | Vercel Hobby, project `orca`, root `frontend/` | https://orca-vitap.vercel.app | Vercel GitHub integration on pushes to `main` that change `frontend/` |
| Backend | Oracle Cloud Always Free VM `orca-micro` (`VM.Standard.E2.1.Micro`, AMD, 1 GB RAM + 2 GB swap), `ap-hyderabad-1` | https://129-159-230-127.sslip.io | GitHub Actions `.github/workflows/deploy-backend.yml` on pushes that change backend files |
| HTTPS | Caddy container, Let's Encrypt | ports 80, 443 | Same compose stack |

```
git push main
 |- frontend/ changed -> Vercel build (VITE_API_BASE baked in) -> orca-vitap.vercel.app
 '- backend changed  -> Actions: tests -> ssh: copy code, docker compose up --build -> /health check
browser --HTTPS--> vercel   and   --HTTPS (CORS)--> sslip.io -> Caddy :443 -> orca :8000 (unpublished) -> volume orca-data: ssa_data.db, auth.json
```

### 10.2 Shipping a change
Push or merge to `main`.
- Under `frontend/`: Vercel build (`vercel.json` skips it if `frontend/` did not change).
- `*.py`, `requirements.txt`, `Dockerfile`, `.dockerignore`, `deploy/**`, `tests/**`, the workflow: `test` job (`python -m unittest discover -s tests`) then `deploy` job.
- A failing test stops the backend deploy; the VM keeps the last good version.
- The deploy streams files to `~/ORCA`, runs `docker compose up -d --build`, checks `/health`. It never touches `deploy/.env` or the data volume.
- Re-run without a code change: Actions, Deploy backend, Run workflow.
- Changing a Vercel env var needs a manual redeploy.

### 10.3 Configuration

**Backend environment**

| Setting | Default | Live | Purpose |
|---|---|---|---|
| `PYTHONIOENCODING` | unset | `utf-8` (in image) | Must be utf-8 on Windows |
| `ORCA_AUTH_FILE` | `auth.json` beside `auth.py` | `/data/auth.json` | Credential file |
| `ORCA_DB_PATH` | `ssa_data.db` in cwd | `/data/ssa_data.db` | SQLite location |
| `ORCA_STATIC_DIR` | unset | unset | Serve a built `frontend/dist` from the API origin |
| `ORCA_CORS_ORIGINS` | two Vite dev origins | `https://orca-vitap.vercel.app` | Allowed origins (comma-separated) |
| `ORCA_TLE_GROUP` | `active` | `stations` | Celestrak group on refresh. Kept small on the 1 GB VM |
| `ORCA_FETCH_COOLDOWN_S` | 300 | 300 | Minimum seconds between fetches |

On the VM these come from `~/ORCA/deploy/.env` (template `deploy/env.example`), which also sets `ORCA_DOMAIN` and `ORCA_BUILD_TARGET` (`api` or `full`). Edit, then `cd ~/ORCA/deploy && sudo docker compose up -d`.

**Frontend (Vercel build time):** `VITE_API_BASE` = `https://129-159-230-127.sslip.io`; `VITE_EVALUATOR_USERNAME`/`VITE_EVALUATOR_PASSWORD` unset (set only if the hosted login is meant to be public).

**GitHub secrets:** `ORCA_SSH_KEY`, `ORCA_SSH_KNOWN_HOSTS`, `ORCA_HOST`, `ORCA_API_URL`.

### 10.4 Files
`Dockerfile` (stage `web` builds frontend; target `api` = Python 3.12 slim + uvicorn, one worker, `--proxy-headers`, non-root; default `full` adds the built frontend), `.dockerignore`, `deploy/docker-compose.yml` (orca + caddy; only Caddy publishes ports; volumes `orca-data`, `caddy-data`), `deploy/Caddyfile`, `deploy/env.example`, `deploy/ORACLE.md`, `.github/workflows/deploy-backend.yml`, `frontend/vercel.json`, `frontend/.vercelignore`.

### 10.5 Operating the VM
SSH: `ssh -i ~/.ssh/orca_oracle ubuntu@129.159.230.127`, then `cd ~/ORCA/deploy`.

| Task | Command |
|---|---|
| Status | `sudo docker compose ps`; `curl https://129-159-230-127.sslip.io/health` |
| Logs | `sudo docker compose logs -f orca` (or `caddy`) |
| Change password | `sudo docker compose exec orca python auth.py set-password` (signs everyone out) |
| Back up | `sudo docker run --rm -v deploy_orca-data:/d -v $PWD:/b alpine tar czf /b/orca-data.tgz -C /d .` |

Containers restart on crash and reboot.

### 10.6 Staying free
Oracle AMD micro VM 1 of 2; Ampere A1 0 of 4 OCPU/24 GB; 50 GB boot of 200 GB; one ephemeral public IP; egress small of 10 TB/month; Vercel Hobby 1 project; GitHub Actions ~1–2 min per deploy of 2,000 min/month; sslip.io + Let's Encrypt free.
- The Oracle account is Pay As You Go: Always Free is never billed, anything else is. Always Free compute exists only in the home region (Hyderabad). Another region, a larger shape, a reserved IP or a second disk can cost money. Keep a ₹1 budget alert.
- A1 (ARM, 2 OCPU / 12 GB) is the intended home but returned "Out of host capacity" on every attempt on 2026-10-08. Moving later: `deploy/ORACLE.md` §7.

### 10.7 Before trusting or sharing it
Python tests pass (CI enforces); `npm test && npm run typecheck` pass (not in CI); catalog refreshed recently (check TLE age); one shared credential with tokens that cannot be revoked individually (12 h) so rotate the password if it leaks; `ssa_data.db`, `auth.json`, `deploy/.env` and SSH keys never committed.

### 10.8 Remaining gaps

| Gap | Why it matters |
|---|---|
| Small VM (1/8 OCPU, 1 GB) | Fine for `stations` (19 objects); `active` (~16k) needs the A1 VM |
| **Engine v2 not deployed** | Changes `/api/conjunctions` shape; push backend and frontend together |
| Single SQLite file, one worker | No scaling past one VM |
| Auth | One shared credential, non-revocable tokens, throttle keyed on client address |
| No scheduled refresh; no completion event | |
| Frontend CI | `npm test` not run before deploy |
| IP-based hostname | A new VM means updating `ORCA_HOST`, `ORCA_API_URL`, `VITE_API_BASE`, then redeploying |

---

## 11. Working in the repo

### 11.1 Setup and run
```bash
python -m venv .venv
source .venv/Scripts/activate        # Windows Git Bash; .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cd frontend && npm install && cd ..
python auth.py set-password          # one operator credential (user admin), or --generate

PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000     # API, docs at /docs
cd frontend && npm run dev                                     # http://127.0.0.1:5173
curl -X POST http://127.0.0.1:8000/api/update-tles             # (with a bearer token) load data
```
Requires Python 3.9+ and Node 20.19+. Always use the project `.venv` (it pins the scipy/numpy/sgp4 versions results were produced with). **`PYTHONIOENCODING=utf-8` is mandatory on Windows.** `active` is ~9–16k objects (~2.7 MB) and Celestrak returns 403 if hit repeatedly: use `ORCA_TLE_GROUP=stations` for smoke tests. Local container try-out: `docker build -t orca .` then `docker run -p 8000:8000 -v orca-data:/data orca`.

### 11.2 Verifying a change
A passing import or type-check is not "done". Launch the affected process and hit it:
- **API change:** launch uvicorn, `curl` the endpoint, read the JSON.
- **Frontend change:** `cd frontend && npm run typecheck && npm test`, then launch API and `npm run dev`, load the view, check the console.
- **Orbit mechanics / conjunction change:** run on real seeded data (`stations` is enough) and check units against §4.8; re-check against the benchmark reference.

Tests: `.venv/Scripts/python.exe -m unittest discover -s tests` (89 tests) and `cd frontend && npm run typecheck && npm test` (89 tests).

### 11.3 Code conventions
- `orbit_mech_engine.py` imports no other project module.
- Prefer editing existing modules over adding top-level files (parse, propagate, detect, visualize, serve).
- Never hardcode an absolute path.
- Keep `r >= d + v*dt/2` and update `method_description()` if `STEP_S` or `REPORT_KM` change.
- `SGP4Propagator` raises `ValueError` on a rejected element set; callers handle it (API returns 422).
- Keep units exactly as §4.8.

### 11.4 Benchmarks workflow
Each benchmark reads a frozen snapshot (`benchmarks/data/catalog_*.tle` + `.json` manifest with sha256) and writes to `benchmarks/results/`. Install extras with `pip install -r benchmarks/requirements.txt`. **Never edit `benchmarks/legacy/`** and never point a baseline at production modules. Refresh snapshot and covariance tables with `powershell -ExecutionPolicy Bypass -File benchmarks\refresh_measured.ps1` (at most once a day). Snapshot `.tle` files are git-ignored; commit only the `.json`.

### 11.5 Before committing
- Do not commit `ssa_data.db` (rebuildable cache) or `auth.json`; if `.gitignore` misses them, fix `.gitignore`.
- Do not reintroduce a hardcoded path or a non-ASCII `print()` on the ingestion path.
- **Commits carry only the repository owner's identity.** No `Co-Authored-By:` trailer for Claude or any AI tool, no "Generated with ..." lines in commits or PR descriptions, whatever a tool defaults to. Never change `user.name`/`user.email`. Never use `--no-verify`.
- Before pushing, this must print only the owner's name:
  `git log --format='%an <%ae>%n%cn <%ce>%n%(trailers:key=Co-Authored-By)' | sort -u`
- Enforced by a local `commit-msg` hook (not versioned; recreate on a fresh clone) that rejects `Co-Authored-By:` and "Generated with ... Claude" lines. Rewriting history already on the remote needs the owner's explicit say-so.

---

## 12. Research study and paper

### 12.1 Objective
Using only public TLE data and an open pipeline (ORCA), measure how each algorithmic choice in TLE-based conjunction assessment changes what the pipeline reports (which encounters it finds, when, how close, how risky) and at what computational cost. The contribution is a **measured, reproducible, stage-by-stage accounting of where accuracy is lost**, not a new algorithm. Working title: *Where Accuracy Is Lost: A Stage-by-Stage Benchmark of TLE-Based Conjunction Assessment* (alternative: *ORCA: An Open Benchmark of Algorithmic Choices in TLE-Based Conjunction Assessment*). ORCA has no documented expansion; do not invent one.

### 12.2 Method
- **Frozen data:** S1 = 15,970 records exported from ORCA's database (epochs 2026-08-18 to 2026-10-10, median 2026-10-07); S2 = 15,932 records from one Celestrak request on 2026-10-14 (median epoch 2026-10-13); S3 (8.6 h after S2, median epoch 2026-10-14 03:19) added short horizons. sha256 manifests; no refetch mid-study. The `active` group is payloads only (no debris): a stated limitation.
- **Conjunction populations:** LEO (apogee ≤ 2,000 km), TLE age ≤ 7 days at window start, three random 2,000-object subsets (seeds 1–3), 24 h window from 2026-10-10 02:10 UTC.
- **Environment:** AMD Ryzen 9 5900HS (16 logical CPUs, 15.4 GB), Windows 11, Python 3.12.0, NumPy 2.5.2, SciPy 1.18.0, sgp4 2.27, single process with warm-up.
- **References with stated guarantees:** a dense 10 s SGP4 grid with a 200 km KD-tree provably catches every encounter under 10 km (bound 10 + 16 × 5 = 90 km ≤ 200 km).
- **Outputs:** every table or figure comes from a script in `benchmarks/` writing CSV to `benchmarks/results/`.

### 12.3 Experiments

| Exp | Stage | Compared | Reference |
|---|---|---|---|
| 1 | Propagation | ORCA engine, two-body + J2 secular, SGP4 | R1: SGP4 of the same TLE; R2: the next TLE of the same object |
| 2a | Screening cost | Brute force vs KD-tree | Exact pair-set equality |
| 2b | Screening recall | Snapshot screens, steps 20 s–1 h, radii 10–200 km | Dense 10 s SGP4 search |
| 3 | TCA | Grid; grid + parabola on d²; bounded Brent; Brent on range rate | Range-rate root to 1e-6 s |
| 4 | Pc | ORCA legacy; Foster 2D; closed form; Monte Carlo; curved-path integral | Closed form; MC |
| 5 | End to end | ORCA as built (A) vs corrected (B) | SGP4 near each claimed TCA |

### 12.4 Results

**Exp 1: propagation.**
- R1 (model consistency, median vs SGP4): ORCA engine 12 km at epoch, 15 km at 1 h, 83 km at 6 h, 303 km at 24 h, 1,280 km at 72 h, 2,920 km at 168 h. Two-body + J2 secular: 12, 9, 8, 11, 20, 83 km. Both start at ~12 km because mean elements are treated as osculating. J2 keeps cross-track at ~2 km while ORCA's engine reaches ~100 km within a day. **Adding J2 is the biggest single propagation fix** (~300 km to ~11 km at 24 h). Cost per state: SGP4 2 µs, J2 8 µs, ORCA engine 38 µs.
- R2 (TLE-to-TLE, 5–7 day gap, 15,041 LEO objects):

| Group | Method | Median error | Robust σ R / I / C (km) |
|---|---|---|---|
| Non-Starlink (4,432) | ORCA engine | 2,531 km | 99 / 324 / 1,108 |
| | J2 secular | 24.7 km | 0.82 / 35.3 / 1.45 |
| | SGP4 | 12.0 km | 0.13 / 14.2 / 0.20 |
| Starlink (10,609) | ORCA engine | 2,806 km | 117 / 1,972 / 175 |
| | J2 secular | 38.2 km | 2.53 / 33.3 / 2.47 |
| | SGP4 | 147.5 km | 3.46 / 160 / 0.44 |

- Real TLE error is extremely anisotropic: in-track ~100× radial, ~70× cross-track (non-Starlink).
- **Starlink anomaly:** SGP4 is worse than plain J2, and its error grows with |B\*| (SGP4 median 15, 49, 223, 383 km across B\* quartiles; J2 21, 29, 45, 87 km). Hypothesis, consistent with but not proven by the literature: Starlink fits absorb low-thrust station-keeping into B\*, which SGP4 extrapolates as drag. Starlink is 70 % of LEO in this catalog. Wording for the paper: "consistent with low-thrust station-keeping being absorbed into the fitted elements".

**Exp 2a: screening cost.** Pair sets identical at every size and instant (H1).

| Objects | Candidate pairs/step | Brute force | KD-tree | Speedup |
|---|---|---|---|---|
| 1,000 | 15.5 | 15.1 ms | 0.42 ms | 36× |
| 2,000 | 61.6 | 38.1 ms | 0.81 ms | 47× |
| 4,000 | 234 | 114 ms | 1.79 ms | 63× |
| 8,000 | 940 | 461 ms | 4.07 ms | 113× |
| 15,913 | 3,720 | 1,473 ms | 8.53 ms | 173× |

ORCA's pure-Python fallback took 1.02 s at 1,000 and 4.09 s at 2,000 objects (implementation, not algorithm). At ~9 ms per step, a 10 s step over 24 h costs ~75 s of screening: speed was never the problem, recall was.

**Exp 2b: screening recall** (event recall for miss < 10 km, 3 seeds, 6,214–6,803 reference encounters each):

| step \ radius | 10 km | 25 km | 50 km | 100 km | 200 km |
|---|---|---|---|---|---|
| 3600 s (ORCA) | 0.1 % | 0.2–0.3 % | 0.4–0.8 % | **1.0–1.2 %** | 2.0 % |
| 600 s | 0.4–0.6 % | 1.3–1.6 % | 2.6–3.2 % | 5.6–5.7 % | 10.1–10.7 % |
| 60 s | 3.8–4.0 % | 11.6–12.3 % | 21.5–23.7 % | 40.2–41.9 % | 69.7–71.2 % |
| 20 s | 10.2–11.0 % | 30.9–32.4 % | 55.8–58.1 % | 88.0–89.8 % | 100 % |

ORCA's setting by relative velocity: < 0.1 km/s 100 % (n = 4–10); 0.1–1 km/s 16–22 %; 1–5 km/s 1–3 %; 5–10 km/s 0.5–1.0 %; ≥ 10 km/s 0.4–0.7 %. Pair recall (flagged at any time) is 14–15 %. The sampling law 2r/(v·Δs) predicts 0.56 % at 100 km, 1 h, 10 km/s (matches). At 20 s / 200 km the sufficient condition r ≥ 170 km holds and recall is 100 %. ORCA's output is dominated by slow co-orbital Starlink pairs (top-100 export: 85 Starlink–Starlink, 21 % under 0.1 km/s). A first scoring that accepted a flag from a different pass of the same pair made coarser steps look better; counting only the encounter's own pass fixed it.

**Exp 3: TCA** (seed 1 medians; seeds agree to ~2 significant figures).

| Method | TCA error | Miss-distance error | Pair evals |
|---|---|---|---|
| Grid 60 s | 15 s | 119 km | 3 |
| Grid 10 s | 2.6 s | 16 km | 13 |
| Grid 1 s | 0.25 s | 353 m (p95 2.5 km) | 121 |
| Grid 60 s + parabola on d² | 12 ms | 0.84 m | 4 |
| Grid 10 s + parabola on d² | 0.06 ms | < 1 mm | 14 |
| Bounded Brent on d (local window) | 0.1 ms | < 4 mm | 12 |
| Brent root-find on range rate | < 5 µs | < 1 µm | 9 |

A plain grid is a poor miss-distance estimator (0.5 s at 10 km/s is 5 km). ORCA's global refinement (bounded Brent over ±6 h; a window holds ~15 approach minima): only 247–293 pairs per seed (8–9 %) are flagged by the hourly screen at all; of those it finds the closest approach 5.4–6.1 % of the time (vs 100 % for root-finding every minimum), reports a miss < 10 km for 13–16 % (truth 83–89 %), median reported − true miss 30 km, TCA outside the 24 h window 11–16 %; 19 vs 810 pair evaluations. Screen-plus-refinement together report a < 10 km miss for ~1 % of pairs that have one.

**Exp 4: Pc.**
- Foster matches the isotropic closed form to ≤ 1.4e-12; 2D Monte Carlo (2e6 samples, 99.9 % Clopper–Pearson) contains Foster for 50 of 50 top-Pc events per seed.
- **Legacy formula = Foster ÷ α² exactly** (α = miss/σ): median ~46× too high for α < 0.25, 0.87 for 1 ≤ α < 2, too low beyond ~1. Every legacy CRITICAL/HIGH event (455–550 per seed) is MEDIUM or LOW under Foster with identical inputs; tier agreement 49–50 %. With σ ≥ 0.5 km per object and ~10 m radii a correct Pc cannot exceed ~1e-4 even at zero miss, so CRITICAL is essentially unreachable.
- Ranking (Kendall τ vs miss distance; top-100 overlap): legacy 0.87–0.88 (96–99 %); Foster isotropic 0.41–0.43 (6–11 %); A = 3 0.25–0.26 (0–2 %); A = 10 0.22–0.23 (0–1 %). ORCA's "risk ranking" was effectively a miss-distance ranking.
- Monte Carlo convergence (three highest-Pc events, Pc ≈ 1.17–1.18e-6): zero hits up to 1e5 samples; ±15 % of Foster only at 1e8 (ratios 0.86, 0.93, 1.12); Foster inside the 95 % interval in 22 of 24 runs. At operational probabilities, MC is a validation tool, not an estimator.
- **Exp 4b (short-term encounter assumption):** within one pass the straight-line model holds from 0.1 km/s up (curved-path measure equals Foster; the fast control is exactly 1.00). Below 0.1 km/s with an elongated covariance (A = 10) Foster underestimates by ~6× (pass/Foster 5.9–6.3). Across passes, same-shell LEO pairs meet again every half orbit, so ±3 h accumulates 2–7× the single-pass value; ORCA reports one row per pair (a reporting choice, not a formula error).

**Exp 5: end to end** (seeds 1/2/3):

| | A (ORCA as built) | B (corrected) |
|---|---|---|
| Events reported | 231 / 204 / 203 | 6,576 / 6,802 / 6,244 (< 10 km) |
| A's events claiming < 10 km that really are | 2 of 32 / 3 of 34 / 4 of 29 | |
| Median \|claimed − true\| miss | 90 / 98 / 85 km | |
| B's encounters A also finds | **8 / 6 / 7** (of ~6,500) | |
| TCA outside the 24 h window (A) | 27 / 28 / 25 | |
| Runtime (single process) | 2.6 s | 24–25 s |
| Kendall τ, miss vs Pc | 0.87 | 0.41 (B_iso), 0.34 (B_ric) |

A's recall is ~0.1 %. B (SGP4; 20 s / 200 km; range-rate root-finding; Foster) costs ~9× more and reproduces the reference to within one event per seed.

**Tiers by covariance** (per seed, 2,000 objects, 24 h): B_iso 0 HIGH (15–37 MEDIUM); B_ric (assumed) 471–576 HIGH; **measured** 0–2 HIGH in Exp 4 (1–3 in Exp 5), 3,400–3,840 NEGLIGIBLE, τ 0.30–0.31; **measured + ESA floor** 0–4 HIGH (Exp 4: 1/0/1; Exp 5: 1/4/1), τ 0.303–0.310. The floor barely moves results here because most TLEs were 2–9 days old at TCA; for fresher TLEs it would matter (engine v2 applies it by default).

### 12.5 Three claimed contributions
1. **Screening recall** on public TLEs against time step, radius and relative velocity (sampling law 2r/(vΔt)).
2. **Stage-by-stage audit of a working tool:** propagator drift ~300 km/day, TCA 5–6 %, Pc off by 1/α², end-to-end ~0.1 %; a validated corrected pipeline now serves as ORCA's engine.
3. **Covariance decides the tier:** measured TLE error is anisotropic (in-track ~100× radial; Starlink ~15× worse); assumed covariances give 0 to ~500 HIGH while the measured one gives 0–4; Pc ranking departs sharply from miss-distance ranking.

Prior art to cite, not claim: k-d tree / grid screening, Pc formulas and their comparison, covariance from public TLE history (COVGEN), snapshot blindness in a synthetic setting.

### 12.6 What the study does not establish
No validation against operational CDMs; R2 reference (a later TLE) is itself imperfect and manoeuvres count as propagation error; covariance from three snapshots over one day, LEO only, with no usable 1–5 day non-Starlink bin; counts come from 2,000-object subsets of a payload-only catalog over one window (ratios and recall fractions should carry over, absolute counts scale ~N²); runtimes from one machine and implementation-dependent; hard-body radii are name-keyword assumptions; absolute Pc inherits those assumptions (only legacy-vs-Foster on identical inputs is assumption-free).

### 12.7 Hypotheses
H1 KD-tree and brute force return identical sets (confirmed). H2 recall depends on step and relative velocity; 1 h misses most fast encounters (confirmed). H3 propagator differences grow with horizon (confirmed). H4 legacy Pc differs from Foster by a factor depending on α; 2D MC agrees with Foster (confirmed; 3D MC not done). H5 Pc ranking and miss ranking disagree (confirmed).

### 12.8 Paper
- Structure: I Introduction; II Preliminaries; III Literature Review; IV Methodology; V Results and Discussion; VI Conclusion and Future Work. Tables T1 data/environment, T2 experiment design, T3 screening, T4 Pc, T5 end to end. Figures F1 pipeline, F2 propagation error vs horizon, F3 recall vs step by velocity band, F4 legacy-Pc/Foster ratio vs α, F5 MC convergence.
- Files: `paper_draft.md` (long draft, ~5,000 words), `paper/main.tex` and `main.pdf` (IEEE conference version, compiled with Tectonic), figures in `benchmarks/figures/`, `references.bib` (all TITLE-TODO fields filled).
- Rules for continuing: never invent results or citations; a proposed experiment is not a run experiment; check every citation at its source; do not change production modules to fit the paper without the owner's decision.
- Still to do: choose the conference and adapt the template; fill author department/university/emails and confirm author order; check the four SECONDARY references in a library; archive the git-ignored TLE snapshots somewhere citable (release asset or Zenodo) and cite their sha256; more daily snapshots to fit error growth.

---

## 13. Literature and prior work

### 13.1 Verification status
CONFIRMED = source opened (publisher/Crossref/agency PDF/author page). SECONDARY = seen only in other papers' reference lists. **Still SECONDARY:** Foster & Estes 1992 (`foster1992`), Alfano & Negron 1993 (`alfano1993`, no DOI exists), Alarcón-Rodríguez et al. 2002 (`alarcon2002`), and the pages of `peterson2001covgen`. Re-check these in a library before submission.

### 13.2 Corrections to earlier text
- Alfano & Negron 1993 fit cubic polynomials to the distance waveform; it is **not** range-rate root-finding. Cite as related work only. ORCA's method is Brent root-finding on range rate (Brent 1973).
- The "smart sieve" first author is Alarcón-Rodríguez, not Rodríguez.
- Liu et al. 2024 covers manoeuvre frequency only (about every 2 days in Shell 1, about daily in Shells 2–5) and says nothing about TLE accuracy; Lang & Jiang 2025 supports the prediction-error claim.
- Cite Flohrer et al. 2009 (opened) for anisotropy, not the 2008 AMOS paper.
- `alfano2007review`: the often-quoted pp. 719–746 conflicts with a 44-page paper, so pages are omitted.

### 13.3 Key findings that shape the claims
1. TLE-to-TLE comparison **underestimates error near epoch** (Kelso 2007). Flohrer et al. 2009 at-epoch LEO values are 0.102 / 0.471 / 0.126 km (n = 8,454), 3–9× the measured 0.33-day values. Hence the ESA floor.
2. **Starlink.** CelesTrak publishes SupGP elements fitted to SpaceX ephemerides (`sup-gp.php?FILE=starlink`), separate from `GROUP=active`. On 2026-10-14 the regular Starlink TLEs were a median 6.8 km (IQR 2.8–15.8) from SupGP at median age 0.6 d; SupGP vs SpaceX ephemeris median 0.22 km (10,451 Starlinks). Lang & Jiang 2025 attribute prediction error to continuous low-thrust propulsion; Jankovic 2026 (unrefereed) gives ~1 km at 6 h and ~38 km at 7 d. No peer-reviewed proof that B\* specifically absorbs thrust.
3. **NASA does not recommend TLE-based CA** (Handbook §1; App. E: TLEs lack a meaningful covariance).
4. **TLEs are model-specific** (Spacetrack Report #3). SGP4 first converts Kozai mean motion to Brouwer's form.
5. Levit & Marshall 2011: SGP4 TLE error grows ~1.5 km/day against ILRS precise orbits; all-vs-all on ~200 cores in about a minute, so frame motivation as accessibility, not impossibility.
6. Low-velocity encounters: Coppola 2012 and Alfano 2009 (long-term encounters; error bounds).

### 13.4 Closest prior work

| Work | Did | Did not |
|---|---|---|
| George & Harvey 2011 | Six screening tools on the public catalog (11,807 objects, 7 d, 10 km); 33–326 missed conjunctions from filter pads | No step/radius sweep; no Pc; no open code |
| Auman et al. 2025 + Aerospace/OSC test set (Mar 2026, CC0) | Screening accuracy requirements; public answer key from 1 Jan 2025 Space-Track TLEs | Pc excluded; no step sweep. **Usable as external ground truth** |
| Woodburn et al. 2009 | Filter-induced misses (4 of 5,338) | No recall vs step; no Pc |
| George 2011; Budianto-Ho 2014 | Swept-volume k-d/hash/sweep screening | Do not measure point-snapshot recall loss |
| Medhin & Servadio 2026 | "Boundary blindness" of grid screening (7.09 % to 0.55 % at 0.5 s), temporal vs geometric | Synthetic (MOCAT-MC), two step values, no TLEs, TCA or 2D Pc |
| Sonawane 2026 (read in full) | Python grid/k-d screening on ~15,830 CelesTrak objects, ~61× fewer pair checks; parabolic TCA; Foster Pc with assumed covariance | No step sweep, recall, velocity conditioning, TCA/Pc accuracy or measured covariance; a speed/HPC paper |
| Alfano 2007 | Foster/Chan/Patera/Alfano compared on ~60,000 cases; all accurate to ~2+ significant figures | Pc-formula comparison is prior art |
| Stevenson et al. 2023 (*Adv. Space Res.* 72(7)) | ML all-vs-all screening vs classical filters | Simulated, non-public data; no public-TLE penalty |
| SOCRATES (Kelso & Alfano 2005) | Public daily one-vs-all screening since 2004 | One-vs-all, commercial tooling |
| Orekit 12 | Short-term Pc methods (Alfano, Patera, Chan, Laas, Alfriend) | No catalog screening module found |
| COVGEN (Peterson et al. 2001) | Covariance from historical TLE series | Prior art for measured covariance |

### 13.5 Novelty, final wording
Not found in the literature: a sweep of snapshot-screening recall against time step by radius and relative velocity on public TLEs; one open pipeline attributing accuracy loss stage by stage (screening, TCA, Pc) and auditing an existing tool; the tier swing between assumed and measured (ESA-floored) covariance. **Not novel:** k-d tree screening, Pc from TLEs, the Pc formulas, covariance from TLE history, snapshot blindness in synthetic settings.

### 13.6 Still to do on sources
Check Alfano's AGI "Review of Conjunction Probability Methods for Short-term Encounters" before calling a Pc-formula comparison new; re-check or drop each SECONDARY entry. Optional strengtheners: validate Exp 2b against the Auman/Aerospace answer key; rerun Exp 1 for Starlink against CelesTrak SupGP; add the Flohrer-floor covariance variant (done in Exp 4/5).

### 13.7 Celestrak facts

| Item | Finding |
|---|---|
| Endpoint | `https://celestrak.org/NORAD/elements/gp.php`, 3-line TLE text, selected by `GROUP` |
| `last-30-days` | 404 on 2026-08-18 (removed or renamed) |
| `active` | 200 with real data, ~2.7 MB, ~48k lines, 15,968 objects after the 2026-10-03 refresh |
| Rate limiting | Repeated `active` requests returned 403; `stations` (~20 objects) kept returning 200. Looks volume-based and transient |
| Smoke test | `curl -s -o /dev/null -w "%{http_code}\n" "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"` |

Not yet checked: Celestrak's published rate guidance; whether `FORMAT=json`/OMM would give richer fields. Research to do next: backoff design, Space-Track CDM validation (needs an account), error split by altitude/eccentricity/TLE age, TraCSS answer-key validation, Starlink vs SupGP.

---

## 14. Risk register (what can break)

Severity is for a user trusting the output. **Seen** = it happened; **Latent** = the code allows it.

### Critical: wrong output that looks right

| # | Risk | Status | Mitigation |
|---|---|---|---|
| P1 | Stale TLEs | Latent, always | TLE age beside every object; refresh before reading results |
| P2 | Simplified propagator (two-body + drag, 297 km median at 24 h) | Seen, fixed 2026-10-15 | Engine v2; old model only as `TwoBodyDragPropagator` and in `benchmarks/legacy/` |
| P3 | Uncertainty model decides the tier (0 to ~500 HIGH per 2,000 objects per day) | Always | Stated beside every Pc and in the method panel; refresh with more daily snapshots |
| P4 | Unit mismatch (degrees vs radians; rad/min vs rad/s) | Seen (historical) | Units contract; unit suffixes in frontend names. Unit-boundary tests still missing |
| P5 | Search window began at first TLE epoch | Seen, fixed 2026-10-03 | `start_epoch` defaults to now; `tests/test_search_start.py` |
| P6 | Event before now | Latent | Frontend flags past events and says to rerun |
| P7 | Missed fast pass (~99 % missed at 1 h / 100 km) | Seen, fixed 2026-10-15 | 20 s gap-free screen |
| P8 | Hard-body radius by name keyword (unknown name gets 3.0 m) | Latent | None; documented |
| P29 | Long encounters (< 0.1 km/s) can be ~6× too low | Always | Flagged; closest approach per pair only; 3D Pc is future work |
| P30 | Starlink TLEs ~15× worse in-track | Measured | Uncertainty model keeps Starlink separate |

### High: stops, or silently loses data
P9 Windows console encoding crash (seen; set `PYTHONIOENCODING=utf-8`, prints now ASCII); P10 dead/renamed Celestrak group (seen; default `active`; a CI smoke test would have caught it); P11 Celestrak 403 after repeated `active` requests (seen; cooldown added; backoff still open); P12 fetch failure looked like empty catalog (seen, fixed with `fetch_group_checked`); P13 hardcoded absolute path (seen; use `DB_PATH`); P14 SQLite with two processes (latent; single operator only); P15 no completion event for refresh (latent; frontend polls).

### Medium: visible failure
P16 auth not configured (503 until `set-password`); P17 login lockout (429 + `Retry-After`); P18 export endpoint on Windows (seen, fixed); P20 long searches (1.5–2 min per day of horizon; Cancel stops the browser, not the server); P21 dead cache variables; P26 undersized hosting VM (live group is `stations`); P27 API hostname tied to the VM's IP / sslip.io DNS; P28 accidental cloud charges (Pay As You Go account; ₹1 budget alert); P31 evaluator credential is public if `VITE_EVALUATOR_*` is set.

### Low
P22 partial CI (Python tests gate deploys; frontend tests, typecheck and a live Celestrak smoke test are not in CI); P23 unpinned requirements (lower bounds only); P24 large binaries in git (`demo.gif`, `pre.png`, `Video Project 1.mp4`); P25 document drift (check ORCA_MASTER.md §4 after any engine change).

**Token risk:** a signed token cannot be revoked individually; a copied token works until it expires (12 h) or the password changes. Acceptable for a trusted-network tool.

---

## 15. Decision log (newest first)

| Date | Decision | Key reasoning |
|---|---|---|
| 2026-10-15 | **Conjunction engine v2** | See §6. Verified against the reference; searches now take minutes; response shape changed so deploy together; tiers conditional on uncertainty model |
| 2026-10-15 | Evaluator access panel on sign-in page | Shows a shared demo login when both `VITE_EVALUATOR_*` are set at build; public in the bundle; hosted copy does not set them (open decision) |
| 2026-10-14 | Freeze the original engine before changing it | Tag `orca-as-built-2026-10-14`, copies in `benchmarks/legacy/`; legacy-Pc check and Exp 5 reproduce exactly after the freeze |
| 2026-10-08 | Host on free tiers: Vercel + Oracle Always Free + GitHub Actions | Few free tiers have real CPU (Render/Koyeb/serverless give ~0.1 vCPU or short timeouts); Oracle has the most compute and keeps SQLite on a persistent disk. A1 had no capacity, so an AMD micro VM with `stations`. Rejected: Hugging Face Spaces (sleeps, no persistent disk), student credits, Hetzner (~€4/mo), Fly.io/Railway (paid), Cloud Run (background work throttled) |
| 2026-10-03 | Finding: engine propagator far less accurate than documented | Measured on 600 TLEs: median 16.6 km at epoch, 80 at 6 h, 297 at 24 h, 1,277 at 72 h, 2,902 at 168 h (`tests/measure_propagator_error.py`). Resolved by v2 |
| 2026-10-03 | Server-side export uses a per-request temp directory | `/tmp` does not exist on Windows; handler was `async def` doing minutes of CPU. Now plain `def`, `tempfile.mkdtemp`, removed after response, UTF-8 |
| 2026-10-03 | Remove the Streamlit dashboard; React is the only front end | Streamlit read SQLite directly and needed its own auth gate, failure handling and path fixes; one place (the API) now enforces auth. Recoverable from git history |
| 2026-10-03 | Report failed Celestrak fetches | `fetch_group_checked` returns a `FetchResult`; `tle_fetch_status` cache key exposed as `database.last_fetch`; failure leaves catalog and `last_update` alone; cooldown returns 429 |
| 2026-10-03 | Search starts at "now", not first TLE epoch | A 45-day-old catalog produced events 41–44 days in the past; disagreed with `assess_pair` |
| 2026-08-18 | Fall back to `stations` for local seeding after the `active` 403 | Kept the default `active` since the throttling looked transient |
| 2026-08-18 | Fix hardcoded `dashboard.py` DB path | The correct `DB_PATH` constant already existed |
| 2026-08-18 | Force `PYTHONIOENCODING=utf-8` rather than strip the check mark | Smaller, safer fix; later the prints were removed too |
| 2026-08-18 | Default group `last-30-days` to `active` | Old group returned 404; `active` chosen over `stations` for usefulness |
| Pre-existing (superseded) | Two-phase screening (KD-tree + bounded Brent) | Superseded by v2; coarse pass measured ~1 % recall |
| Pre-existing (superseded) | "Alfano 2D" Pc with `σ(t) = σ₀ + rate × days` | Superseded; was off by 1/α² |
| Pre-existing | SQLite as the only datastore | Zero infrastructure; single-writer only |

---

## 16. Tried and failed / tried and implemented

### 16.1 Tried and failed (lessons)
- **Two snapshots to fit TLE error growth:** one bin (all ~6-day gaps); a line fit went negative near zero. Take snapshots across time; interpolate log-log.
- **Small-radius closed form for Pc at large miss:** up to 7 % off many σ away. Use Foster's 1D integral with Gauss–Legendre.
- **Miss distance from the parabola's minimum value:** median 63 m off (up to 2 km). Re-propagate exactly at the parabola's time; apply the 10 km cut after refinement with margin.
- **J2 rates added to the Kozai mean motion:** ~270 km/day in-track error. Use Brouwer `a`; test rates against SGP4's own.
- **Scoring a screen hit within ±step of the encounter:** counted other passes. Count only the encounter's own pass.
- **"Alfano 2D" Pc formula:** 1/α² error. Test any probability formula against a closed form.
- **Single bounded Brent over ±6 h:** 5–6 % success. Refine every range-rate sign change.
- **Hourly screen at 100 km:** 1.0–1.2 % recall. Choose step and radius from r ≥ d + v·Δt/2, not runtime.
- **Two-body propagator named `SGP4Propagator`:** use SGP4 with TLEs; name things for what they are.
- **Trusting a brief written without the code:** v1 had 17 errors (research_paper_brief.md §1).
- **`last-30-days` default; hammering `active`; Unicode check mark on the ingestion path; hardcoded developer path; search starting at first TLE epoch; `/tmp` export:** see §14 and §15.
- **Treating screening as risk assessment:** keep the stages separate.
- **A two-way `ScatterPlot` organism:** replaced by a heatmap, bar lists and donuts; the reason is not recorded (~16k points overplot is a plausible one).
- **`pipx install oci-cli` on Windows:** 260-character path limit. Use `python -m venv C:\oci`.
- **Using a new OCI API key immediately:** 401 for minutes, per service. Wait, retry on 401 only, make provisioning idempotent.
- **Oracle Ampere A1 in Hyderabad:** "Out of host capacity"; faster than ~2 min retries also hit 429; home region only.
- **`iptables -I INPUT 6` on Ubuntu 24.04:** the REJECT rule is at position 5. Insert at the REJECT line found at run time.

### 16.2 Tried and implemented (confirmed working)
- **Pipeline:** gap-free screening; exact TCA; search from now with optional `start_epoch`; vectorised Foster Pc with measured, floored uncertainty; real SGP4 via `satrec_from_elements`; method text served by the engine; upsert by NORAD id; checked fetch statuses; pure foundation layer; vectorised single-process search.
- **Research method:** freeze the baseline; frozen snapshots with sha256; references with a stated guarantee; predict then measure; three seeds; check code against a reference implementation; drive the real UI in headless Chrome (`playwright-core`); compile the paper with Tectonic.
- **Operations:** `stations` for development; `PYTHONIOENCODING=utf-8`; portable paths; verify by launching; `.gitignore` for `*.db` and `auth.json`.
- **Deployment:** one Docker image with two targets; Caddy in front with the API port unpublished; `--proxy-headers`; push-to-deploy (first run on `d9e0690`: tests 37 s, deploy 35 s); cross-origin frontend with preflight verified; free tier and home region only (19 objects: positions 0.04 s, search 0.6 s).
- **Security:** fail-closed guard with a small allow-list; stdlib-only scrypt and HMAC; password rotation rotates the secret; single login message plus throttle.
- **Frontend:** atomic hierarchy; pure logic in `lib/` with tests; one point of contact with the backend; tokens only; three.js confined to `EarthScene.ts`; URL-hash view; honest data states; cancellable search and polled refresh; method and limits beside numbers; evaluator panel; Vite dev proxy; browser-side CSV/JSON export.

---

## 17. Backlog

### Release
- [ ] **Merge `fix/honest-conjunctions` into `main` and push** (deploys v2; backend and frontend together; needs the owner's go-ahead).
- [x] Hosted site shows the evaluator login (2026-11-16).
- [x] Update `docs/screenshots/` (2026-11-15: all six pages, after the declutter pass).

### Accuracy
- [ ] Take a catalog snapshot daily for about a week (`benchmarks\refresh_measured.ps1`) to fill the 1–5 day gap, then copy the new bins into `CovarianceModel.MEASURED`.
- [ ] Split the error measurement by altitude band, eccentricity and TLE age.
- [ ] Validate screening against the TraCSS answer key (Auman et al. 2025).
- [ ] Starlink: compare against CelesTrak SupGP.
- [ ] Long encounters: 3D Pc (Coppola 2012).

### Final report (MD/final_report.md)
- [x] `ORCA Final Report.docx/.pdf` built from the teammate's template by `report/generator/` (53 pages, 21 figures, 11 tables), every claim checked against the repository (2026-11-15/16).
- [ ] Biodata: mobile numbers, addresses, photos from the team.
- [ ] Decide whether to redraw Figure 1 (three tiers, two features the code does not have).
- [ ] Update the deployment paragraph after `ui/design-system-v2` is merged, and rebuild.

### Paper
- [ ] Choose the conference and adapt `main.tex` (currently 7 pages, IEEE two-column; the LNCS version is in `ORCA_overleaf/`).
- [ ] Authors' department, university, e-mails (TODO in `paper/main.tex`); confirm author order.
- [ ] Check the 4 SECONDARY references in a library.
- [ ] Archive the TLE snapshots somewhere citable and cite their sha256.

### Reliability
- [ ] Wire up or remove `_conjunction_cache` / `_analytics_cache`.
- [ ] A job endpoint with progress and server-side cancel for the minutes-long search.
- [x] Export fix, fetch cooldown, leftover `last-30-days` callers (done).

### Verification and testing
- [x] 89 Python tests and 89 frontend tests exist.
- [ ] Missing: unit tests for `TLEParser._parse_bstar` and for the `TLE.inclination` (degrees) vs `OrbitalElement.i` (radians) boundary.
- [~] CI runs Python tests before backend deploy. Missing: frontend `npm test`/`typecheck` and a live "fetch `stations`, assert non-empty" smoke test.
- [~] Click through all five views in a real browser. Done 2026-10-15: sign-in and Conjunctions. To do: Overview, Globe, Analytics, Data.

### Product direction and hosting
- [ ] Decide the default demo configuration (catalog size, horizon) balancing realism and latency.
- [ ] Multi-user hosting stays out of scope unless decided (would need per-user accounts and a concurrent-safe datastore).
- [ ] Move the backend to an Oracle A1 VM when Hyderabad has capacity, then set `ORCA_TLE_GROUP=active` (`deploy/ORACLE.md` §7).
- [ ] Bump `actions/checkout` and `actions/setup-python` to Node 24 versions.
- [ ] Scheduled catalog refresh on the VM (respecting Celestrak's limit).
- [ ] Optional stable hostname (e.g. DuckDNS).

### Housekeeping
- [x] Large assets: `demo.gif`, `Video Project 1.mp4` and `final.png` purged from the history and git-ignored (2026-11-15). Still open: `ssa_data.db`, and `pre.png` remains.
- [ ] Take a `pip freeze` snapshot if reproducibility over time matters (requirements have lower bounds only).

### Open questions (PRD / brief)
Default demo configuration; whether to wire up or remove the dead caches; target conference/template and whether references count in the page budget; whether to fetch debris or a fuller catalog; whether precise ephemerides (ILRS CPF, "R3") are worth the effort.

---

## 18. Capstone proposal and team

**Title:** Conjunction Screening and Collision-Risk Analysis of Objects in Low Earth Orbit: A Scenario-Based Comparative Evaluation Using Public Orbital Data. Domain: SSA / orbital mechanics / data analysis. Tools: Python, SGP4/Skyfield, Orekit, public TLEs. Dated August 2026 (compiled 18 August 2026).

| Role | Person |
|---|---|
| Team | Surya Pratik (23BCE8602), Abhinav Pentani (23BCE8597), Shaik Saifuddin (23BCE7306), Aditi Sharma (23BCE8592) |
| Faculty guide | Ashish Kumar Dalai |
| Faculty ID / Department ID | 70054 / 627 (assigned by column position in a screenshot; not independently verified) |

**Proposal content:** background (screening is a filter, not a risk assessment); problem (public services such as SOCRATES are one-vs-all; Stevenson et al. 2023 is the closest work but uses non-public data; nobody reports the screening quality lost with public TLEs only); objectives (reproducible TLE pipeline; coarse filters: apogee–perigee, orbit-path, time window; TCA/miss/relative velocity; simple Pc with assumed radii and covariance; distance vs Pc ranking; threshold sensitivity); bounded scope (public TLEs, SGP4, parametric uncertainty, not an operational service); six-phase 18-week timeline (literature, propagation, screening, refinement and Pc, scenario runs, paper and viva); validation plan (check propagation against published positions; confirm the filtered pipeline retains every event from a brute-force search on a reduced catalogue; check Pc against worked examples; report sensitivity to radius and covariance); six references.

**Session decisions:** PDF format; 3 pages; references re-sourced from the project literature review after an initial error; Stevenson et al. added as primary; reference count trimmed to 6; author order Surya, Abhinav, Saif, Aditi.

**Flagged but not acted on:** the literature review's "Gap 2" (quantify the screening penalty of public TLE/SGP4 versus high-fidelity ephemerides) would turn the project from a comparative study into a measured result. The proposal kept the safer framing; the later benchmark work effectively delivers the measurement. Also: SOCRATES outputs and limits should be known before the viva; reported Orekit capabilities should be verified at orekit.org (done 2026-10-14: Pc methods yes, catalog screening no).

**Viva practice questions:**
1. Why can't a TLE be fed to a two-body propagator and called accurate?
2. Derive why a snapshot screen with step Δt and radius r catches every encounter with miss d and speed v if r ≥ d + vΔt/2.
3. Why were KD-tree and brute-force candidates identical, and what was the real screening problem?
4. Why is d², not d, exactly quadratic in time for straight-line motion, and why does it matter for TCA?
5. Why did ORCA's ±6 h Brent search usually find the wrong approach?
6. Show why the legacy Pc is off by 1/α² and which events it overstates.
7. How many Monte Carlo samples are needed for Pc = 10⁻⁶ at 10 % error, and why?
8. What is the encounter plane, and when does the 2D model fail?
9. Why is TLE error mostly in-track, and what were the radial vs in-track measurements?
10. Why might SGP4 do worse than plain J2 for Starlink?
11. What does "the covariance decides the tier" mean, and what supports it?
12. What did prior work already do, and what exactly is new?
13. What does the study not establish?

**Good research habits used:** freeze data; build a reference you can trust (r ≥ d + vΔt/2); check the code against the claim; validate before believing (Foster vs exact formula, MC vs Foster, J2 rates vs SGP4's, three seeds); predict then compare; keep the baseline reproducible with tags and frozen copies; say what you did not establish; cite only for what a source says.

---

## 19. ML status

ORCA has **no machine-learning component**. No module trains, loads or calls a model; `requirements.txt` has no ML library; no endpoint returns a model prediction; the only outbound call is to Celestrak. Stevenson et al. (2023) benchmarks deep-learning all-vs-all screening and is cited as the closest published work, not implemented. `ml.md`, `ml_model_integration.md` and `failmlmodel.md` are placeholders. The real failure modes are in §14.

**If ML is added later:** define the task (e.g. predict which candidate pairs survive refinement); state training data (public TLEs only); baseline to beat (the KD-tree pipeline, brute force on a reduced catalogue as ground truth); metrics (recall of true close approaches first, then candidate count); measured results on held-out scenarios with TLE age and regime. Integration seam: put model calls inside an existing module (likely `conjunction_detection.py`); expose through the existing API behind the auth guard; treat the remote call as untrusted and return a distinguishable error (do not repeat the Celestrak empty-list mistake); show model name and version in the UI beside its output; document new env vars in `deployment.md`; update `system_design_and_boundary.md`. For each failure mode record the trigger input, what the output looks like (it must not look normal), how it was found and the guard.

---

## 20. Known inconsistencies between source documents

Trust the code, then ORCA_MASTER.md. Items found while consolidating:

| # | Where | Says | Others say / reality |
|---|---|---|---|
| 1 | `conjunction_engine_v2.md` §3 | "All 88 Python tests" | Every other file says 89 |
| 2 | `paper_draft.md`, `learning_guide.md`, brief | 8-page paper | `README.md`, `TASKS.md`, `tried_and_implemented.md` say `main.pdf` is 6 pages (IEEE two-column); `paper_draft.md` header also says "8-page IEEE version" |
| 3 | `README.md` (frontend table) | Analytics view: "histograms and a scatter plot" | `frontend.md` and `tried_and_failed.md` §8: the scatter was replaced by a heatmap, bar lists and donut charts |
| 4 | `system_architecture_2026-09-11.md` §1 diagram | "Brent TCA" | v2 uses a parabola plus exact SGP4 refinement (§6) |
| 5 | `pain.md` P4 | "No Python unit tests yet" | 89 Python tests exist; only the unit-boundary tests are still missing (TASKS.md) |
| 6 | `ARCHITECTURE.md` header | Reads as current | `ORCA_MASTER.md` lists it as "earlier architecture"; `system_architecture_2026-09-11.md` is the detailed current one (both were reconciled on 2026-10-15) |
| 7 | `research_paper_brief.md` §3 and parts of §1/§4 | Describe ORCA as built (two-body, 1 h screen, legacy Pc) | Intentional: that is the paper's frozen baseline. Production is v2 |
| 8 | `ORCA_MASTER.md` header, `README.md` | Hosted copy runs the original engine | True until the branch is merged and pushed |
| 9 | `PRD.md` §3 G5 | "3D globe, 3D globe, risk tables" | Typo (duplicate item) |
| 10 | `deployment.md` §10 | Points to `pain.md` and `tried_and_failed.md` "sections 9–12" | Correct (OCI/Docker hosting entries are #9–#12) |

---

## 21. Glossary

- **TLE:** two-line element set. Mean elements fitted to SGP4 at one epoch; no covariance.
- **SGP4:** the propagation model TLEs are fitted for. Converts Kozai to Brouwer mean motion first.
- **TEME / ECI:** the inertial frame used for state vectors.
- **B\*:** the drag term in a TLE.
- **Conjunction:** a close approach between two objects. **Screening:** finding pairs that could come close. **TCA:** time of closest approach. **Miss distance:** separation at TCA.
- **RIC:** radial / in-track / cross-track error frame. TLE error is mostly in-track.
- **Encounter plane:** plane perpendicular to the relative velocity at TCA.
- **Pc:** probability of collision. **Foster's method:** numerical integral of the 2D Gaussian over the hard-body disc. **Hard-body radius:** combined size of the two objects.
- **α:** miss distance divided by combined σ.
- **Short vs long encounter:** the 2D model assumes a fast straight-line pass; relative speed under 0.1 km/s breaks it.
- **Recall:** fraction of true encounters a method finds. **Kendall τ:** rank similarity (1 identical, 0 unrelated).
- **Starlink / SupGP:** CelesTrak supplemental elements fitted to SpaceX ephemerides.
- **SOCRATES:** CelesTrak's public daily one-vs-all screening. **TraCSS:** the US Office of Space Commerce conjunction service, with a public validation answer key.
- **CDM:** conjunction data message (operational; not used here).
- **Always Free / A1 / sslip.io / Caddy:** Oracle's free tier; its ARM shape (2 OCPU / 12 GB intended); a wildcard DNS service giving `<ip-with-dashes>.sslip.io`; the HTTPS reverse proxy.

---

## 22. Source document map

| File | Role |
|---|---|
| `ORCA_MASTER.md` | Reference reconciled against the code; document map; drift log |
| `README.md` | Overview, quick start, API table, risk model, limitations |
| `ARCHITECTURE.md`, `system_architecture_2026-09-11.md` | Architecture (earlier and current detailed) |
| `system_design_and_boundary.md` | Scope, outside-the-boundary, trust boundaries, quality boundary |
| `flow.md` | End-to-end data flow |
| `conjunction_engine_v2.md` | The v2 engine: why, how, checks, limits |
| `frontend.md`, `rules.md`, `integration_handoff.md` | Frontend structure, rulebook, frontend–API contract |
| `deployment.md` | Local and hosted deployment |
| `AGENTS.md` | Fast path for coding agents and contributors |
| `PRD.md`, `intent.md` | Requirements; why the project exists |
| `DECISIONS.md`, `TASKS.md` | Decision log; backlog |
| `pain.md`, `tried_and_failed.md`, `tried_and_implemented.md` | Risks; what failed; what worked |
| `external_research.md`, `literature_verification.md`, `references.bib` | Outside systems and sources; verification log; bibliography |
| `research_paper_brief.md`, `paper_draft.md`, `learning_guide.md` | Research brief and every measured result; long paper draft; the story with practice questions |
| `LEO_Conjunction_Project_Context.md` | Capstone proposal and session record (kept as a dated record) |
| `final_report.md` | The capstone final report: build (`report/generator/`), figure and number sources, open items |
| `ml.md`, `ml_model_integration.md`, `failmlmodel.md` | Placeholders: no ML component |
