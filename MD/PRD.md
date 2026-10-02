# ORCA — Product Requirements Document

## 1. Summary

ORCA is a
free-and-open-source Space Situational Awareness (SSA) platform. It ingests live
satellite tracking data, propagates orbits, screens the catalog for collision risk,
and presents results through a REST API and an interactive web frontend — using only
open-source components (no STK, no paid Cesium tier).

## 2. Problem

Space debris and satellite congestion are a growing operational risk (Kessler
syndrome). Commercial/government SSA tooling (STK, AGI, paid SaaS) is expensive
and closed. There is no lightweight, inspectable, freely-runnable reference
implementation that takes a learner or small team from "raw TLE text" to
"here are the conjunctions that matter this week."

## 3. Goals

- **G1 — Ingest**: Pull live TLE catalogs from Celestrak and persist them reliably.
- **G2 — Propagate**: Compute accurate satellite state vectors (position/velocity)
  at arbitrary future times, using SGP4 as the authoritative model.
- **G3 — Screen**: Detect close-approach (conjunction) events across the catalog
  in better-than-quadratic time, and rank them by collision probability using a
  standards-calibrated method (NASA CARA / ESA thresholds).
- **G4 — Expose**: Serve all of the above over a documented REST API (FastAPI/Swagger).
- **G5 — Visualize**: Provide a non-technical-friendly web frontend (3D globe,
  3D globe, risk tables, catalog analytics).
- **G6 — Portfolio/education**: Be readable end-to-end by a single engineer; every
  module should be explainable in an interview or a capstone defense.

## 4. Non-Goals

- Not a certified/operational SSA system — outputs are not conjunction-avoidance
  grade and must not be used for real maneuver decisions.
- No high-fidelity perturbation model beyond SGP4 + the engine's simplified J2/drag
  approximation (no full numerical integrator, no solar radiation pressure, no
  precise atmospheric density models).
- No user authentication/multi-tenancy — single-operator/local or trusted-network
  deployment only, as built today.
- No mobile app; the frontend is desktop-browser oriented.

## 5. Users / Personas

| Persona | Need |
|---|---|
| Capstone evaluator / recruiter | Wants to see working orbital mechanics, a real API, a real UI, in under 5 minutes. |
| Student/learner | Wants to read short, well-scoped Python modules that map 1:1 to textbook astrodynamics concepts. |
| Downstream developer | Wants a REST API to pull propagated states / conjunctions into their own tool without standing up SGP4 themselves. |

## 6. Functional Requirements

1. System **must** parse standard 3-line TLE text (name + line1 + line2) including
   BSTAR compressed-exponential notation.
2. System **must** persist TLEs in SQLite with upsert semantics (`INSERT OR REPLACE`
   keyed by NORAD ID).
3. System **must** propagate any stored object to a state vector at a caller-supplied
   future time (0–168 hours ahead) via `GET /api/propagate/{norad_id}`.
4. System **must** search the full stored catalog for conjunctions within a
   caller-supplied time horizon (1–30 days) and return risk-classified results.
5. System **must** classify conjunction risk into 5 tiers (CRITICAL/HIGH/MEDIUM/
   LOW/NEGLIGIBLE) using fixed Pc thresholds.
6. System **must** expose catalog statistics (apogee/perigee/period/inclination
   min/max/mean/median).
7. System **must** allow exporting conjunction results as CSV or JSON.
8. Frontend **must** visualize orbits on a 3D globe (with orbit paths and a time scrub) for a
   user-selected subset of the catalog.
9. Frontend **must** allow triggering a live Celestrak refresh from the UI.

## 7. Non-Functional Requirements

- **Runs free**: zero paid API keys or licenses required for core functionality.
- **Local-first**: must run entirely on a single machine (SQLite, no external DB).
- **Reasonable latency**: conjunction search over the full "active" catalog
  (~9–11k objects) should complete via KDTree screening, not brute-force O(N²),
  within the FastAPI default request timeout for realistic (≤30 day) horizons.
- **Cross-platform**: must run on Windows, macOS, and Linux. (See
  [DECISIONS.md](DECISIONS.md) for a Windows console-encoding issue this
  constraint already surfaced.)
- **Observability**: every fetch/parse/insert step logs enough to diagnose a
  silent-empty-catalog failure without a debugger.

## 8. Success Metrics

- Fresh clone → running API + frontend with live data in under 10 minutes,
  following only the README.
- `POST /api/update-tles` against Celestrak's `active` group succeeds and the
  catalog count matches the fetched record count (currently blocked by Celestrak
  rate-limiting under repeated test traffic — tracked in TASKS.md).
- Conjunction search over the seeded catalog returns at least one plausible,
  non-error result end-to-end (verified manually — ISS/`stations` catalog,
  see DECISIONS.md).
- Frontend loads all five views without an unhandled exception (the old Streamlit dashboard, since removed, was previously
  failing on every page load due to a hardcoded local path — fixed, see
  DECISIONS.md).

## 9. Open Questions

- What conjunction time horizon / catalog size is the intended "default demo"
  configuration, given full-catalog search cost?
- Is multi-user / hosted deployment ever in scope, or is this permanently a
  local/portfolio tool? (Affects whether auth, containerization, and a real DB
  are worth building.)
- Should the in-memory `_conjunction_cache` / `_analytics_cache` mentioned in
  `api_server.py` be wired up, or removed as dead scaffolding?

## 10. References

- [README.md](README.md) — module-level design documentation (source of truth for
  implementation details).
- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture and data flow.
- [DECISIONS.md](DECISIONS.md) — decision log, including bugs found/fixed while
  first getting the system running.
- [TASKS.md](TASKS.md) — current backlog.
