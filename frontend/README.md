# ORCA frontend

React + TypeScript + Vite + three.js. It replaces the Streamlit dashboard (`dashboard.py`, still in the repo) and talks to the same FastAPI backend.

Read [../rules.md](../rules.md) before adding UI: every piece of the interface is its own component, from atom to view.

## Run

```bash
# 1. API (from the repo root). PYTHONIOENCODING is required on Windows (see AGENTS.md).
PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000

# 2. Frontend
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173, /api and /health are proxied to :8000
```

Other scripts: `npm run build` (type-checks, then bundles), `npm test` (unit tests for `src/lib`), `npm run typecheck`.

To point a built bundle at a remote API, set `VITE_API_BASE` at build time and add the frontend's origin to `ORCA_CORS_ORIGINS` on the API.

## Views

| Key | View | What it does |
|---|---|---|
| 1 | Overview | Catalog KPIs, sortable table, object detail, regime breakdown |
| 2 | Globe | three.js Earth with every object, orbit paths, time scrub up to +7 days |
| 3 | Conjunctions | Run a screening search (cancellable), risk summary, pair detail, CSV/JSON export |
| 4 | Analytics | Server statistics plus histograms and a scatter derived in the browser |
| 5 | Data | Catalog freshness and a Celestrak refresh with honest progress |

`?` lists the keyboard shortcuts.

## Layout

```
src/
  api/          typed client, endpoints, response types (copied from real responses)
  lib/          pure logic + tests: units, risk, time, histogram, coordinates
  hooks/        all fetching, polling and effects
  globe/        EarthScene: the only code that touches three.js
  components/
    atoms/ molecules/ organisms/ views/    one folder per component
  styles/       design tokens (dark + light) and base styles
```

## What the UI is honest about

- TLE age is shown wherever a position or object is: old element sets propagate poorly.
- Positions come from `orbit_mech_engine`'s simplified Kepler + drag propagator, not full SGP4. The label is read from the API response.
- The conjunction search window starts at the first object's TLE epoch, not at the current time. With old TLEs the results can all be in the past, and the UI says so.
- Pc uses an assumed covariance. It ranks events; it is not an operational collision probability.
