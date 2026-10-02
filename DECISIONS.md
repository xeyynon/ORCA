# DECISIONS.md

A running log of notable decisions, in the lightweight ADR style: what was
decided, why, and what alternatives were considered. Newest first.

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
