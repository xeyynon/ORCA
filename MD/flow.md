# Data Flow

> End-to-end data flow from raw input to analyst output. Read from the code on 2026-10-15 (conjunction engine v2, branch `fix/honest-conjunctions`).

## 1. Overview

```
Celestrak gp.php (3-line TLE text)
   |  CelestrackClient.fetch_group(group)          parser_pipeline.py
   v
TLEParser: name + line1 + line2 -> TLE dataclass (BSTAR decoded)
   |  TLEDatabase insert (INSERT OR REPLACE by NORAD id)
   v
ssa_data.db  (tles table + key/value cache table)
   |
   +--> TLE.to_orbital_element()                   units change here: degrees -> radians, mean motion -> rad/s
   |       v
   |    OrbitalElement -> SGP4Propagator (SGP4 via sgp4init) -> StateVector (r km, v km/s, TEME)
   |       v
   |    CoordinateTransform: ECI -> ECEF -> geographic (lat, lon, alt)
   |
   +--> ConjunctionSearch.search_catalog            conjunction_detection.py
   |       Screen: SGP4 for all objects every 20 s (SatrecArray, 120-step batches),
   |               cKDTree pairs within 10 km + v_max x 10 s (gap-free for misses < 10 km)
   |       TCA:    parabola on d^2 at each grid minimum, then exact SGP4 + one range-rate step
   |                -> TCA, miss distance, relative velocity, both states
   |       Pc:     Foster 2D in the encounter plane, CovarianceModel (measured RIC, ESA floor) -> risk tier
   |               long encounters (< 0.1 km/s) flagged, one per pair
   |
   +--> OrbitalAnalytics                            Analytics.py (statistics, Plotly figures, export)
   v
api_server.py (FastAPI, bearer-token guarded) ----> frontend/ (React)
```

## 2. Stage by stage

| # | Stage | In | Out | Where | Failure behaviour |
|---|---|---|---|---|---|
| 1 | Fetch | group name (default `active`) | raw 3-line TLE text | `CelestrackClient.fetch_group_checked` | Outcome reported as ok / empty / rate_limited / not_found / http_error / network_error (`last_fetch` in `/health`). A failed fetch leaves the catalog unchanged. |
| 2 | Parse | text | `TLE` objects | `TLEParser` | A per-record Unicode check mark crashes a cp1252 console unless `PYTHONIOENCODING=utf-8`. |
| 3 | Store | `TLE` list | rows in `ssa_data.db` | `TLEDatabase` | Upsert by NORAD id. A refresh is a full upsert, not an append log. |
| 4 | Convert | `TLE` | `OrbitalElement` | `TLE.to_orbital_element()` | Unit boundary. `n` becomes rad/s and `i` becomes radians. |
| 5 | Propagate | element + time | state vector | `SGP4Propagator` (SGP4) | Raises `ValueError` when SGP4 refuses an element set (e.g. decayed). Such objects are parked out of the screen. |
| 6 | Screen | catalog + horizon | grid minima | `conjunction_detection._screen` | Gap-free by construction for misses under 10 km (r >= d + v*dt/2). Approaches in the first or last 20 s of the window are skipped. |
| 7 | Refine | grid minimum | TCA, miss distance, relative velocity | `_refine_exact` | Exact SGP4 states. Agrees with the dense reference to a median of 0.5 mm. |
| 8 | Assess | event | Pc, risk tier, uncertainty, long-encounter flag | `_build_events`, `collision_probability` | Pc is conditional on `CovarianceModel`; the UI and `/api/conjunctions/method` say so. |
| 9 | Serve | any of the above | JSON | `api_server.py` | Every route except `/`, `/health` and the auth routes needs a bearer token. |
| 10 | Show | JSON | views | `frontend/src/` | Distinguishes not loaded, empty result and failure. |

## 3. Refresh flow (the user updates the catalog)

1. The frontend sends `POST /api/update-tles` with the bearer token.
2. The API returns at once ("update started") and runs the fetch as a `BackgroundTask`.
3. There is no completion event. The frontend polls `/health` (stored object count, last refresh time) and shows progress.
4. If Celestrak refuses (403 after repeated `active` requests), the count never changes and the only trace is the server log. See [pain.md](pain.md).

## 4. Conjunction search flow

1. On load, the Conjunctions view fetches `GET /api/conjunctions/method` and shows the method and its limits.
2. The frontend calls `GET /api/conjunctions?time_horizon_days=&limit=` (horizon 1-7 days). The request is cancellable on the client, but the server still finishes the search.
3. `ConjunctionSearch.search_catalog(..., top=limit)` starts at now and records `last_window`. It returns the `limit` most probable events, and `last_stats` counts everything found (`total_events`, `tier_counts`, `long_encounters`).
4. The response is an object holding the events and those counts. The frontend shows "Top N of M" and the tier counts over all M, and flags past events and long encounters.
5. Pair detail is `GET /api/conjunction-pair/{id1}/{id2}`: the same engine over 7 days, returning the closest approach under 10 km. Export to CSV or JSON happens in the browser.

Measured 2026-10-15 on a laptop, full catalog (15,970 objects): a 1-day search took about 1.5-2 min and found about 426,000 approaches under 10 km. The original engine took about 20 s but reported about 0.1 % of them.

## 5. One front end

The React app talks only to the API and never reads the SQLite file. (The Streamlit dashboard, which imported the modules directly, was removed on 2026-10-03.)
