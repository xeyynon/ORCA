# DECISIONS.md

A running log of notable decisions, in the lightweight ADR style: what was
decided, why, and what alternatives were considered. Newest first.

---

## 2026-11-15 - No breadcrumb strip; the status bar splits health from context

**Context:** the owner asked why the breadcrumb strip ("Mission control / Globe / A x B") was needed, and whether the status bar was used well.

**Decision:** removed the breadcrumbs everywhere. ORCA is two levels deep, and every drilled-in state already has a card that names it and closes it (the conjunction card, the object card); the strip repeated that and, on the Globe, sat over the canvas. The status bar now has two groups: the system's health on the left (API, data age as the median with a dot, refreshed as relative time; one click opens the Data page; no object count, which every catalogue view already states) and then, after a hairline, the context (camera on the Globe, the UTC clock), all in one line on the left (owner, same day). On the Globe (desktop) the bar is a slim strip floating at the bottom left, so the globe runs to the bottom of the screen and the legend and playback bar sit in the freed bottom-right corner. The data age is the median, not the oldest: after a refresh one leftover 90-day-old element set made a fresh catalogue read as stale.

## 2026-11-15 - Sign-in page keeps its animated debris scene and glass card (approved exception)

**Context:** the 2026-11-15 UI/UX audit (finding #10) flagged the sign-in page's animated `DebrisBackdrop` scene, its glows and the frosted glass card as decoration the playbook bans (UI-15, UI-17). It was removed in the polish pass on a misread "proceed".

**Decision:** the owner asked for it back ("add it again"). The sign-in page keeps the animated scene, the glows and the glass card, always dark. This is an approved exception to the no-decoration rule for this one page; do not flag it again. The other sign-in fixes stay: the reason under the disabled Sign in button and the labelled "Use these details" button.

## 2026-10-15 - Conjunction engine v2: SGP4, gap-free screening, exact TCA, Foster Pc, measured uncertainty, honest UI

**Context:** The benchmark study (entry of 2026-10-14) measured the original engine on public TLEs against a dense SGP4 reference:

| Stage | Measured fault |
|---|---|
| Screening (1 h / 100 km) | Saw ~1 % of encounters under 10 km during their pass |
| TCA (single ±6 h Brent search) | Found the closest approach for 5–6 % of flagged pairs |
| Propagator (two-body + drag) | Drifted ~300 km a day |
| Pc formula | Off by exactly 1/α², so every CRITICAL/HIGH label was an artefact |
| End to end | Reported ~0.1 % of the close approaches |

**Decision:**
- **Engine.** Rebuild `conjunction_detection.py`:
  - SGP4 for every object every 20 s;
  - KD-tree radius = 10 km + v_max × 10 s (gap-free by r ≥ d + vΔt/2);
  - a parabola on d² at each grid minimum, then exact SGP4 states plus one range-rate step;
  - vectorised Foster 2D Pc;
  - per-object RIC uncertainty measured from successive TLEs (Starlink separate), floored at ESA's at-epoch values;
  - long encounters (< 0.1 km/s) flagged and deduplicated per pair.
- **Propagator.** `orbit_mech_engine.SGP4Propagator` becomes real SGP4. The old model is kept as `TwoBodyDragPropagator`.
- **API.**
  - `/api/conjunctions` returns counts over everything found plus the top `limit` events; the horizon is 1–7 days and `search_step_hours` is ignored.
  - New `/api/conjunctions/method`.
  - The pair, propagate and export endpoints use the new engine.
- **UI.**
  - No step control.
  - A method-and-limits panel written by the server.
  - Counts over all approaches ("Top N of M").
  - Uncertainty, TLE age and "Long" markers.
  - A probability note saying tiers depend on the uncertainty model.

**Verified:**
- Against the reference on three seeds, every encounter under 10 km was found, except slow pairs deduplicated by design and one at the first grid step. Miss distances agree to a median of 0.5 mm.
- Full catalog: ~426,000 approaches per day in ~1.5–2 min.
- 89 Python and 89 frontend tests pass.
- The UI was driven in headless Chrome, and its screenshots led to three fixes.

**Consequence:**
- Searches take minutes instead of ~20 s.
- The response shape changed, so the backend and frontend must deploy together.
- Tiers are now explicitly conditional on the uncertainty model.

**Alternatives considered:**
- Keep the hourly screen and raise the radius: radius would have to be ~29,000 km to be gap-free at 1 h.
- Swept-volume screening (George 2011; Budianto-Ho 2014): more code for the same guarantee.
- Monte Carlo Pc: needs ~10⁸ samples at Pc ≈ 10⁻⁶.

## 2026-10-15 - Evaluator access panel on the sign-in page

**Decision:** When `VITE_EVALUATOR_USERNAME` and `VITE_EVALUATOR_PASSWORD` are both set at build time, the sign-in page shows a shared demo login. It includes copy buttons, a masked password with show/hide, and a button that fills the form. The local values live in `frontend/.env.local` (git-ignored).

**Consequence:** ORCA has a single login, so the shown credential *is* the app's login, and anything set there is public in the bundle. The hosted copy does not set them; whether it should is an open decision (TASKS.md).

## 2026-10-14 - Benchmark the conjunction pipeline; freeze the original engine before changing it

**Context:** A research paper needed stage-by-stage measurements of ORCA as built, and the planned fixes would change that code.

**Decision:**
- Tag the original as `orca-as-built-2026-10-14` (eb53f1c).
- Keep verbatim copies in `benchmarks/legacy/`, and have every benchmark import those.
- Run the experiments on frozen catalog snapshots (sha256 manifests), with three seeds, against references with stated guarantees.

**Verified:** after the freeze, the legacy-Pc check and Exp 5 reproduced the committed results exactly.

**Where:**
- code: `benchmarks/`
- results: `benchmarks/results/`
- write-up: research_paper_brief.md §10, paper_draft.md, `paper/`

---

## 2026-10-08 - Host ORCA on free tiers: Vercel frontend, Oracle Always Free backend, deploys from GitHub

**Context:** The project needed a shareable hosted copy at zero cost. The backend's conjunction search is CPU-heavy and uses a process pool, SQLite allows one writer, and `auth.json` is a secret.

**Decision:**
- **Backend:** Docker (`Dockerfile`, target `api`) behind Caddy for automatic HTTPS, on an Oracle Cloud Always Free VM in the home region (`ap-hyderabad-1`). The hostname is `<ip>.sslip.io`, so no domain or DNS signup is needed. Data and credential live on a Docker volume. One uvicorn worker.
- **Frontend:** Vercel Hobby, root directory `frontend/`, with `VITE_API_BASE` pointing at the API and the Vercel origin listed in `ORCA_CORS_ORIGINS`. Public URL https://orca-vitap.vercel.app.
- **Delivery:** Pushes to `main` deploy both. Vercel's GitHub integration handles the frontend. `.github/workflows/deploy-backend.yml` runs the Python tests, then ships the code to the VM over SSH and rebuilds.
- **New settings:** `ORCA_DB_PATH`, `ORCA_TLE_GROUP` and `ORCA_STATIC_DIR` in `api_server.py`. Local behaviour is unchanged when they are unset.

**Why this shape:** The free tiers with real CPU are few. Render, Koyeb and serverless platforms give ~0.1 vCPU or short timeouts, which do not fit a minutes-long search. Oracle Always Free has the most compute, and the VM keeps SQLite on a persistent disk.

**What actually happened:** Ampere A1 (2 OCPU / 12 GB) was the plan, but Hyderabad returned "Out of host capacity" on every attempt. The live backend is the always-free AMD micro VM (1 GB RAM + 2 GB swap) with the small `stations` group until A1 is available (TASKS.md). Other regions were ruled out because Always Free compute exists only in the home region.

**Alternatives considered:** Hugging Face Spaces (free 2 vCPU / 16 GB, but sleeps and has no persistent disk), DigitalOcean or Azure student credits, a Hetzner VPS (~€4/month), Fly.io or Railway (paid), Cloud Run (background work throttled).

---

## 2026-10-03 - Finding: the engine propagator is far less accurate than the docs implied

> **Resolved 2026-10-15:** conjunction work and `/api/propagate` now use SGP4 (engine v2, top of this file).

**Context:** The docs said `orbit_mech_engine.SGP4Propagator` is "simplified" without a number. Measured it against the `sgp4` package (`tests/measure_propagator_error.py`): 600 random TLEs from the 15,968-object catalog, position difference in km at several hours after each TLE's own epoch. Reproduce with `PYTHONIOENCODING=utf-8 python tests/measure_propagator_error.py`.

| Hours after TLE epoch | Median error (km) | 90th percentile (km) | Max (km) |
|---|---|---|---|
| 0 | 16.6 | 21.2 | 207.7 |
| 1 | 13.6 | 20.4 | 180.8 |
| 6 | 80.1 | 123.3 | 232.2 |
| 24 | 296.8 | 443.8 | 1,679 |
| 72 | 1,277 | 1,360 | 10,600 |
| 168 | 2,902 | 3,695 | 6,731 |

**What it means:** The engine propagator is two-body motion plus an exponential drag term. It has no J2, so the orbit plane and perigee never precess. At the epoch itself the median is already 16.6 km (about 0.13 degrees in-track, with only ~0.9 km radial). That is consistent with comparing mean elements treated as osculating, but the cause was not isolated. After a day the error is hundreds of km, and after three days it is thousands.

**Where it matters:** `ConjunctionSearch` and `ConjunctionDetector` (the screening, TCA, miss distance and Pc) and `GET /api/propagate/{id}` use this propagator. `/api/positions`, `/api/orbit-path/{id}` and the globe already use the `sgp4` package (the API labels them "SGP4 (sgp4 library, TEME frame)"). Screening uses a 100 km threshold, so an error of 300 km at 24 h is larger than the threshold itself: both missed events and false candidates are expected, and miss distances beyond the first day should not be trusted.

**Decision:** Recorded only. No code was changed in this step. The recommended fix is to make conjunction work use `sgp4.api.SatrecArray` (already used by `/api/positions`) and keep the engine propagator out of anything that reports miss distance. That changes the numbers users see, so it is listed in TASKS.md for a decision.

**Caveats:** One random sample (seed 1), TLE epoch as the start, `sgp4` taken as ground truth (it is itself only as good as the TLE). Error was not split by altitude or eccentricity.

---

## 2026-10-03 - Server-side conjunction export uses a per-request temp directory

**Context:** `GET /api/export/conjunctions` wrote to the fixed path `/tmp/conjunctions.<ext>`. That path does not exist on Windows, so the endpoint failed there, and two simultaneous exports would have overwritten each other. It was also `async def` while doing minutes of CPU work, which blocked every other request.

**Decision:** Write to `tempfile.mkdtemp`, remove it with a response background task, make the handler a plain `def` (FastAPI runs it in its thread pool), and write files as UTF-8 so non-ASCII object names survive on Windows.

**Verified:** `tests/test_export.py` (5 cases, calling the handler directly because the test client needs an extra package). 42 tests pass. A real export with a token was not run.

---

## 2026-10-03 - Remove the Streamlit dashboard; the React (Vite) app is the only front end

**Context:** `dashboard.py` (1,571 lines) was the first front end. The React app covers the same five areas (overview, globe, conjunctions, analytics, data) and talks to the API. Streamlit read the SQLite file directly, so it needed its own sign-in gate, its own fetch-failure handling and its own path fixes, and it listened on all interfaces until it was bound to localhost that same day.

**Decision:** Deleted `dashboard.py` and `.streamlit/`, dropped `streamlit` from `requirements.txt`, stopped the process on :8501, and removed Streamlit from the live docs (README, AGENTS, ARCHITECTURE, PRD and the MD set). Earlier entries below that mention Streamlit are history and were left as written. `Analytics.py` and its Plotly dependency stay, because the API uses them.

**Consequence:** One front end, one place where auth is enforced (the API). `pre.png` (a Streamlit screenshot) is no longer referenced by the README but the file is still in the repo. The old code is recoverable from git history (`git show HEAD:dashboard.py`; the last version with the sign-in gate was never committed).

---

## 2026-10-03 - A failed Celestrak fetch is reported, not swallowed into an empty list

**Context:** `CelestrackClient.fetch_group` caught every failure and returned `[]`, so a 403 (rate limit), a 404 (dead group) and "nothing came back" were indistinguishable. `POST /api/update-tles` also stamped `last_update` even when the fetch had failed, so a refused refresh looked like a successful one.

**Decision:** Added `fetch_group_checked`, which returns a `FetchResult` (`tles`, `status`, `http_status`, `detail`) with status `ok | empty | rate_limited | not_found | http_error | network_error`. `fetch_group` is unchanged for existing callers. The update task stores the outcome under the `tle_fetch_status` cache key, exposed as `database.last_fetch` in `/health`. On anything but `ok` it leaves the catalog and `last_update` alone. The React Data view shows the outcome and a "Celestrak did not provide new data" state.

**Also:** removed the non-ASCII check mark and cross from the parser's per-record prints, and bound Streamlit to 127.0.0.1 (Streamlit was removed later the same day).

**Cooldown:** `POST /api/update-tles` now answers 429 with `Retry-After` if a fetch started within `ORCA_FETCH_COOLDOWN_S` (default 300 s). The stamp is written when the fetch starts, so double clicks are caught. The leftover `last-30-days` callers (`Analytics.py`, `conjunction_detection.py`, parser `__main__`) now use `active`, and the Streamlit Fetch button uses the checked fetch and leaves the catalog alone on failure.

**Verified:** `tests/test_fetch_status.py`, `tests/test_fetch_cooldown.py` (mocked HTTP, 8 cases); 33 Python tests pass; `tsc` clean; API restarted and `/health` returns `last_fetch`. A real refused fetch was not triggered, to avoid rate-limiting Celestrak.

**Consequence:** `PYTHONIOENCODING=utf-8` is still advisable but a forgotten variable no longer truncates ingestion on the parser's own prints. Other `print` calls in `parser_pipeline.py` were checked and are ASCII.

---

## 2026-10-03 — Catalog conjunction search starts at "now", not at the first object's TLE epoch

**Context:** `ConjunctionSearch.search_catalog` used the first object's TLE epoch as the start
of its time grid ("same behavior as your original"). With a 45-day-old catalog, every result of
a "7-day horizon" search had a time of closest approach 41–44 days in the past. It also
disagreed with `ConjunctionDetector.assess_pair`, which already defaulted to `utcnow()`, so the
pair re-assessment in the UI said "no conjunction" for events the catalog search had reported.
Found while building the React frontend, which shows relative times ("41d 8h ago").

**Decision:** `search_catalog` takes an optional `start_epoch` that defaults to `datetime.utcnow()`.
Pass an explicit value to reproduce a historical window. All four callers (API search, API
export, Analytics, Streamlit) use the default, so they became forward-looking together.

**Verified:** `tests/test_search_start.py` (fails on the old behaviour, passes on the new). Against
a freshly refreshed 15,968-object catalog, a 1-day search took 19 s and returned TCAs from
2026-10-02 16:06 to 2026-10-03 22:21 UTC.

**Consequence:** A few events can still land slightly before now: each TCA is refined within
±`refine_window_hours` (6 h) of its grid step, so one found at the first step can resolve up to
6 h earlier. The React app flags any event already in the past rather than hiding it. Results
are still only as good as the TLE age and the simplified propagator (see README, Limitations).

---

## 2026-08-18 — Fall back to `stations` TLE group for local seeding after Celestrak rate-limited `active`

**Context:** After fixing the `active`/`last-30-days` group name (see below),
repeated test requests against `GROUP=active` (~2.7MB, ~48k lines) during
development triggered `403 Forbidden` from Celestrak, while the much smaller
`GROUP=stations` (~20 objects) continued to return `200`.

**Decision:** Seeded the local database directly via a one-off script using
`GROUP=stations` to unblock development and verification, rather than waiting
out or working around Celestrak's rate limit. Left the *default* group in
source as `active` (per the product's actual requirement — see PRD.md G1) since
this looked like transient/volume-based throttling, not a permanent block.

**Consequence:** Anyone re-running `POST /api/update-tles` shortly after
several prior calls should expect a possible `403` and empty-catalog result,
not a crash — `CelestrackClient.fetch_group` already degrades to `[]` and logs
the error rather than raising. If this recurs often in normal use, worth
adding a client-side cooldown/backoff, or a smaller default group. Tracked in
TASKS.md.

---

## 2026-08-18 — Fix `dashboard.py` hardcoded absolute DB path

**Context:** Every Streamlit dashboard page crashed on load with
`sqlite3.OperationalError: unable to open database file`. Root cause:
`dashboard.py` line 84 hardcoded `db_path=r"C:\Users\Lkd\Desktop\proj\ssa_data.db"`
— the original author's local machine path — instead of using the
already-defined, portable `DB_PATH = Path(__file__).parent / "ssa_data.db"`
constant declared at the top of the same file.

**Decision:** Replaced the hardcoded path with the existing `DB_PATH`
constant. No new abstraction introduced — the correct mechanism already
existed in the file and simply wasn't used at this call site.

**Consequence:** Dashboard now runs on any machine/checkout location.

---

## 2026-08-18 — Force `PYTHONIOENCODING=utf-8` at process launch instead of removing the checkmark character

**Context:** `parser_pipeline.py`'s TLE parser prints `✓ Success: {id}` per
successfully parsed record. On Windows, Python's default stdout encoding is
the console codepage (`cp1252`), which cannot encode `U+2713`
(`CHECK MARK`). This raised `UnicodeEncodeError` mid-parse, which — because it
happened inside a FastAPI `BackgroundTasks` job — failed silently from the
caller's perspective (the HTTP response had already returned `200 "update
started"`), leaving the catalog empty with only a traceback in the server log.

**Decision:** Launch both the API server and the dashboard with
`PYTHONIOENCODING=utf-8` set, rather than editing the print statements. This
was the smaller/safer intervention for verifying the app runs correctly, and
keeps the fix at the operational layer (how the process is launched) rather
than changing application code under time pressure.

**Alternative considered:** Strip non-ASCII characters from log/print
statements in `parser_pipeline.py`. Not done — would touch more lines for
equivalent effect, and `PYTHONIOENCODING=utf-8` is the standard fix for this
whole class of Windows console-encoding issue, not a one-off patch.

**Open follow-up:** This must be documented (done, here + AGENTS.md +
ARCHITECTURE.md) so it isn't rediscovered by every new contributor on
Windows. Consider whether a `.env`/launch script should set this
automatically — tracked in TASKS.md.

---

## 2026-08-18 — Change default Celestrak TLE group from `last-30-days` to `active`

**Context:** `api_server.py` and `parser_pipeline.py` both hardcoded
`CelestrackClient.fetch_group(group="last-30-days")` as the default/only group
fetched. Celestrak has removed or renamed that group — the endpoint now
returns `404 Not Found`, so the catalog was permanently empty on every fresh
install, with the failure logged but not surfaced anywhere a user would see it
(`/api/statistics` just silently returns `{}`).

**Decision:** Changed the default group to `active` (Celestrak's general
actively-tracked-payloads catalog, confirmed returning `200` with real TLE
data at decision time). Asked the project owner to confirm this choice over
the smaller `stations` group before changing shipped defaults — `active` was
selected as the more useful general-purpose default for propagation/conjunction
demos.

**Consequence:** New installs get real orbital data out of the box again.
Because `active` is a large response, this is also what surfaced the
rate-limiting behavior described above — worth keeping in mind if the default
is revisited.

---

## (pre-existing) — Two-phase conjunction screening: KDTree pre-screen + Brent's-method TCA refinement

> **Superseded 2026-10-15** by engine v2 (top of this file). The coarse first pass measured ~1 % recall, and the ±6 h Brent search found the closest approach 5–6 % of the time.

**Context:** Naively checking every pair of objects at every time step across
a multi-thousand-object catalog is O(N²) per step and does not scale.

**Decision (as implemented, documented in README.md):** Phase 1 propagates the
full catalog at a coarse `search_step_hours` resolution and uses
`scipy.spatial.cKDTree` to find candidate pairs within `initial_screen_km`
(default 100 km) in roughly O(N log N). Phase 2 refines only the candidate
pairs' Time of Closest Approach via bounded Brent's method
(`scipy.optimize.minimize_scalar`), rather than a fine-grained time sweep.
Falls back to O(N²) brute force only if SciPy is unavailable.

**Consequence:** Conjunction search scales to realistic catalog sizes at the
cost of a coarse first pass potentially missing an extremely fast, extremely
close approach that occurs entirely between two screening steps. This
tradeoff is inherent to fixed-step pre-screening and is accepted as
appropriate for a portfolio/demo-grade system (see PRD.md Non-Goals — this is
explicitly not conjunction-avoidance-grade).

---

## (pre-existing) — Alfano 2D Gaussian approximation for collision probability, not a full 3D covariance model

> **Superseded 2026-10-15.** The implemented formula was not Alfano's and was off by 1/α². It is replaced by Foster's 2D integral with a measured, ESA-floored RIC uncertainty. The thresholds are kept and are now sourced to NASA's CA handbook. See engine v2 at the top of this file.

**Context:** True conjunction-assessment-grade probability of collision
requires propagated 3×3 (or 6×6) covariance matrices per object, which this
system does not have (no orbit determination / tracking uncertainty pipeline
upstream — only bare TLEs).

**Decision (as implemented):** Use a simplified Alfano 2D Gaussian method with
a time-growing scalar position-uncertainty model (`CovarianceModel`:
`σ(t) = σ₀ + growth_rate × days`) and NASA CARA/ESA-calibrated Pc thresholds
for risk classification, rather than attempting a full covariance pipeline
the system has no real data to support.

**Consequence:** Results are directionally correct and useful for
ranking/triage, explicitly not for real avoidance maneuvers. This is
documented as a Non-Goal in PRD.md and should stay that way unless a real
orbit-determination/covariance source is added upstream.

---

## (pre-existing) — SQLite as the only datastore, shared by direct import rather than over HTTP

**Context:** Two front ends (FastAPI, Streamlit) both need the same TLE data.

**Decision (as implemented):** Both processes import `parser_pipeline` and
open their own connection to the same `ssa_data.db` file directly, rather than
the dashboard calling the API over HTTP, or standing up a client/server
database.

**Consequence:** Zero infrastructure to run locally; no auth/network layer
between the two. Does not scale past single-machine/single-writer use — see
ARCHITECTURE.md §3 and PRD.md open questions for what would need to change if
that ever matters.

## 2026-11-15: The project README lives at the repository root again

**Context:** An earlier commit (`7ecaae9`) moved `README.md` into `MD/` with the other documents. GitHub shows a repository's README only from the root, `.github/` or `docs/`, so the repository page showed none (owner: "the readme is not visible in github").
**Decision:** `README.md` is back at the root; its links were rewritten for that location (`MD/...` for the documents, `docs/screenshots/...` for the preview). The MD files that linked to it now point to `../README.md`.
